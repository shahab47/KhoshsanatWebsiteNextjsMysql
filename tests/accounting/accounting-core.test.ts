import { describe, it, expect, beforeAll } from 'vitest';
import db from '@/lib/db';
import { VoucherService } from '@/lib/accounting/voucher-service';
import { PeriodService } from '@/lib/accounting/period-service';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { PeriodStatus, VoucherStatus, VoucherType } from '@prisma/client';

describe('Accounting Core Invariants & Posting Engine', () => {
  let bankAccountId: string;
  let revenueAccountId: string;
  let arAccountId: string;
  let defaultCompanyId: string;
  let testPeriodId: string;

  beforeAll(async () => {
    const bank = await db.account.findUnique({ where: { code: '110101' } });
    const revenue = await db.account.findUnique({ where: { code: '410101' } });
    const ar = await db.account.findUnique({ where: { code: '110301' } });
    const company = await db.company.findFirst({ where: { isDefault: true } });
    const period = await db.fiscalPeriod.findFirst({ where: { status: 'OPEN' } });

    bankAccountId = bank!.id;
    revenueAccountId = revenue!.id;
    arAccountId = ar!.id;
    defaultCompanyId = company!.id;
    testPeriodId = period!.id;
  });

  describe('۱. آزمون‌های نامتغیر بدهکار و بستانکار (Debit/Credit Balancing)', () => {
    it('باید سند ناتراز را رد کرده و مانع ثبت آن شود', async () => {
      await expect(
        VoucherService.createVoucher({
          voucherDate: new Date(),
          description: 'تست سند ناتراز',
          companyId: defaultCompanyId,
          entries: [
            { accountId: bankAccountId, debit: 1000000, credit: 0 },
            { accountId: revenueAccountId, debit: 0, credit: 900000 }, // اختلاف ۱۰۰ هزار تومان
          ],
        })
      ).rejects.toThrow('سند حسابداری ناتراز است');
    });

    it('باید مبالغ منفی را در بدهکار یا بستانکار رد کند', async () => {
      await expect(
        VoucherService.createVoucher({
          voucherDate: new Date(),
          description: 'تست ارقام منفی',
          companyId: defaultCompanyId,
          entries: [
            { accountId: bankAccountId, debit: -500000, credit: 0 },
            { accountId: revenueAccountId, debit: 0, credit: -500000 },
          ],
        })
      ).rejects.toThrow('نمی‌توانند منفی باشند');
    });

    it('باید ردیف دارای همزمان بدهکار و بستانکار را رد کند (XOR Rule)', async () => {
      await expect(
        VoucherService.createVoucher({
          voucherDate: new Date(),
          description: 'تست ردیف دوطرفه',
          companyId: defaultCompanyId,
          entries: [
            { accountId: bankAccountId, debit: 500000, credit: 200000 },
            { accountId: revenueAccountId, debit: 0, credit: 300000 },
          ],
        })
      ).rejects.toThrow('همزمان دارای بدهکار و بستانکار باشد');
    });
  });

  describe('۲. آزمون‌های قطعی‌سازی و قفل سند (Posting Engine)', () => {
    it('باید سند تراز را در وضعیت پیش‌نویس ثبت کرده و سپس قطعی کند', async () => {
      const voucher = await VoucherService.createVoucher({
        voucherDate: new Date(),
        description: 'سند تراز آزمایشی فروش نقدی',
        companyId: defaultCompanyId,
        entries: [
          { accountId: bankAccountId, debit: 2500000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 2500000 },
        ],
      });

      expect(voucher.status).toBe(VoucherStatus.DRAFT);
      expect(voucher.entries.length).toBe(2);

      const finalized = await VoucherService.finalizeVoucher(voucher.id, 'admin-tester');
      expect(finalized.status).toBe(VoucherStatus.FINALIZED);
      expect(finalized.postedById).toBe('admin-tester');
      expect(finalized.postedAt).toBeDefined();
    });
  });

  describe('۳. آزمون‌های برگشت سند و تغییرناپذیری (Reversal Engine)', () => {
    it('باید سند قطعی را با صدور سند معکوس دقیقاً موازنه و ابطال کند', async () => {
      // ثبت و قطعی‌سازی یک سند
      const initialVoucher = await VoucherService.createVoucher({
        voucherDate: new Date(),
        description: 'سند جهت تست برگشت',
        companyId: defaultCompanyId,
        entries: [
          { accountId: arAccountId, debit: 1200000, credit: 0, detail1Type: 'CUSTOMER', detail1Id: '4' },
          { accountId: revenueAccountId, debit: 0, credit: 1200000 },
        ],
      });
      await VoucherService.finalizeVoucher(initialVoucher.id, 'admin-1');

      // صدور سند برگشت
      const reversal = await VoucherService.reverseVoucher({
        voucherId: initialVoucher.id,
        reason: 'ابطال فاکتور به علت انصراف خریدار',
        createdById: 'admin-1',
      });

      expect(reversal).toBeDefined();
      expect(reversal.type).toBe(VoucherType.REVERSAL);
      expect(reversal.status).toBe(VoucherStatus.FINALIZED);
      expect(reversal.reversalOfId).toBe(initialVoucher.id);

      // بررسی آرتیکل‌های معکوس: جای بدهکار و بستانکار دقیقاً برعکس شده است
      const revEntries = reversal.entries;
      const arReversed = revEntries.find((e) => e.accountId === arAccountId);
      const revReversed = revEntries.find((e) => e.accountId === revenueAccountId);

      expect(Number(arReversed?.credit)).toBe(1200000);
      expect(Number(arReversed?.debit)).toBe(0);
      expect(Number(revReversed?.debit)).toBe(1200000);
      expect(Number(revReversed?.credit)).toBe(0);
    });

    it('باید مانع برگشت مجدد یک سند قبلاً برگشت‌خورده شود', async () => {
      const initial = await VoucherService.createVoucher({
        voucherDate: new Date(),
        description: 'سند تست جلوگیری از برگشت مضاعف',
        companyId: defaultCompanyId,
        entries: [
          { accountId: bankAccountId, debit: 300000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 300000 },
        ],
      });
      await VoucherService.finalizeVoucher(initial.id);
      await VoucherService.reverseVoucher({
        voucherId: initial.id,
        reason: 'برگشت اول',
      });

      // تلاش برای برگشت مجدد
      await expect(
        VoucherService.reverseVoucher({
          voucherId: initial.id,
          reason: 'تلاش برای برگشت دوم',
        })
      ).rejects.toThrow('این سند قبلاً برگشت خورده است');
    });
  });

  describe('۴. آزمون قفل دوره مالی (Accounting Period Lock)', () => {
    it('باید مانع ثبت سند در دوره‌ای شود که به وضعیت HARD_CLOSED تغییر یافته است', async () => {
      // ایجاد دوره تستی و بستن آن با شماره تصادفی یکتا
      const testPeriodNumber = Math.floor(Math.random() * 90000) + 1000;
      const closedPeriod = await db.fiscalPeriod.create({
        data: {
          fiscalYearId: (await db.fiscalYear.findFirst())!.id,
          periodNumber: testPeriodNumber,
          title: `دوره آزمایشی بسته ${testPeriodNumber}`,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-30'),
          status: PeriodStatus.HARD_CLOSED,
        },
      });

      await expect(
        VoucherService.createVoucher({
          voucherDate: new Date('2025-01-15'),
          description: 'تلاش برای ثبت در دوره بسته',
          periodId: closedPeriod.id,
          companyId: defaultCompanyId,
          entries: [
            { accountId: bankAccountId, debit: 100000, credit: 0 },
            { accountId: revenueAccountId, debit: 0, credit: 100000 },
          ],
        })
      ).rejects.toThrow('در وضعیت HARD_CLOSED (بسته) قرار دارد');

      // بازگشایی دوره با دلیل و لاگ
      await PeriodService.reopenPeriod({
        periodId: closedPeriod.id,
        userId: 'auditor-1',
        reason: 'بازگشایی جهت اعمال اصلاحات پایان سال',
      });

      // اکنون باید با موفقیت ثبت شود
      const voucher = await VoucherService.createVoucher({
        voucherDate: new Date('2025-01-15'),
        description: 'ثبت پس از بازگشایی مجاز',
        periodId: closedPeriod.id,
        companyId: defaultCompanyId,
        entries: [
          { accountId: bankAccountId, debit: 100000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 100000 },
        ],
      });
      expect(voucher).toBeDefined();

      // پاکسازی دوره تستی
      await db.fiscalPeriod.delete({ where: { id: closedPeriod.id } });
    });
  });

  describe('۵. آزمون شماره‌گذاری همزمان (Concurrency-Safe Sequences)', () => {
    it('باید در فراخوانی‌های همزمان شماره‌های تصاعدی بدون هیچ‌گونه تکرار یا تداخل تولید کند', async () => {
      const promises = Array.from({ length: 10 }).map(() =>
        SequenceService.nextNumber('VOUCHER', defaultCompanyId)
      );

      const results = await Promise.all(promises);
      const numbers = results.map((r) => r.rawNumber);
      const uniqueNumbers = new Set(numbers);

      expect(uniqueNumbers.size).toBe(10); // ۱۰ شماره کاملاً یکتا و بدون تصادم
    });
  });

  describe('۶. آزمون عدم تکرار سند و Idempotency (Double Posting Guard)', () => {
    it('ارسال دوبار یک درخواست صدور سند با یک IdempotencyKey باید دقیقا همان یک سند را بازگرداند', async () => {
      const key = `TEST-IDEMPOTENCY-${Date.now()}`;

      const voucher1 = await VoucherService.createVoucher({
        voucherDate: new Date(),
        description: 'تست تکرار فاکتور فروش',
        idempotencyKey: key,
        companyId: defaultCompanyId,
        entries: [
          { accountId: bankAccountId, debit: 750000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 750000 },
        ],
      });

      const voucher2 = await VoucherService.createVoucher({
        voucherDate: new Date(),
        description: 'تلاش برای ایجاد تکراری با همان کلید',
        idempotencyKey: key,
        companyId: defaultCompanyId,
        entries: [
          { accountId: bankAccountId, debit: 750000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 750000 },
        ],
      });

      expect(voucher1.id).toBe(voucher2.id);
      expect(voucher1.voucherNo).toBe(voucher2.voucherNo);
    });
  });
});
