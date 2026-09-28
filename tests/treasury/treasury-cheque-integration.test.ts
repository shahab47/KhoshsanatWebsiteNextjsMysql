import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, ChequeStatus, ChequeType, PettyCashStatus, PettyCashTxType } from '@prisma/client';
import { ChequeService } from '@/lib/treasury/cheque-service';
import { PettyCashService } from '@/lib/treasury/petty-cash-service';
import { BankAccountService } from '@/lib/treasury/bank-account-service';

describe('Phase 4: Treasury, Sayad Cheques & Petty Cash Integration', () => {
  let testCustomerId: number;
  let testBankAccountId: string;
  let testFundId: string;
  const createdChequeIds: string[] = [];
  const createdVoucherIds: string[] = [];

  beforeAll(async () => {
    // ۱. ایجاد مشتری تست خزانه‌داری
    const testCustomer = await db.customer.create({
      data: {
        name: 'شرکت سازه‌های فولادی پایتخت (تست خزانه‌داری و صیاد)',
        email: `treasury_steel_${Date.now()}@example.com`,
        phone: '02166554433',
        company: 'سازه‌های فولادی پایتخت',
        nationalId: `1400${Date.now().toString().slice(-7)}`,
        economicCode: '411222333444',
        creditLimit: 500_000_000,
        riskRating: 'LOW',
      },
    });
    testCustomerId = testCustomer.id;

    // ۲. ایجاد یا دریافت حساب بانکی تست کارخانه
    let bankAcc = await db.bankAccount.findFirst({
      where: { accountNumber: 'TEST-MELLAT-9988' },
    });
    if (!bankAcc) {
      const defaultCompany = await db.company.findFirst({ where: { isDefault: true } });
      const defaultBankAcc = await db.account.findUnique({ where: { code: '110101' } });
      bankAcc = await db.bankAccount.create({
        data: {
          company: defaultCompany ? { connect: { id: defaultCompany.id } } : undefined,
          bankName: 'بانک ملت',
          branchName: 'شعبه شادآباد',
          branchCode: '65432',
          accountNumber: 'TEST-MELLAT-9988',
          iban: 'IR120120000000009988776655',
          accountId: defaultBankAcc?.id,
          isActive: true,
        },
      });
    }
    testBankAccountId = bankAcc.id;

    // ۳. ایجاد صندوق تنخواه‌گردان کارخانه برای تست
    const fundCode = `PC-TEST-${Date.now().toString().slice(-4)}`;
    const fund = await PettyCashService.createFund({
      code: fundCode,
      title: 'صندوق تست تنخواه‌گردان کارخانه',
      holderName: 'مهندس احمدی (سرپرست کارگاه شادآباد)',
      holderPhone: '09121112233',
      limitAmount: 50_000_000, // سقف ۵۰ میلیون تومان
      initialBalance: 0,
    });
    testFundId = fund.id;
  });

  afterAll(async () => {
    // پاکسازی داده‌های تست
    for (const chqId of createdChequeIds) {
      await db.cheque.deleteMany({ where: { id: chqId } });
    }

    if (testFundId) {
      await db.pettyCashTransaction.deleteMany({ where: { fundId: testFundId } });
      await db.pettyCashFund.deleteMany({ where: { id: testFundId } });
    }

    if (testCustomerId) {
      await db.payment.deleteMany({ where: { customerId: testCustomerId } });
      await db.customer.deleteMany({ where: { id: testCustomerId } });
    }

    for (const vId of createdVoucherIds) {
      await db.journalEntry.deleteMany({ where: { voucherId: vId } });
      await db.journalVoucher.deleteMany({ where: { id: vId } });
    }
  });

  // ========================================================
  // ۱. تست اعتبارسنجی شناسه ۱۶ رقمی صیاد
  // ========================================================
  describe('Sayad ID 16-Digit Validation', () => {
    it('should validate a correct 16-digit numeric Sayad ID', () => {
      const result = ChequeService.validateSayadId('1234567890123456');
      expect(result.isValid).toBe(true);
    });

    it('should reject a Sayad ID with fewer than 16 digits', () => {
      const result = ChequeService.validateSayadId('123456789012345');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('۱۶ رقم');
    });

    it('should reject a Sayad ID with non-digit characters', () => {
      const result = ChequeService.validateSayadId('123456789012345A');
      expect(result.isValid).toBe(false);
    });

    it('should reject an empty Sayad ID', () => {
      const result = ChequeService.validateSayadId('');
      expect(result.isValid).toBe(false);
    });
  });

  // ========================================================
  // ۲. تست چرخه کامل وصول چک صیادی: دریافت -> واگذاری به بانک -> وصول قطعی
  // ========================================================
  describe('Full Cheque Lifecycle (Receive -> Deposit -> Clear)', () => {
    let chequeId: string;
    const testSayad = `7788${Date.now().toString().slice(-12)}`;

    it('Step 1: Receive Cheque should create record in RECEIVED status and issue balanced voucher', async () => {
      const cheque = await ChequeService.receiveCheque({
        customerId: testCustomerId,
        sayadId: testSayad,
        chequeNumber: 'CHQ-882201',
        amount: 25_000_000, // ۲۵ میلیون تومان
        dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000), // ۱۵ روز آینده
        bankName: 'بانک ملت',
        bankBranch: 'شعبه مرکزی',
        drawerName: 'آقای اکبری',
        drawerNationalId: '0071234567',
        description: 'بابت تسویه فاکتور تیرآهن و میلگرد',
      });

      expect(cheque).toBeDefined();
      expect(cheque?.id).toBeDefined();
      chequeId = cheque!.id;
      createdChequeIds.push(chequeId);

      expect(cheque?.status).toBe(ChequeStatus.RECEIVED);
      expect(cheque?.sayadId).toBe(testSayad);
      expect(Number(cheque?.amount)).toBe(25_000_000);
      expect(cheque?.journalVoucherId).toBeTruthy();

      // بررسی سند حسابداری صادره
      const voucher = await db.journalVoucher.findUnique({
        where: { id: cheque!.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // بررسی تعادل بدهکار و بستانکار
      expect(Number(voucher?.totalDebit)).toBe(25_000_000);
      expect(Number(voucher?.totalCredit)).toBe(25_000_000);

      // بدهکار: ۱۱۰۴۰۱ (اسناد دریافتنی تجاری - نزد صندوق)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('110401');

      // بستانکار: ۱۱۰۳۰۱ (حساب‌های دریافتنی تجاری - مشتریان)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110301');
    });

    it('Step 2: Duplicate Sayad ID registration should be rejected', async () => {
      await expect(
        ChequeService.receiveCheque({
          customerId: testCustomerId,
          sayadId: testSayad, // تکراری
          chequeNumber: 'CHQ-DUPLICATE',
          amount: 10_000_000,
          dueDate: new Date(),
          bankName: 'بانک صادرات',
          drawerName: 'شخص تکراری',
        })
      ).rejects.toThrow(/قبلاً در سیستم ثبت شده/);
    });

    it('Step 3: Deposit Cheque to Bank should update status to DEPOSITED and issue voucher', async () => {
      const updated = await ChequeService.depositCheque(chequeId, testBankAccountId);

      expect(updated.status).toBe(ChequeStatus.DEPOSITED);
      expect(updated.bankAccountId).toBe(testBankAccountId);
      expect(updated.depositedAt).toBeTruthy();

      const voucher = await db.journalVoucher.findUnique({
        where: { id: updated.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // تعادل
      expect(Number(voucher?.totalDebit)).toBe(25_000_000);
      expect(Number(voucher?.totalCredit)).toBe(25_000_000);

      // بدهکار: ۱۱۰۴۰۲ (اسناد در جریان وصول - واگذار شده به بانک)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('110402');

      // بستانکار: ۱۱۰۴۰۱ (اسناد دریافتنی - خروج از صندوق)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110401');
    });

    it('Step 4: Clear Cheque should update status to CLEARED and issue deposit to bank voucher', async () => {
      const cleared = await ChequeService.clearCheque(chequeId);

      expect(cleared.status).toBe(ChequeStatus.CLEARED);
      expect(cleared.clearedAt).toBeTruthy();

      const voucher = await db.journalVoucher.findUnique({
        where: { id: cleared.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // تعادل
      expect(Number(voucher?.totalDebit)).toBe(25_000_000);
      expect(Number(voucher?.totalCredit)).toBe(25_000_000);

      // بدهکار: ۱۱۰۱۰۱ (موجودی بانک)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('110101');

      // بستانکار: ۱۱۰۴۰۲ (اسناد در جریان وصول)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110402');
    });
  });

  // ========================================================
  // ۳. تست برگشت چک صیادی (Bounce) و احیای طلب مشتری + تغییر رتبه اعتباری
  // ========================================================
  describe('Cheque Bounce & Customer Risk Rating Flow', () => {
    let bounceChequeId: string;
    const bounceSayad = `8899${Date.now().toString().slice(-12)}`;

    it('should receive and deposit cheque, then bounce it and reactivate customer debt', async () => {
      // الف: دریافت چک
      const chq = await ChequeService.receiveCheque({
        customerId: testCustomerId,
        sayadId: bounceSayad,
        chequeNumber: 'CHQ-BOUNCE-01',
        amount: 40_000_000,
        dueDate: new Date(),
        bankName: 'بانک تجارت',
        drawerName: 'مشتری پر ریسک',
      });
      bounceChequeId = chq!.id;
      createdChequeIds.push(bounceChequeId);
      if (chq?.journalVoucherId) createdVoucherIds.push(chq.journalVoucherId);

      // ب: واگذاری به بانک
      const deposited = await ChequeService.depositCheque(bounceChequeId, testBankAccountId);
      if (deposited.journalVoucherId) createdVoucherIds.push(deposited.journalVoucherId);

      // ج: اعلام برگشت چک (کسری موجودی)
      const bounced = await ChequeService.bounceCheque(bounceChequeId, 'کسری موجودی در موعد سررسید');

      expect(bounced.status).toBe(ChequeStatus.BOUNCED);
      expect(bounced.bouncedAt).toBeTruthy();
      expect(bounced.bounceReason).toBe('کسری موجودی در موعد سررسید');

      // سند دوبل حسابداری برگشت چک
      const voucher = await db.journalVoucher.findUnique({
        where: { id: bounced.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // تعادل
      expect(Number(voucher?.totalDebit)).toBe(40_000_000);
      expect(Number(voucher?.totalCredit)).toBe(40_000_000);

      // بدهکار: ۱۱۰۳۰۱ (حساب‌های دریافتنی تجاری - احیای طلب از مشتری)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('110301');

      // بستانکار: ۱۱۰۴۰۲ (خروج از اسناد در جریان وصول)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110402');

      // بررسی به‌روزرسانی رتبه اعتباری مشتری به HIGH (ریسک بالا)
      const updatedCustomer = await db.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(['C', 'D', 'HIGH']).toContain(updatedCustomer?.riskRating);
    });
  });

  // ========================================================
  // ۴. تست انتقال / خرج کردن چک صیادی به تامین‌کننده (Transfer)
  // ========================================================
  describe('Cheque Transfer to Supplier', () => {
    let transferChequeId: string;
    const transferSayad = `9900${Date.now().toString().slice(-12)}`;

    it('should transfer received cheque to supplier with double-entry voucher', async () => {
      const chq = await ChequeService.receiveCheque({
        customerId: testCustomerId,
        sayadId: transferSayad,
        chequeNumber: 'CHQ-XFER-01',
        amount: 15_000_000,
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        bankName: 'بانک پاسارگاد',
        drawerName: 'خریدار محصولات فولادی',
      });
      transferChequeId = chq!.id;
      createdChequeIds.push(transferChequeId);
      if (chq?.journalVoucherId) createdVoucherIds.push(chq.journalVoucherId);

      const transferred = await ChequeService.transferCheque(
        transferChequeId,
        'شرکت فولاد مبارکه اصفهان (تامین‌کننده ورق)',
        'بابت خرید ورق گرم رول ۲ میل'
      );

      expect(transferred.status).toBe(ChequeStatus.TRANSFERRED);
      expect(transferred.transferredTo).toContain('فولاد مبارکه');

      const voucher = await db.journalVoucher.findUnique({
        where: { id: transferred.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // بدهکار: ۲۱۰۱۰۱ (حساب‌های پرداختنی تجاری - تامین‌کنندگان)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('210101');

      // بستانکار: ۱۱۰۴۰۱ (اسناد دریافتنی - خروج از نزد صندوق)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110401');
    });
  });

  // ========================================================
  // ۵. تست صندوق تنخواه‌گردان کارخانه (شارژ، هزینه، تسویه)
  // ========================================================
  describe('Petty Cash Fund Lifecycle', () => {
    it('Step 1: Fund Petty Cash from Bank Account should issue balanced voucher Dr 110201 / Cr 110101', async () => {
      const { transaction, fund } = await PettyCashService.fundPettyCash(
        testFundId,
        testBankAccountId,
        20_000_000 // شارژ ۲۰ میلیون تومان
      );

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(PettyCashTxType.FUNDING);
      expect(Number(transaction.amount)).toBe(20_000_000);
      expect(Number(fund.currentBalance)).toBe(20_000_000);
      expect(transaction.journalVoucherId).toBeTruthy();

      const voucher = await db.journalVoucher.findUnique({
        where: { id: transaction.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      createdVoucherIds.push(voucher!.id);

      // تعادل
      expect(Number(voucher?.totalDebit)).toBe(20_000_000);
      expect(Number(voucher?.totalCredit)).toBe(20_000_000);

      // بدهکار: ۱۱۰۲۰۱ (صندوق و تنخواه‌گردان)
      const debitEntry = voucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('110201');

      // بستانکار: ۱۱۰۱۰۱ (بانک ملت)
      const creditEntry = voucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110101');
    });

    it('Step 2: Funding exceeding limit should be rejected', async () => {
      // سقف ۵۰ میلیون است، موجودی فعلی ۲۰ میلیون؛ شارژ ۴۰ میلیون اضافه به ۶۰ میلیون می‌رسد و باید خطا دهد
      await expect(
        PettyCashService.fundPettyCash(testFundId, testBankAccountId, 40_000_000)
      ).rejects.toThrow(/فراتر از سقف مجاز/);
    });

    it('Step 3: Record Expense should deduct current balance and register pending transaction', async () => {
      const expenseTx = await PettyCashService.recordExpense(testFundId, {
        amount: 3_500_000,
        expenseCategory: 'ابزارآلات و ملزومات کارگاه',
        supplierName: 'ابزار صنعتی برادران رضایی',
        receiptNo: 'REC-99441',
        description: 'خرید صفحه سنگ فرز و دستکش جوشکاری کارخانه',
      });

      expect(expenseTx.type).toBe(PettyCashTxType.EXPENSE);
      expect(expenseTx.status).toBe(PettyCashStatus.APPROVED);
      expect(Number(expenseTx.amount)).toBe(3_500_000);

      const fund = await db.pettyCashFund.findUnique({ where: { id: testFundId } });
      // موجودی از ۲۰ میلیون باید به ۱۶.۵ میلیون کاهش یافته باشد
      expect(Number(fund?.currentBalance)).toBe(16_500_000);
    });

    it('Step 4: Expense exceeding available balance should be rejected', async () => {
      // موجودی فعلی ۱۶.۵ میلیون است؛ ثبت هزینه ۲۰ میلیونی باید رد شود
      await expect(
        PettyCashService.recordExpense(testFundId, {
          amount: 20_000_000,
          expenseCategory: 'خرید متفرقه',
          description: 'تلاش برای هزینه فراتر از موجودی',
        })
      ).rejects.toThrow(/موجودی ناکافی/);
    });

    it('Step 5: Settle Petty Cash expenses should issue expense journal voucher Dr 610101 / Cr 110201', async () => {
      // یافتن تراکنش هزینه در انتظار تسویه
      const pendingExpenses = await db.pettyCashTransaction.findMany({
        where: {
          fundId: testFundId,
          type: PettyCashTxType.EXPENSE,
          status: PettyCashStatus.APPROVED,
        },
      });
      const txIds = pendingExpenses.map((t) => t.id);
      expect(txIds.length).toBeGreaterThan(0);

      const { voucher, updatedCount } = await PettyCashService.settlePettyCash(testFundId, txIds);

      expect(updatedCount).toBe(txIds.length);
      expect(voucher).toBeDefined();

      const freshVoucher = await db.journalVoucher.findUnique({
        where: { id: voucher.id },
        include: { entries: { include: { account: true } } },
      });
      expect(freshVoucher).toBeDefined();
      createdVoucherIds.push(freshVoucher!.id);

      // بررسی تعادل سند تسویه
      expect(Number(freshVoucher?.totalDebit)).toBe(3_500_000);
      expect(Number(freshVoucher?.totalCredit)).toBe(3_500_000);

      // بدهکار: ۶۱۰۱۰۱ (هزینه‌های عمومی و اداری)
      const debitEntry = freshVoucher?.entries.find((e) => Number(e.debit) > 0);
      expect(debitEntry?.account.code).toBe('610101');

      // بستانکار: ۱۱۰۲۰۱ (تنخواه‌گردان)
      const creditEntry = freshVoucher?.entries.find((e) => Number(e.credit) > 0);
      expect(creditEntry?.account.code).toBe('110201');
    });
  });
});
