import { describe, it, expect, beforeAll } from 'vitest';
import db from '@/lib/db';
import { seedAccountingCore } from '@/lib/accounting/initial-seed';
import { VoucherService } from '@/lib/accounting/voucher-service';

describe('Accounting Core Seed & Reconciliation', () => {
  beforeAll(async () => {
    // اجرای سید اولیه هسته حسابداری
    await seedAccountingCore();
  });

  it('باید شرکت پیش‌فرض و شعبه مرکزی را با موفقیت ایجاد کند', async () => {
    const company = await db.company.findUnique({
      where: { code: 'KS-ENG' },
      include: { branches: true, costCenters: true },
    });

    expect(company).toBeDefined();
    expect(company?.name).toBe('شرکت مهندسی خوش‌صنعت پایدار');
    expect(company?.branches.length).toBeGreaterThan(0);
    expect(company?.costCenters.length).toBeGreaterThanOrEqual(3);
  });

  it('باید درخت حساب‌ها (گروه، کل، معین) را ایجاد کند', async () => {
    const groups = await db.account.findMany({ where: { level: 1 } });
    const kols = await db.account.findMany({ where: { level: 2 } });
    const moeins = await db.account.findMany({ where: { level: 3 } });

    expect(groups.length).toBe(6);
    expect(kols.length).toBeGreaterThanOrEqual(10);
    expect(moeins.length).toBeGreaterThanOrEqual(15);

    const arAccount = await db.account.findUnique({ where: { code: '110301' } });
    expect(arAccount).toBeDefined();
    expect(arAccount?.name).toContain('مشتریان');
  });

  it('باید سند تراز افتتاحیه را صادر و تراز آزمایشی را متوازن نگه دارد', async () => {
    const trialBalance = await VoucherService.getTrialBalance();

    expect(trialBalance.totals.isBalanced).toBe(true);
    expect(trialBalance.totals.grandDebitTurnover.toString()).toBe(
      trialBalance.totals.grandCreditTurnover.toString()
    );
    expect(trialBalance.totals.grandDebitBalance.toString()).toBe(
      trialBalance.totals.grandCreditBalance.toString()
    );
  });

  it('باید مانده معین مشتری ۴ دقیقاً با مانده تاریخی دیتابیس (-4,495,409) تطابق ۱۰۰٪ داشته باشد', async () => {
    const arAccount = await db.account.findUnique({ where: { code: '110301' } });
    expect(arAccount).toBeDefined();

    const ledger = await VoucherService.getSubsidiaryLedger({
      accountId: arAccount!.id,
      detail1Id: '4',
    });

    expect(ledger.entries.length).toBeGreaterThan(0);
    // مانده معین مشتری = مجموع بدهکار منهای بستانکار = 51045 - 4546454 = -4495409
    expect(ledger.finalBalance.toString()).toBe('-4495409');
  });
});
