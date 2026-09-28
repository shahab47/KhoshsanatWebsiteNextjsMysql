import db from '@/lib/db';
import {
  Prisma,
  MappingTrigger,
  VoucherType,
  VoucherStatus,
  PaymentMethod,
} from '@prisma/client';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { AccountingMappingEngine } from '@/lib/accounting/accounting-mapping';

export class ARPostingService {
  /**
   * دریافت شرکت پیش‌فرض و دوره مالی متناسب با تاریخ سند
   */
  private static async resolveCompanyAndPeriod(date: Date) {
    const company = await db.company.findFirst({
      where: { isDefault: true },
    });

    const companyId = company?.id || null;

    let periodId: string | null = null;
    let fiscalYearId: string | null = null;

    if (companyId) {
      const period = await db.fiscalPeriod.findFirst({
        where: {
          fiscalYear: { companyId },
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });

      if (period) {
        periodId = period.id;
        fiscalYearId = period.fiscalYearId;
      } else {
        // در صورت عدم تطابق دقیق تاریخی، انتساب به بازترین دوره سال مالی پیش‌فرض
        const anyPeriod = await db.fiscalPeriod.findFirst({
          where: { fiscalYear: { companyId }, status: 'OPEN' },
          orderBy: { periodNumber: 'asc' },
        });
        if (anyPeriod) {
          periodId = anyPeriod.id;
          fiscalYearId = anyPeriod.fiscalYearId;
        }
      }
    }

    return { companyId, fiscalYearId, periodId };
  }

  /**
   * صدور خودکار سند حسابداری دوبل فاکتور فروش (Sales Invoice Posting)
   * Dr: حساب‌های دریافتنی تجاری - مشتریان (۱۱۰۳۰۱) -> مبلغ نهایی
   * Cr: درآمد حاصل از فروش (۴۱۰۱۰۱) -> مبلغ خالص قبل از مالیات
   * Cr: مالیات بر ارزش افزوده فروش پرداختنی (۲۱۰۶۰۱) -> مبلغ مالیات (در صورت وجود)
   */
  static async postInvoiceVoucher(
    invoiceId: number,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new Error(`فاکتور فروش شماره ${invoiceId} یافت نشد.`);
    }

    // اگر قبلاً برای این فاکتور سند صادر شده است، همان را بازگردان
    if (invoice.journalVoucherId) {
      const existing = await client.journalVoucher.findUnique({
        where: { id: invoice.journalVoucherId },
      });
      if (existing) return existing;
    }

    const { companyId, fiscalYearId, periodId } = await this.resolveCompanyAndPeriod(
      invoice.issueDate || new Date()
    );

    // استخراج نگاشت حساب‌های فروش از موتور داینامیک نگاشت
    const mapping = await AccountingMappingEngine.getAccountsForTrigger(
      MappingTrigger.SALES_INVOICE,
      companyId
    );

    const finalAmount = new Prisma.Decimal(invoice.finalAmount);
    const taxAmount = new Prisma.Decimal(invoice.tax || 0);
    const revenueAmount = finalAmount.sub(taxAmount);

    if (finalAmount.lte(0)) {
      throw new Error('امکان صدور سند حسابداری برای فاکتور با مبلغ صفر یا منفی وجود ندارد.');
    }

    const entries: CreateJournalEntryInput[] = [];

    // ۱. آرتیکل بدهکار: حساب‌های دریافتنی مشتری
    entries.push({
      accountId: mapping.debitAccountId, // 110301
      detail1Type: 'CUSTOMER',
      detail1Id: invoice.customerId.toString(),
      debit: finalAmount,
      credit: new Prisma.Decimal(0),
      description: `فاکتور فروش شماره ${invoice.invoiceNo} - ${invoice.customer.name}`,
    });

    // ۲. آرتیکل بستانکار: درآمد فروش
    entries.push({
      accountId: mapping.creditAccountId, // 410101
      debit: new Prisma.Decimal(0),
      credit: revenueAmount,
      description: `شناسایی درآمد حاصل از فروش فاکتور ${invoice.invoiceNo}`,
    });

    // ۳. آرتیکل بستانکار: مالیات بر ارزش افزوده (در صورت وجود)
    if (taxAmount.gt(0)) {
      const vatAccount = await client.account.findUnique({
        where: { code: '210601' },
      });

      if (!vatAccount) {
        throw new Error('حساب معین ۲۱۰۶۰۱ (مالیات بر ارزش افزوده فروش پرداختنی) در کدینگ یافت نشد.');
      }

      entries.push({
        accountId: vatAccount.id,
        debit: new Prisma.Decimal(0),
        credit: taxAmount,
        description: `مالیات و عوارض ارزش افزوده فاکتور فروش ${invoice.invoiceNo}`,
      });
    }

    const voucher = await VoucherService.createVoucher(
      {
        voucherDate: invoice.issueDate || new Date(),
        description: `سند حسابداری شناسایی فاکتور فروش شماره ${invoice.invoiceNo} - مشتری: ${invoice.customer.name}`,
        type: VoucherType.SALES,
        referenceModule: 'SALES_INVOICE',
        referenceId: invoice.id.toString(),
        idempotencyKey: `INV-POST-${invoice.id}`,
        companyId,
        fiscalYearId,
        periodId,
        entries,
      },
      client
    );

    // قطعی‌سازی و قفل سند حسابداری
    const finalized = await VoucherService.finalizeVoucher(voucher.id);

    // اتصال شناسه سند حسابداری به فاکتور
    await client.invoice.update({
      where: { id: invoice.id },
      data: { journalVoucherId: finalized.id },
    });

    return finalized;
  }

  /**
   * صدور خودکار سند حسابداری دوبل دریافت وجه و تسویه مطالبات (Payment / Receipt Posting)
   * Dr: نقد و بانک‌ها (۱۱۰۱۰۱) یا صندوق (۱۱۰۲۰۱) یا اسناد دریافتنی چک (۱۱۰۴۰۱)
   * Cr: حساب‌های دریافتنی تجاری - مشتریان (۱۱۰۳۰۱)
   */
  static async postPaymentVoucher(
    paymentId: number,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const payment = await client.payment.findUnique({
      where: { id: paymentId },
      include: { customer: true, invoice: true },
    });

    if (!payment) {
      throw new Error(`رسید پرداخت شماره ${paymentId} یافت نشد.`);
    }

    if (payment.journalVoucherId) {
      const existing = await client.journalVoucher.findUnique({
        where: { id: payment.journalVoucherId },
      });
      if (existing) return existing;
    }

    const { companyId, fiscalYearId, periodId } = await this.resolveCompanyAndPeriod(
      payment.paymentDate || new Date()
    );

    // تعیین کد حساب بدهکار بر اساس روش پرداخت
    let debitAccountCode = '110101'; // نقد و بانک‌ها (پیش‌فرض کارت‌خوان و حواله)
    if (payment.paymentMethod === PaymentMethod.CHECK) {
      debitAccountCode = '110401'; // اسناد دریافتنی تجاری - چک‌های نزد صندوق
    } else if (payment.paymentMethod === PaymentMethod.CASH) {
      debitAccountCode = '110201'; // صندوق و تنخواه‌گردان کارخانه
    }

    const debitAccount = await client.account.findUnique({
      where: { code: debitAccountCode },
    });

    if (!debitAccount) {
      throw new Error(`حساب معین بدهکار با کد ${debitAccountCode} یافت نشد.`);
    }

    // حساب معین دریافتنی مشتریان (۱۱۰۳۰۱)
    const arAccount = await client.account.findUnique({
      where: { code: '110301' },
    });

    if (!arAccount) {
      throw new Error('حساب معین ۱۱۰۳۰۱ (حساب‌های دریافتنی مشتریان) یافت نشد.');
    }

    const amount = new Prisma.Decimal(payment.amount);
    if (amount.lte(0)) {
      throw new Error('مبلغ پرداخت باید بزرگتر از صفر باشد.');
    }

    const receiptLabel = payment.receiptNo ? `شماره فیش ${payment.receiptNo}` : `شناسه پیگیری ${payment.id}`;
    const invoiceLabel = payment.invoice ? ` - بابت فاکتور ${payment.invoice.invoiceNo}` : '';

    const entries: CreateJournalEntryInput[] = [
      // ۱. آرتیکل بدهکار: حساب نقد/بانک/صندوق/چک
      {
        accountId: debitAccount.id,
        debit: amount,
        credit: new Prisma.Decimal(0),
        description: `وصول وجه ${payment.paymentMethod} مشتری ${payment.customer.name} (${receiptLabel}${invoiceLabel})`,
      },
      // ۲. آرتیکل بستانکار: حساب معین مشتری
      {
        accountId: arAccount.id,
        detail1Type: 'CUSTOMER',
        detail1Id: payment.customerId.toString(),
        debit: new Prisma.Decimal(0),
        credit: amount,
        description: `بستانکاری مشتری ${payment.customer.name} بابت ${receiptLabel}`,
      },
    ];

    const voucher = await VoucherService.createVoucher(
      {
        voucherDate: payment.paymentDate || new Date(),
        description: `سند حسابداری دریافت و تسویه مطالبات - ${payment.customer.name} (${receiptLabel})`,
        type: VoucherType.RECEIPT,
        referenceModule: 'CUSTOMER_RECEIPT',
        referenceId: payment.id.toString(),
        idempotencyKey: `PAY-POST-${payment.id}`,
        companyId,
        fiscalYearId,
        periodId,
        entries,
      },
      client
    );

    const finalized = await VoucherService.finalizeVoucher(voucher.id);

    await client.payment.update({
      where: { id: payment.id },
      data: { journalVoucherId: finalized.id },
    });

    return finalized;
  }

  /**
   * صدور سند برگشت (Reversal) فاکتور فروش در صورت ابطال
   */
  static async reverseInvoiceVoucher(invoiceId: number, reason: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) throw new Error('فاکتور مورد نظر یافت نشد.');

    if (invoice.journalVoucherId) {
      const reversal = await VoucherService.reverseVoucher({
        voucherId: invoice.journalVoucherId,
        reason: `ابطال فاکتور فروش شماره ${invoice.invoiceNo} - ${reason}`,
      });

      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: 'CANCELLED' },
      });

      return reversal;
    }
  }

  /**
   * صدور سند برگشت (Reversal) فیش پرداخت در صورت عودت یا اصلاح
   */
  static async reversePaymentVoucher(paymentId: number, reason: string) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new Error('رسید پرداخت مورد نظر یافت نشد.');

    if (payment.journalVoucherId) {
      return await VoucherService.reverseVoucher({
        voucherId: payment.journalVoucherId,
        reason: `برگشت فیش پرداخت شناسه ${payment.id} - ${reason}`,
      });
    }
  }
}
