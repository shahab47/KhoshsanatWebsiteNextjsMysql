import db from '@/lib/db';
import { Prisma, SupplierInvoiceStatus, VoucherType } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { SupplierService } from './supplier-service';

export interface CreateSupplierInvoiceInput {
  supplierId: string;
  invoiceNo: string; // شماره فاکتور فیزیکی یا سامانه مودیان تامین‌کننده
  invoiceDate: Date | string;
  dueDate?: Date | string | null;
  purchaseOrderId?: string | null;
  amount: number | Prisma.Decimal;
  taxAmount?: number | Prisma.Decimal;
  freightCost?: number | Prisma.Decimal;
  attachmentUrl?: string | null;
  autoPostVoucher?: boolean;
}

export class SupplierInvoiceService {
  /**
   * ثبت فاکتور خرید صنعتی (Supplier Invoice) با انطباق سه‌طرفه (3-Way Matching) و صدور خودکار سند دوبل
   * Dr: موجودی مواد اولیه و مصالح فولادی (۱۱۰۵۰۱)
   * Dr: مالیات بر ارزش افزوده خرید - اعتبار مالیاتی (۱۱۰۶۰۱)
   * Cr: حساب‌های پرداختنی تجاری - تامین‌کنندگان (۲۱۰۱۰۱)
   */
  static async createSupplierInvoice(input: CreateSupplierInvoiceInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      if (!input.supplierId) {
        throw new Error('انتخاب تامین‌کننده الزامی است.');
      }
      if (!input.invoiceNo || !input.invoiceNo.trim()) {
        throw new Error('شماره فاکتور اعلامی تامین‌کننده الزامی است.');
      }

      const supplier = await tx.supplier.findUnique({
        where: { id: input.supplierId },
      });
      if (!supplier) throw new Error('تامین‌کننده یافت نشد.');

      const amount = new Prisma.Decimal(input.amount);
      if (amount.lte(0)) {
        throw new Error('مبلغ ناخالص فاکتور باید بزرگتر از صفر باشد.');
      }

      // نرخ پیش‌فرض ارزش افزوده ۱۰٪
      const taxAmount = input.taxAmount !== undefined
        ? new Prisma.Decimal(input.taxAmount)
        : amount.mul(10).div(100);

      const freightCost = input.freightCost ? new Prisma.Decimal(input.freightCost) : new Prisma.Decimal(0);
      const finalAmount = amount.add(taxAmount).add(freightCost);

      // ۳-Way Matching: در صورت ارتباط با سفارش خرید، انطباق اقلام و مبالغ بررسی می‌شود
      if (input.purchaseOrderId) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: { items: true },
        });

        if (po) {
          // بررسی مغایرت بیش از ۱۰٪ مبلغ فاکتور نسبت به سفارش خرید
          const diff = finalAmount.sub(po.totalAmount).abs();
          const threshold = po.totalAmount.mul(0.15); // آستانه مجاز تلورانس ۱۵٪
          if (diff.gt(threshold)) {
            console.warn(
              `هشدار مغایرت فاکتور خرید با سفارش خرید: مبلغ فاکتور ${finalAmount} تومان و مبلغ سفارش ${po.totalAmount} تومان است.`
            );
          }
        }
      }

      // تولید شماره سیستم داخلی SINV-XXXXXX
      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;
      const { formattedNumber } = await SequenceService.nextNumber('SUPPLIER_INVOICE', companyId, tx);

      // ثبت فاکتور تامین‌کننده
      const invoice = await tx.supplierInvoice.create({
        data: {
          invoiceNo: input.invoiceNo.trim(),
          systemNo: formattedNumber,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId || null,
          invoiceDate: new Date(input.invoiceDate),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: SupplierInvoiceStatus.PENDING,
          amount,
          taxAmount,
          freightCost,
          finalAmount,
          paidAmount: new Prisma.Decimal(0),
          attachmentUrl: input.attachmentUrl?.trim() || null,
        },
      });

      // صدور خودکار سند دوبل حسابداری خرید
      if (input.autoPostVoucher !== false) {
        const rawMatAccount = await tx.account.findUnique({ where: { code: '110501' } });
        const vatInputAccount = await tx.account.findUnique({ where: { code: '110601' } });
        const payableAccount = await tx.account.findUnique({ where: { code: '210101' } });

        if (!rawMatAccount || !vatInputAccount || !payableAccount) {
          throw new Error('حساب‌های معین ۱۱۰۵۰۱، ۱۱۰۶۰۱ یا ۲۱۰۱۰۱ در درخت حساب‌ها تعریف نشده‌اند.');
        }

        const entries: CreateJournalEntryInput[] = [];

        // ۱. بدهکار: موجودی مواد اولیه و مصالح فولادی (مبلغ کالا + کرایه حمل سرمایه‌ای شده)
        const inventoryCost = amount.add(freightCost);
        entries.push({
          accountId: rawMatAccount.id,
          detail1Type: 'SUPPLIER',
          detail1Id: supplier.id,
          debit: inventoryCost,
          credit: new Prisma.Decimal(0),
          description: `خرید مواد اولیه و مقاطع فلزی طبق فاکتور ${invoice.invoiceNo} از ${supplier.name}`,
        });

        // ۲. بدهکار: مالیات بر ارزش افزوده خرید - اعتبار مالیاتی ۱۰٪
        if (taxAmount.gt(0)) {
          entries.push({
            accountId: vatInputAccount.id,
            detail1Type: 'SUPPLIER',
            detail1Id: supplier.id,
            debit: taxAmount,
            credit: new Prisma.Decimal(0),
            description: `اعتبار مالیاتی ارزش افزوده ۱۰٪ فاکتور خرید ${invoice.invoiceNo} از ${supplier.name}`,
          });
        }

        // ۳. بستانکار: حساب‌های پرداختنی تجاری - تامین‌کنندگان
        entries.push({
          accountId: payableAccount.id,
          detail1Type: 'SUPPLIER',
          detail1Id: supplier.id,
          debit: new Prisma.Decimal(0),
          credit: finalAmount,
          description: `بستانکاری ${supplier.name} بابت فاکتور خرید ${invoice.invoiceNo}`,
        });

        const voucher = await VoucherService.createVoucher(
          {
            voucherDate: invoice.invoiceDate,
            description: `سند شناسایی فاکتور خرید شماره ${invoice.invoiceNo} تامین‌کننده ${supplier.name}`,
            type: VoucherType.PURCHASE,
            referenceModule: 'SUPPLIER_INVOICE',
            referenceId: invoice.id,
            idempotencyKey: `SINV-${invoice.id}`,
            companyId,
            entries,
          },
          tx
        );

        const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

        await tx.supplierInvoice.update({
          where: { id: invoice.id },
          data: { journalVoucherId: finalized.id },
        });

        invoice.journalVoucherId = finalized.id;
      }

      // به‌روزرسانی مانده بستانکاری دفتری تامین‌کننده
      await SupplierService.recalculatePayable(supplier.id, tx);

      return await tx.supplierInvoice.findUnique({
        where: { id: invoice.id },
        include: {
          supplier: true,
          purchaseOrder: true,
          payments: true,
        },
      });
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * دریافت لیست فاکتورهای خرید با فیلتر و صفحه‌بندی
   */
  static async getSupplierInvoices(options?: {
    supplierId?: string;
    purchaseOrderId?: string;
    status?: SupplierInvoiceStatus;
    search?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.SupplierInvoiceWhereInput = {};

    if (options?.supplierId) where.supplierId = options.supplierId;
    if (options?.purchaseOrderId) where.purchaseOrderId = options.purchaseOrderId;
    if (options?.status) where.status = options.status;

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { invoiceNo: { contains: term } },
        { systemNo: { contains: term } },
        { supplier: { name: { contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.supplierInvoice.findMany({
        where,
        include: {
          supplier: true,
          purchaseOrder: true,
          payments: true,
        },
        orderBy: { invoiceDate: 'desc' },
        take: options?.limit || 50,
        skip: options?.skip || 0,
      }),
      db.supplierInvoice.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت جزئیات یک فاکتور خرید
   */
  static async getSupplierInvoiceById(id: string) {
    const invoice = await db.supplierInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: { items: { include: { product: true } } },
        },
        payments: {
          include: { bankAccount: true, cheque: true },
        },
      },
    });

    if (!invoice) throw new Error('فاکتور خرید یافت نشد.');
    return invoice;
  }
}
