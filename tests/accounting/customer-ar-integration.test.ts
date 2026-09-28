import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, VoucherType, VoucherStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { ARPostingService } from '@/lib/ar/ar-posting-service';
import { CreditService } from '@/lib/ar/credit-service';
import { SettlementService } from '@/lib/ar/settlement-service';
import { VoucherService } from '@/lib/accounting/voucher-service';

describe('Phase 2: Customer 360 & Accounts Receivable Integration Tests', () => {
  let testCustomerId: number;
  let testInvoice1Id: number;
  let testInvoice2Id: number;
  let testPaymentId: number;

  beforeAll(async () => {
    // ایجاد مشتری آزمایشی یکپارچه برای آزمون‌های AR
    const testCustomer = await db.customer.create({
      data: {
        name: 'شرکت فولاد صنعت آریانا (تست یکپارچگی)',
        email: `ariana_test_${Date.now()}@example.com`,
        phone: '02188889999',
        company: 'فولاد صنعت آریانا',
        nationalId: `1400${Date.now().toString().slice(-7)}`,
        economicCode: '411122233344',
        postalCode: '1999988888',
        creditLimit: new Prisma.Decimal(50000000), // ۵۰ میلیون تومان سقف اعتبار
        riskRating: 'B',
        isCreditBlocked: false,
      },
    });
    testCustomerId = testCustomer.id;
  });

  afterAll(async () => {
    // پاکسازی داده‌های تست به ترتیب معکوس وابستگی
    if (testCustomerId) {
      // حذف تخصیص‌ها
      await db.paymentAllocation.deleteMany({
        where: { payment: { customerId: testCustomerId } },
      });

      // حذف اقلام فاکتور
      await db.invoiceItem.deleteMany({
        where: { invoice: { customerId: testCustomerId } },
      });

      // استخراج اسناد دوبل ثبت شده برای این مشتری
      const vouchers = await db.journalVoucher.findMany({
        where: {
          entries: {
            some: { detail1Id: testCustomerId.toString(), detail1Type: 'CUSTOMER' },
          },
        },
      });

      // حذف فاکتورها و پرداخت‌ها
      await db.invoice.deleteMany({ where: { customerId: testCustomerId } });
      await db.payment.deleteMany({ where: { customerId: testCustomerId } });

      // حذف اسناد حسابداری ایجاد شده در تست
      for (const v of vouchers) {
        await db.journalEntry.deleteMany({ where: { voucherId: v.id } });
        await db.journalVoucher.delete({ where: { id: v.id } });
      }

      // حذف مشتری تست
      await db.customer.delete({ where: { id: testCustomerId } });
    }
  });

  describe('۱. آزمون‌های صدور خودکار سند دوبل فاکتور فروش (Sales Invoice Posting)', () => {
    it('باید برای فاکتور جدید سند حسابداری دوبل متوازن صادر کرده و مانده معین مشتری را بدهکار کند', async () => {
      // ایجاد فاکتور تست: مبلغ ناخالص ۲۰,۰۰۰,۰۰۰ تومان، تخفیف ۲,۰۰۰,۰۰۰، مالیات ۱۰٪ (۱,۸۰۰,۰۰۰) -> خالص ۱۹,۸۰۰,۰۰۰
      const amount = 20000000;
      const discount = 2000000;
      const tax = 1800000;
      const finalAmount = amount - discount + tax; // 19,800,000

      const invoice = await db.invoice.create({
        data: {
          invoiceNo: `INV-TEST-${Date.now().toString().slice(-6)}`,
          customerId: testCustomerId,
          amount,
          discount,
          tax,
          finalAmount,
          description: 'فاکتور فروش مقاطع فولادی آزمایشی',
          items: {
            create: [
              {
                title: 'تیرآهن ۱۸ اصفهان',
                quantity: 10,
                unitPrice: 2000000,
                discount: 200000,
                taxRate: new Prisma.Decimal(0.10),
                taxAmount: new Prisma.Decimal(180000),
                total: 19800000,
              },
            ],
          },
        },
      });
      testInvoice1Id = invoice.id;

      // صدور سند دوبل از طریق سرویس
      const voucher = await ARPostingService.postInvoiceVoucher(invoice.id);

      expect(voucher).toBeDefined();
      expect(voucher.status).toBe(VoucherStatus.FINALIZED);
      expect(voucher.type).toBe(VoucherType.SALES);
      expect(voucher.referenceModule).toBe('SALES_INVOICE');
      expect(voucher.referenceId).toBe(invoice.id.toString());

      // بررسی اصل توازن دوبل: جمع بدهکار = جمع بستانکار = ۱۹,۸۰۰,۰۰۰
      expect(voucher.totalDebit.toNumber()).toBe(finalAmount);
      expect(voucher.totalCredit.toNumber()).toBe(finalAmount);

      // استخراج آرتیکل‌ها
      const entries = await db.journalEntry.findMany({
        where: { voucherId: voucher.id },
        include: { account: true },
      });

      // آرتیکل بدهکار: حساب‌های دریافتنی مشتریان (۱۱۰۳۰۱) با شناسه تفصیلی مشتری
      const arEntry = entries.find((e) => e.account.code === '110301');
      expect(arEntry).toBeDefined();
      expect(arEntry?.detail1Id).toBe(testCustomerId.toString());
      expect(arEntry?.detail1Type).toBe('CUSTOMER');
      expect(arEntry?.debit.toNumber()).toBe(finalAmount);
      expect(arEntry?.credit.toNumber()).toBe(0);

      // آرتیکل بستانکار: فروش (۴۱۰۱۰۱) با مبلغ ۱۸,۰۰۰,۰۰۰
      const revenueEntry = entries.find((e) => e.account.code === '410101');
      expect(revenueEntry).toBeDefined();
      expect(revenueEntry?.credit.toNumber()).toBe(amount - discount);

      // آرتیکل بستانکار: مالیات ارزش افزوده (۲۱۰۶۰۱) با مبلغ ۱,۸۰۰,۰۰۰
      const vatEntry = entries.find((e) => e.account.code === '210601');
      expect(vatEntry).toBeDefined();
      expect(vatEntry?.credit.toNumber()).toBe(tax);

      // بررسی اتصال کلید سند به فاکتور
      const updatedInv = await db.invoice.findUnique({ where: { id: invoice.id } });
      expect(updatedInv?.journalVoucherId).toBe(voucher.id);
    });

    it('فراخوانی مجدد صدور سند برای فاکتوری که سند دارد باید همان سند را بدون تکرار بازگرداند (Idempotency)', async () => {
      const voucherAgain = await ARPostingService.postInvoiceVoucher(testInvoice1Id);
      const invoice = await db.invoice.findUnique({ where: { id: testInvoice1Id } });
      expect(voucherAgain.id).toBe(invoice?.journalVoucherId);
    });
  });

  describe('۲. آزمون‌های صدور خودکار سند دوبل دریافت وجه (Payment / Receipt Posting)', () => {
    it('باید برای دریافت وجه (چک) سند حسابداری صادر کرده و اسناد دریافتنی را بدهکار و معین مشتری را بستانکار کند', async () => {
      const paymentAmount = 10000000; // ۱۰ میلیون تومان چک

      const payment = await db.payment.create({
        data: {
          customerId: testCustomerId,
          amount: paymentAmount,
          paymentMethod: PaymentMethod.CHECK,
          receiptNo: 'CHK-998877',
          description: 'چک صیادی بابت تسویه فاکتور اول',
          invoiceId: testInvoice1Id,
        },
      });
      testPaymentId = payment.id;

      const voucher = await ARPostingService.postPaymentVoucher(payment.id);

      expect(voucher).toBeDefined();
      expect(voucher.status).toBe(VoucherStatus.FINALIZED);
      expect(voucher.type).toBe(VoucherType.RECEIPT);
      expect(voucher.totalDebit.toNumber()).toBe(paymentAmount);
      expect(voucher.totalCredit.toNumber()).toBe(paymentAmount);

      const entries = await db.journalEntry.findMany({
        where: { voucherId: voucher.id },
        include: { account: true },
      });

      // بدهکار: اسناد دریافتنی تجاری - چک‌های نزد صندوق (۱۱۰۴۰۱)
      const chequeEntry = entries.find((e) => e.account.code === '110401');
      expect(chequeEntry).toBeDefined();
      expect(chequeEntry?.debit.toNumber()).toBe(paymentAmount);

      // بستانکار: حساب‌های دریافتنی مشتری (۱۱۰۳۰۱)
      const arEntry = entries.find((e) => e.account.code === '110301');
      expect(arEntry).toBeDefined();
      expect(arEntry?.detail1Id).toBe(testCustomerId.toString());
      expect(arEntry?.credit.toNumber()).toBe(paymentAmount);
    });
  });

  describe('۳. آزمون تطابق دفتر معین با تراز حساب‌های دریافتنی (Subsidiary Ledger Alignment)', () => {
    it('مانده دفتر معین مشتری باید دقیقاً برابر با فاکتورهای صادره منهای مبالغ واریزی باشد', async () => {
      const arAccount = await db.account.findUnique({ where: { code: '110301' } });
      expect(arAccount).toBeDefined();

      const ledger = await VoucherService.getSubsidiaryLedger({
        accountId: arAccount!.id,
        detail1Id: testCustomerId.toString(),
      });

      // فاکتور: ۱۹,۸۰۰,۰۰۰ بدهکار
      // پرداخت: ۱۰,۰۰۰,۰۰۰ بستانکار
      // مانده نهایی بدهکاری: ۹,۸۰۰,۰۰۰
      expect(ledger.entries.length).toBe(2);
      expect(ledger.finalBalance.toNumber()).toBe(9800000);
    });
  });

  describe('۴. آزمون‌های سقف اعتبار و مدیریت ریسک (Credit Limit & Risk Engine)', () => {
    it('باید وضعیت اعتبار، درصد استفاده و اعتبار آزاد مشتری را به درستی محاسبه کند', async () => {
      const status = await CreditService.getCustomerCreditStatus(testCustomerId);

      expect(status.creditLimit.toNumber()).toBe(50000000);
      expect(status.arLedgerBalance.toNumber()).toBe(9800000);
      expect(status.isOverLimit).toBe(false);
      // اعتبار آزاد = ۵۰،۰۰۰،۰۰۰ - ۹،۸۰۰،۰۰۰ بدهی - ۱۰،۰۰۰،۰۰۰ چک‌های نزد صندوق
      expect(status.availableCredit.toNumber()).toBeLessThan(50000000);
    });

    it('اگر فاکتور جدید از سقف اعتبار مشتری تجاوز کند، باید صدور آن را با خطا مسدود کند', async () => {
      // تلاش برای ثبت فاکتور ۶۰ میلیون تومانی در حالی که سقف اعتبار ۵۰ میلیون است
      const validation = await CreditService.validateNewInvoice(testCustomerId, 60000000);
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain('سقف اعتبار');
    });

    it('اگر قفل دستی اعتبار فعال باشد، باید از صدور فاکتور با درج علت ممانعت کند', async () => {
      await CreditService.updateCreditSettings(testCustomerId, {
        isCreditBlocked: true,
        creditBlockReason: 'دستور مدیر مالی: بدحسابی در موعد چک',
      });

      const validation = await CreditService.validateNewInvoice(testCustomerId, 1000000);
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain('بدحسابی در موعد چک');

      // بازگشایی قفل برای ادامه تست‌ها
      await CreditService.updateCreditSettings(testCustomerId, {
        isCreditBlocked: false,
        creditBlockReason: null,
      });
    });
  });

  describe('۵. آزمون تخصیص هوشمند تسویه‌ها (Settlement Allocations)', () => {
    it('باید تسویه چند فاکتور با یک پرداخت و وضعیت PARTIAL/PAID را به درستی اعمال کند', async () => {
      // ایجاد فاکتور دوم با مبلغ ۷،۰۰۰،۰۰۰ تومان
      const inv2 = await db.invoice.create({
        data: {
          invoiceNo: `INV-TEST-2-${Date.now().toString().slice(-4)}`,
          customerId: testCustomerId,
          amount: 7000000,
          discount: 0,
          tax: 0,
          finalAmount: 7000000,
        },
      });
      testInvoice2Id = inv2.id;

      // ثبت یک پرداخت ۱۵،۰۰۰،۰۰۰ تومانی
      const bigPayment = await db.payment.create({
        data: {
          customerId: testCustomerId,
          amount: 15000000,
          paymentMethod: PaymentMethod.TRANSFER,
          receiptNo: 'BANK-TR-12345',
          description: 'واریز نقدی پایا برای تسویه فاکتورها',
        },
      });

      // تخصیص ۸،۰۰۰،۰۰۰ به فاکتور اول (تسویه جزئی) و ۷،۰۰۰،۰۰۰ به فاکتور دوم (تسویه کامل)
      const allocResult = await SettlementService.allocatePayment(bigPayment.id, [
        { invoiceId: testInvoice1Id, amount: 8000000, notes: 'تسویه قسط دوم فاکتور ۱' },
        { invoiceId: testInvoice2Id, amount: 7000000, notes: 'تسویه کامل فاکتور ۲' },
      ]);

      expect(allocResult.totalAllocated.toNumber()).toBe(15000000);
      expect(allocResult.unallocatedAmount.toNumber()).toBe(0);

      // بررسی وضعیت فاکتور ۲: باید PAID شده باشد
      const freshInv2 = await db.invoice.findUnique({ where: { id: testInvoice2Id } });
      expect(freshInv2?.status).toBe(InvoiceStatus.PAID);
      expect(freshInv2?.paidAmount).toBe(7000000);

      // بررسی وضعیت فاکتور ۱: پرداختی قبلی (۱۰ میلیون) + تخصیص جدید (۸ میلیون) = ۱۸ میلیون از ۱۹.۸ میلیون (PARTIAL)
      const freshInv1 = await db.invoice.findUnique({ where: { id: testInvoice1Id } });
      expect(freshInv1?.status).toBe(InvoiceStatus.PARTIAL);
      expect(freshInv1?.paidAmount).toBe(18000000);

      // پاکسازی پرداخت موقت تست
      await db.paymentAllocation.deleteMany({ where: { paymentId: bigPayment.id } });
      await db.payment.delete({ where: { id: bigPayment.id } });
    });

    it('تخصیص مبلغ بیشتر از فیش پرداخت باید با خطای استاندارد رد شود', async () => {
      await expect(
        SettlementService.allocatePayment(testPaymentId, [
          { invoiceId: testInvoice1Id, amount: 999999999 },
        ])
      ).rejects.toThrow('نمی‌تواند از کل مبلغ پرداخت');
    });
  });

  describe('۶. آزمون حفاظت ضد حذف آبشاری و تغییرناپذیری (Anti-Cascade & Immutability)', () => {
    it('موتور پایگاه‌داده باید مانع حذف فیزیکی مشتری دارای فاکتور و اسناد مالی شود (onDelete: Restrict)', async () => {
      // تلاش برای اجرای delete مستقیم روی مشتری در سطح دیتابیس باید خطای قید فارن‌کی پرتاب کند
      await expect(
        db.customer.delete({
          where: { id: testCustomerId },
        })
      ).rejects.toThrow();
    });

    it('ابطال فاکتور فروش باید سند معکوس (Reversal Voucher) در دفتر کل صادر کند', async () => {
      const reversal = await ARPostingService.reverseInvoiceVoucher(
        testInvoice1Id,
        'ابطال آزمایشی فاکتور جهت تست سند معکوس'
      );

      expect(reversal).toBeDefined();
      expect(reversal?.type).toBe(VoucherType.REVERSAL);
      expect(reversal?.reversalOfId).toBeDefined();

      // وضعیت فاکتور باید CANCELLED شده باشد
      const cancelledInv = await db.invoice.findUnique({ where: { id: testInvoice1Id } });
      expect(cancelledInv?.status).toBe(InvoiceStatus.CANCELLED);
    });
  });
});
