import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, VoucherStatus, VoucherType, TaxSendStatus, PeriodStatus } from '@prisma/client';
import { ModyanService } from '@/lib/tax/modyan-service';
import { validateVerhoeff } from '@/lib/tax/verhoeff';
import { FinancialReportService } from '@/lib/accounting/financial-report-service';
import { YearEndClosingService } from '@/lib/accounting/year-end-closing-service';
import { PeriodService } from '@/lib/accounting/period-service';
import { SequenceService } from '@/lib/accounting/sequence-service';

describe('Phase 8: Modyan Tax Compliance, General Ledger, Trial Balance, Balance Sheet & Year-End Closing', () => {
  let testCustomerId: number;
  let testInvoiceId: number;
  let testFiscalYearId: string;

  const createdCustomerIds: number[] = [];
  const createdInvoiceIds: number[] = [];
  const createdFiscalYearIds: string[] = [];
  const createdVoucherIds: string[] = [];

  beforeAll(async () => {
    // ۱. اطمینان از وجود حساب‌های ۳۳، ۳۳۰۱۰۱ و ۳۳۰۲۰۱
    const parent3 = await db.account.findUnique({ where: { code: '3' } });
    if (parent3) {
      const acc33 = await db.account.upsert({
        where: { code: '33' },
        create: {
          code: '33',
          name: 'سود و زیان انباشته و جاری',
          level: 2,
          nature: 'CREDIT',
          accountType: 'EQUITY',
          parentId: parent3.id,
        },
        update: {},
      });
      await db.account.upsert({
        where: { code: '330101' },
        create: {
          code: '330101',
          name: 'سود و زیان انباشته',
          level: 3,
          nature: 'DUAL',
          accountType: 'EQUITY',
          parentId: acc33.id,
        },
        update: {},
      });
      await db.account.upsert({
        where: { code: '330201' },
        create: {
          code: '330201',
          name: 'خلاصه سود و زیان سال مالی',
          level: 3,
          nature: 'DUAL',
          accountType: 'EQUITY',
          parentId: acc33.id,
        },
        update: {},
      });
    }

    // ۲. ایجاد مشتری تست با شناسه ملی حقوقی ۱۱ رقمی معتبر
    const customer = await db.customer.create({
      data: {
        name: 'شرکت مهندسی و ساختمانی پایا بتن (تست مودیان)',
        email: `paya_beton_${Date.now()}@example.com`,
        phone: '02188776655',
        company: 'پایا بتن',
        nationalId: '10103456789', // ۱۱ رقم حقوقی
        economicCode: '411234567890',
        postalCode: '1987654321',
        creditLimit: 500_000_000,
        riskRating: 'LOW',
      },
    });
    testCustomerId = customer.id;
    createdCustomerIds.push(customer.id);

    // ۳. ایجاد فاکتور تست
    const invoice = await db.invoice.create({
      data: {
        invoiceNo: `INV-TAX-${Date.now().toString().slice(-6)}`,
        customerId: customer.id,
        amount: 50_000_000, // ۵۰ میلیون تومان
        discount: 2_000_000,
        tax: 4_800_000, // ۱۰٪ مالیات بر ارزش افزوده
        finalAmount: 52_800_000,
        status: 'PENDING',
        taxStatus: TaxSendStatus.NOT_SENT,
        items: {
          create: [
            {
              title: 'تیرآهن هاش سنگین IPB-300',
              quantity: 1000,
              unitPrice: 50_000,
              discount: 2_000_000,
              taxRate: new Prisma.Decimal('0.10'),
              taxAmount: new Prisma.Decimal(4_800_000),
              total: 52_800_000,
            },
          ],
        },
      },
    });
    testInvoiceId = invoice.id;
    createdInvoiceIds.push(invoice.id);
  });

  afterAll(async () => {
    for (const vId of createdVoucherIds) {
      await db.journalEntry.deleteMany({ where: { voucherId: vId } });
      await db.journalVoucher.delete({ where: { id: vId } }).catch(() => {});
    }
    for (const yId of createdFiscalYearIds) {
      await db.fiscalPeriod.deleteMany({ where: { fiscalYearId: yId } });
      await db.fiscalYear.delete({ where: { id: yId } }).catch(() => {});
    }
    for (const iId of createdInvoiceIds) {
      await db.invoiceItem.deleteMany({ where: { invoiceId: iId } });
      await db.invoice.delete({ where: { id: iId } }).catch(() => {});
    }
    for (const cId of createdCustomerIds) {
      await db.customer.delete({ where: { id: cId } }).catch(() => {});
    }
  });

  // ۱. تولید شناسه ۲۲ رقمی مالیاتی با رقم کنترلی ورهوف
  it('Step 1: Generate 22-character unique Tax ID (TaxID) with Verhoeff checksum', async () => {
    const result = await ModyanService.generateTaxIdForInvoice(testInvoiceId);

    expect(result).toBeDefined();
    expect(result.taxId).toBeDefined();
    expect(result.taxId.length).toBe(22);
    expect(result.taxId.startsWith('A12345')).toBe(true);

    // اعتبارسنجی رقم کنترل ورهوف
    const isValid = validateVerhoeff(result.taxId);
    expect(isValid).toBe(true);

    // بررسی ثبت در فاکتور دیتابیس و وضعیت QUEUED
    const updatedInvoice = await db.invoice.findUnique({ where: { id: testInvoiceId } });
    expect(updatedInvoice!.taxId).toBe(result.taxId);
    expect(updatedInvoice!.taxStatus).toBe(TaxSendStatus.QUEUED);

    // آزمون Idempotency: فراخوانی مجدد همان شماره را بدون تکرار برمی‌گرداند
    const secondCall = await ModyanService.generateTaxIdForInvoice(testInvoiceId);
    expect(secondCall.taxId).toBe(result.taxId);
    expect(secondCall.isExisting).toBe(true);
  });

  // ۲. ساخت پکیج داده‌ای استاندارد سامانه مودیان (Modyan Payload)
  it('Step 2: Build Modyan Tax Packet matching Iranian Tax Organization specifications', async () => {
    const packet = await ModyanService.buildTaxInvoicePacket(testInvoiceId);

    expect(packet).toBeDefined();
    expect(packet.header).toBeDefined();
    expect(packet.body).toBeDefined();
    expect(packet.body.length).toBe(1);

    // بررسی سرستون
    expect(packet.header.taxId.length).toBe(22);
    expect(packet.header.inty).toBe(1); // نوع ۱: با خریدار
    expect(packet.header.inp).toBe(1); // فروش کالا و خدمات
    expect(packet.header.tob).toBe(1); // خریدار حقوقی (شرکت)
    expect(packet.header.bid).toBe('10103456789'); // شناسه ملی خریدار
    expect(packet.header.tins).toBe(ModyanService.COMPANY_ECONOMIC_CODE);

    // مبالغ به ریال (۱۰ برابر تومان)
    expect(packet.header.tprdis).toBe(500_000_000); // ۵۰ میلیون تومان = ۵۰۰ میلیون ریال
    expect(packet.header.tvam).toBe(48_000_000); // ۴.۸ میلیون تومان = ۴۸ میلیون ریال

    // بررسی اقلام کالا
    const item = packet.body[0];
    expect(item.sstid).toBe(ModyanService.DEFAULT_STEEL_PRODUCT_SSTID);
    expect(item.am).toBe(1000);
    expect(item.vra).toBe(0.10);
    expect(item.vam).toBe(48_000_000);
  });

  // ۳. ارسال موفقیت‌آمیز فاکتور به سامانه مودیان و دریافت شناسه رهگیری
  it('Step 3: Transmit invoice to Modyan and receive packet tracking UID', async () => {
    const sendResult = await ModyanService.sendInvoiceToModyan(testInvoiceId);

    expect(sendResult.success).toBe(true);
    expect(sendResult.status).toBe(TaxSendStatus.SUCCESS);
    expect(sendResult.packetUid).toBeDefined();
    expect(sendResult.packetUid!.startsWith('TAX-REF-')).toBe(true);

    // بررسی در دیتابیس
    const inv = await db.invoice.findUnique({ where: { id: testInvoiceId } });
    expect(inv!.taxStatus).toBe(TaxSendStatus.SUCCESS);
    expect(inv!.taxPacketUid).toBe(sendResult.packetUid);
    expect(inv!.taxErrorLog).toBeNull();
  });

  // ۴. دفتر روزنامه رسمی (General Journal)
  it('Step 4: General Journal returns chronological vouchers with 100% debit/credit equilibrium', async () => {
    const journal = await FinancialReportService.getGeneralJournal({ take: 200 });

    expect(journal).toBeDefined();
    expect(journal.total).toBeGreaterThan(0);
    expect(journal.vouchers.length).toBeGreaterThan(0);

    // بررسی موازنه کلی ستون‌های بدهکار و بستانکار
    expect(journal.summary.isBalanced).toBe(true);
    expect(journal.summary.totalDebit.toString()).toBe(journal.summary.totalCredit.toString());

    // بررسی تک‌تک اسناد که هر سند به تنهایی تراز باشد
    for (const v of journal.vouchers) {
      expect(v.totalDebit.toString()).toBe(v.totalCredit.toString());
      expect(v.entries.length).toBeGreaterThanOrEqual(2);
    }
  });

  // ۵. دفتر معین و کل حساب‌ها (Account Subsidiary Ledger)
  it('Step 5: Account Ledger tracks opening balance, running balances and diagnosis', async () => {
    // استعلام دفتر معین حساب دریافتنی تجاری مشتریان (۱۱۰۳۰۱)
    const ledger = await FinancialReportService.getAccountLedger('110301');

    expect(ledger).toBeDefined();
    expect(ledger.account.code).toBe('110301');
    expect(ledger.rows.length).toBeGreaterThan(0);

    // بررسی فرمول مانده جاری: هر ردیف باید مانده معتبر داشته باشد
    for (const r of ledger.rows) {
      expect(Number(r.runningBalance)).toBeGreaterThanOrEqual(0);
      expect(['بدهکار', 'بستانکار', 'تسویه']).toContain(r.diagnosis);
    }

    // مجموع گردش‌ها
    expect(Number(ledger.summary.totalDebitTurnover)).toBeGreaterThan(0);
  });

  // ۶. تراز آزمایشی متوازن ۴ و ۶ ستونی (Trial Balance)
  it('Step 6: Trial Balance maintains strict double-entry balance in debit and credit columns', async () => {
    // تراز معین (سطح ۳)
    const trialLevel3 = await FinancialReportService.getTrialBalance(3);

    expect(trialLevel3).toBeDefined();
    expect(trialLevel3.rows.length).toBeGreaterThan(0);
    expect(trialLevel3.totals.isTurnoverBalanced).toBe(true);
    expect(trialLevel3.totals.isBalanceBalanced).toBe(true);

    // گردش بدهکار برابر گردش بستانکار
    expect(trialLevel3.totals.sumDebitTurnover.toString()).toBe(trialLevel3.totals.sumCreditTurnover.toString());
    // مانده بدهکار برابر مانده بستانکار
    expect(trialLevel3.totals.sumDebitBalance.toString()).toBe(trialLevel3.totals.sumCreditBalance.toString());

    // تراز کل (سطح ۲)
    const trialLevel2 = await FinancialReportService.getTrialBalance(2);
    expect(trialLevel2.totals.isTurnoverBalanced).toBe(true);
    expect(trialLevel2.totals.isBalanceBalanced).toBe(true);
  });

  // ۷. صورت سود و زیان دوره‌ای (Income Statement)
  it('Step 7: Income Statement correctly calculates Revenues, COGS, Gross Profit and Net Income', async () => {
    const pnl = await FinancialReportService.getIncomeStatement();

    expect(pnl).toBeDefined();
    expect(pnl.revenues).toBeDefined();
    expect(pnl.cogs).toBeDefined();
    expect(pnl.expenses).toBeDefined();

    // محاسبه سود ناخالص: فروش منهای بهای تمام‌شده
    const calculatedGross = pnl.revenues.total.sub(pnl.cogs.total);
    expect(pnl.grossProfit.toString()).toBe(calculatedGross.toString());

    // محاسبه سود عملیاتی: سود ناخالص منهای هزینه‌های عمومی
    const calculatedNet = pnl.grossProfit.sub(pnl.expenses.total);
    expect(pnl.netOperatingIncome.toString()).toBe(calculatedNet.toString());
  });

  // ۸. ترازنامه و اثبات معادله بنیادی حسابداری (Balance Sheet)
  it('Step 8: Balance Sheet proves fundamental accounting equation: Assets = Liabilities + Equity', async () => {
    const balanceSheet = await FinancialReportService.getBalanceSheet();

    expect(balanceSheet).toBeDefined();
    expect(balanceSheet.assets).toBeDefined();
    expect(balanceSheet.liabilities).toBeDefined();
    expect(balanceSheet.equity).toBeDefined();

    // معادله ترازنامه: دارایی‌ها = بدهی‌ها + سرمایه و حقوق صاحبان سهام
    expect(balanceSheet.isBalanced).toBe(true);
    expect(balanceSheet.assets.total.toString()).toBe(balanceSheet.totalLiabilitiesAndEquity.toString());
  });

  // ۹. بستن سال مالی، صدور سند اختتامیه و قفل دوره‌ها
  it('Step 9: Year-End Closing zeroes out temporary accounts, transfers Net Profit to Retained Earnings and locks periods', async () => {
    const defaultCompany = await db.company.findFirst({ where: { isDefault: true } });

    // ایجاد یک سال مالی تستی جهت بستن
    const testYearNumber = 1409;
    const testYear = await PeriodService.createFiscalYear({
      companyId: defaultCompany!.id,
      year: testYearNumber,
      title: `سال مالی تستی ${testYearNumber}`,
      startDate: new Date('2030-03-21T00:00:00.000Z'),
      endDate: new Date('2031-03-20T23:59:59.999Z'),
    });

    testFiscalYearId = testYear.id;
    createdFiscalYearIds.push(testYear.id);

    // ثبت یک فروش و یک هزینه در این سال مالی
    const revAcc = await db.account.findUnique({ where: { code: '410101' } });
    const bankAcc = await db.account.findUnique({ where: { code: '110101' } });
    const expAcc = await db.account.findUnique({ where: { code: '610101' } });

    const vSeq1 = await SequenceService.nextNumber('VOUCHER');
    const saleVoucher = await db.journalVoucher.create({
      data: {
        voucherNo: vSeq1.rawNumber,
        voucherDate: new Date('2030-05-10T10:00:00.000Z'),
        type: VoucherType.SALES,
        description: 'فروش آزمایشی سال ۱۴۰۹',
        status: VoucherStatus.FINALIZED,
        companyId: defaultCompany!.id,
        totalDebit: new Prisma.Decimal(100_000_000),
        totalCredit: new Prisma.Decimal(100_000_000),
        entries: {
          create: [
            {
              accountId: bankAcc!.id,
              debit: new Prisma.Decimal(100_000_000),
              credit: new Prisma.Decimal(0),
              description: 'دریافت نقدی فروش',
              rowOrder: 1,
            },
            {
              accountId: revAcc!.id,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(100_000_000),
              description: 'درآمد فروش قطعات',
              rowOrder: 2,
            },
          ],
        },
      },
    });
    createdVoucherIds.push(saleVoucher.id);

    const vSeq2 = await SequenceService.nextNumber('VOUCHER');
    const expVoucher = await db.journalVoucher.create({
      data: {
        voucherNo: vSeq2.rawNumber,
        voucherDate: new Date('2030-06-15T10:00:00.000Z'),
        type: VoucherType.GENERAL,
        description: 'هزینه دستمزد آزمایشی سال ۱۴۰۹',
        status: VoucherStatus.FINALIZED,
        companyId: defaultCompany!.id,
        totalDebit: new Prisma.Decimal(30_000_000),
        totalCredit: new Prisma.Decimal(30_000_000),
        entries: {
          create: [
            {
              accountId: expAcc!.id,
              debit: new Prisma.Decimal(30_000_000),
              credit: new Prisma.Decimal(0),
              description: 'هزینه دستمزد پرسنل',
              rowOrder: 1,
            },
            {
              accountId: bankAcc!.id,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(30_000_000),
              description: 'پرداخت از بانک',
              rowOrder: 2,
            },
          ],
        },
      },
    });
    createdVoucherIds.push(expVoucher.id);

    // اجرای بستن سال مالی
    const closeResult = await YearEndClosingService.closeFiscalYear(testFiscalYearId, defaultCompany!.id);

    expect(closeResult.fiscalYear.isClosed).toBe(true);
    expect(closeResult.closingVoucher).toBeDefined();

    createdVoucherIds.push(closeResult.closingVoucher!.id);

    // سود خالص سال ۱۴۰۹ = ۱۰۰ میلیون درآمد - ۳۰ میلیون هزینه = ۷۰ میلیون سود
    expect(closeResult.netProfitOrLoss.toString()).toBe('70000000');

    // سند اختتامیه متوازن:
    // بدهکار: درآمد فروش (۴۱۰۱۰۱) به مبلغ ۱۰۰ میلیون
    // بستانکار: هزینه دستمزد (۶۱۰۱۰۱) به مبلغ ۳۰ میلیون
    // بستانکار: سود و زیان انباشته (۳۳۰۱۰۱) به مبلغ ۷۰ میلیون
    const closingVoucher = await db.journalVoucher.findUnique({
      where: { id: closeResult.closingVoucher!.id },
      include: { entries: { include: { account: true } } },
    });

    expect(closingVoucher).toBeDefined();
    expect(closingVoucher!.type).toBe(VoucherType.CLOSING);
    expect(closingVoucher!.totalDebit.toString()).toBe(closingVoucher!.totalCredit.toString());

    const revEntry = closingVoucher!.entries.find((e) => e.account.code === '410101');
    expect(revEntry).toBeDefined();
    expect(revEntry!.debit.toString()).toBe('100000000');

    const expEntry = closingVoucher!.entries.find((e) => e.account.code === '610101');
    expect(expEntry).toBeDefined();
    expect(expEntry!.credit.toString()).toBe('30000000');

    const retainedEntry = closingVoucher!.entries.find((e) => e.account.code === '330101');
    expect(retainedEntry).toBeDefined();
    expect(retainedEntry!.credit.toString()).toBe('70000000');

    // بررسی قفل شدن دوره‌ها (HARD_CLOSED)
    const periods = await db.fiscalPeriod.findMany({ where: { fiscalYearId: testFiscalYearId } });
    expect(periods.every((p) => p.status === PeriodStatus.HARD_CLOSED)).toBe(true);
  });
});
