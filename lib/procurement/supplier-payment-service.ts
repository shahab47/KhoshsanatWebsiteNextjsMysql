import db from '@/lib/db';
import { Prisma, SupplierInvoiceStatus, VoucherType, ChequeStatus } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { SupplierService } from './supplier-service';

export interface CreateSupplierPaymentInput {
  supplierId: string;
  supplierInvoiceId?: string | null;
  amount: number | Prisma.Decimal;
  paymentDate?: Date | string | null;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE_ENDORSED' | 'CHEQUE_ISSUED';
  bankAccountId?: string | null;
  chequeId?: string | null;
  receiptNo?: string | null;
  attachmentUrl?: string | null;
  description?: string | null;
  autoPostVoucher?: boolean;
}

export class SupplierPaymentService {
  /**
   * ثبت پرداخت وجه به تامین‌کننده (حواله بانکی، نقد، ظهرنویسی چک صیادی مشتری، یا چک کارخانه)
   * Dr: حساب‌های پرداختنی تجاری - تامین‌کنندگان (۲۱۰۱۰۱)
   * Cr: بانک (۱۱۰۱۰۱) یا صندوق (۱۱۰۲۰۱) یا اسناد دریافتنی نزد صندوق (۱۱۰۴۰۱) یا اسناد پرداختنی صادره (۲۱۰۴۰۱)
   */
  static async createSupplierPayment(input: CreateSupplierPaymentInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      if (!input.supplierId) {
        throw new Error('انتخاب تامین‌کننده الزامی است.');
      }

      const supplier = await tx.supplier.findUnique({
        where: { id: input.supplierId },
      });
      if (!supplier) throw new Error('تامین‌کننده یافت نشد.');

      const amount = new Prisma.Decimal(input.amount);
      if (amount.lte(0)) {
        throw new Error('مبلغ پرداختی باید بزرگتر از صفر باشد.');
      }

      // اعتبارسنجی روش پرداخت و اطلاعات مرتبط
      let bankAccount = null;
      let cheque = null;

      if (input.paymentMethod === 'BANK_TRANSFER') {
        if (!input.bankAccountId) {
          throw new Error('برای پرداخت از طریق حواله بانکی، انتخاب حساب بانکی مبدا الزامی است.');
        }
        bankAccount = await tx.bankAccount.findUnique({ where: { id: input.bankAccountId } });
        if (!bankAccount) throw new Error('حساب بانکی مبدا یافت نشد.');
      } else if (input.paymentMethod === 'CHEQUE_ENDORSED') {
        if (!input.chequeId) {
          throw new Error('برای خرج/ظهرنویسی چک به تامین‌کننده، انتخاب چک صیادی الزامی است.');
        }
        cheque = await tx.cheque.findUnique({ where: { id: input.chequeId } });
        if (!cheque) throw new Error('چک صیادی انتخاب‌شده یافت نشد.');
        if (cheque.status !== ChequeStatus.RECEIVED && cheque.status !== ChequeStatus.IN_PORTFOLIO) {
          throw new Error(`چک صیادی در وضعیت "${cheque.status}" قابل انتقال به تامین‌کننده نیست.`);
        }
      }

      // تولید شماره یکتای سند پرداخت SPAY-XXXXXX
      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;
      const { formattedNumber } = await SequenceService.nextNumber('SUPPLIER_PAYMENT', companyId, tx);

      // ثبت پرداخت تامین‌کننده
      const payment = await tx.supplierPayment.create({
        data: {
          paymentNo: formattedNumber,
          supplierId: input.supplierId,
          supplierInvoiceId: input.supplierInvoiceId || null,
          amount,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          paymentMethod: input.paymentMethod,
          bankAccountId: input.bankAccountId || null,
          chequeId: input.chequeId || null,
          receiptNo: input.receiptNo?.trim() || null,
          attachmentUrl: input.attachmentUrl?.trim() || null,
          description: input.description?.trim() || null,
        },
      });

      // صدور خودکار سند دوبل مالی
      if (input.autoPostVoucher !== false) {
        const payableAccount = await tx.account.findUnique({ where: { code: '210101' } });
        if (!payableAccount) throw new Error('حساب معین ۲۱۰۱۰۱ یافت نشد.');

        let creditAccountCode = '110101'; // پیش‌فرض بانک
        let creditDetailType: string | null = null;
        let creditDetailId: string | null = null;

        if (input.paymentMethod === 'BANK_TRANSFER') {
          creditAccountCode = '110101';
          creditDetailType = 'BANK';
          creditDetailId = bankAccount?.id || null;
        } else if (input.paymentMethod === 'CASH') {
          creditAccountCode = '110201'; // صندوق
        } else if (input.paymentMethod === 'CHEQUE_ENDORSED') {
          creditAccountCode = '110401'; // اسناد دریافتنی نزد صندوق
          creditDetailType = 'CUSTOMER';
          creditDetailId = cheque?.customerId ? cheque.customerId.toString() : null;
        } else if (input.paymentMethod === 'CHEQUE_ISSUED') {
          creditAccountCode = '210401'; // اسناد پرداختنی تجاری - چک‌های صادره
        }

        const creditAccount = await tx.account.findUnique({ where: { code: creditAccountCode } });
        if (!creditAccount) {
          throw new Error(`حساب معین بستانکار (${creditAccountCode}) یافت نشد.`);
        }

        const entries: CreateJournalEntryInput[] = [
          // ۱. بدهکار: حساب‌های پرداختنی تامین‌کننده (کاهش بدهی)
          {
            accountId: payableAccount.id,
            detail1Type: 'SUPPLIER',
            detail1Id: supplier.id,
            debit: amount,
            credit: new Prisma.Decimal(0),
            description: `پرداخت به تامین‌کننده ${supplier.name} بابت ${input.receiptNo || 'تسویه حساب'}`,
          },
          // ۲. بستانکار: بانک یا صندوق یا اسناد
          {
            accountId: creditAccount.id,
            detail1Type: creditDetailType,
            detail1Id: creditDetailId,
            debit: new Prisma.Decimal(0),
            credit: amount,
            description: `خروج وجه به روش ${input.paymentMethod} به نفع تامین‌کننده ${supplier.name}`,
          },
        ];

        const voucher = await VoucherService.createVoucher(
          {
            voucherDate: payment.paymentDate,
            description: `سند پرداخت شماره ${payment.paymentNo} به تامین‌کننده ${supplier.name} به مبلغ ${amount.toNumber().toLocaleString('fa-IR')} تومان`,
            type: VoucherType.PAYMENT,
            referenceModule: 'SUPPLIER_PAYMENT',
            referenceId: payment.id,
            idempotencyKey: `SPAY-${payment.id}`,
            companyId,
            entries,
          },
          tx
        );

        const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

        await tx.supplierPayment.update({
          where: { id: payment.id },
          data: { journalVoucherId: finalized.id },
        });

        payment.journalVoucherId = finalized.id;
      }

      // در صورت پرداخت با ظهرنویسی چک، وضعیت چک به خرج‌شده (TRANSFERRED) تغییر می‌یابد
      if (input.paymentMethod === 'CHEQUE_ENDORSED' && input.chequeId) {
        await tx.cheque.update({
          where: { id: input.chequeId },
          data: {
            status: ChequeStatus.TRANSFERRED,
            description: `${cheque?.description ? cheque.description + ' | ' : ''}خرج شده به تامین‌کننده: ${supplier.name} بابت پرداخت ${payment.paymentNo}`,
          },
        });
      }

      // در صورت پیوند پرداخت با فاکتور خرید، مانده پرداختی و وضعیت فاکتور به‌روزرسانی می‌شود
      if (input.supplierInvoiceId) {
        const invoice = await tx.supplierInvoice.findUnique({
          where: { id: input.supplierInvoiceId },
        });

        if (invoice) {
          const newPaidAmount = invoice.paidAmount.add(amount);
          const isFullyPaid = newPaidAmount.gte(invoice.finalAmount);

          await tx.supplierInvoice.update({
            where: { id: input.supplierInvoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: isFullyPaid ? SupplierInvoiceStatus.PAID : SupplierInvoiceStatus.PARTIALLY_PAID,
            },
          });
        }
      }

      // به‌روزرسانی مانده بستانکاری دفتری تامین‌کننده
      await SupplierService.recalculatePayable(supplier.id, tx);

      return await tx.supplierPayment.findUnique({
        where: { id: payment.id },
        include: {
          supplier: true,
          supplierInvoice: true,
          bankAccount: true,
          cheque: true,
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
   * دریافت لیست پرداخت‌های انجام‌شده به تامین‌کنندگان
   */
  static async getSupplierPayments(options?: {
    supplierId?: string;
    supplierInvoiceId?: string;
    paymentMethod?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.SupplierPaymentWhereInput = {};

    if (options?.supplierId) where.supplierId = options.supplierId;
    if (options?.supplierInvoiceId) where.supplierInvoiceId = options.supplierInvoiceId;
    if (options?.paymentMethod) where.paymentMethod = options.paymentMethod;

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { paymentNo: { contains: term } },
        { receiptNo: { contains: term } },
        { supplier: { name: { contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.supplierPayment.findMany({
        where,
        include: {
          supplier: true,
          supplierInvoice: true,
          bankAccount: true,
          cheque: true,
        },
        orderBy: { paymentDate: 'desc' },
        take: options?.limit || 50,
        skip: options?.skip || 0,
      }),
      db.supplierPayment.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت جزئیات یک سند پرداخت
   */
  static async getSupplierPaymentById(id: string) {
    const payment = await db.supplierPayment.findUnique({
      where: { id },
      include: {
        supplier: true,
        supplierInvoice: true,
        bankAccount: true,
        cheque: true,
      },
    });

    if (!payment) throw new Error('سند پرداخت به تامین‌کننده یافت نشد.');
    return payment;
  }
}
