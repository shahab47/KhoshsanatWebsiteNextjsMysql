import db from '@/lib/db';
import {
  Prisma,
  PettyCashTxType,
  PettyCashStatus,
  VoucherType,
  MappingTrigger,
} from '@prisma/client';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { AccountingMappingEngine } from '@/lib/accounting/accounting-mapping';

export interface CreateFundInput {
  companyId?: string | null;
  code: string;
  title: string;
  holderName: string;
  holderPhone?: string | null;
  limitAmount: number | Prisma.Decimal;
  initialBalance?: number | Prisma.Decimal;
}

export interface RecordExpenseInput {
  amount: number | Prisma.Decimal;
  expenseCategory?: string | null;
  expenseAccountId?: string | null;
  costCenterId?: string | null;
  receiptNo?: string | null;
  supplierName?: string | null;
  receiptUrl?: string | null;
  description?: string | null;
  date?: Date | string;
}

export class PettyCashService {
  /**
   * ایجاد صندوق تنخواه‌گردان جدید برای کارخانه
   */
  static async createFund(input: CreateFundInput) {
    let companyId = input.companyId;
    if (!companyId) {
      const defaultCompany = await db.company.findFirst({
        where: { isDefault: true },
      });
      companyId = defaultCompany?.id || null;
    }

    const defaultAccount = await db.account.findUnique({
      where: { code: '110201' },
    });

    return await db.pettyCashFund.create({
      data: {
        companyId,
        code: input.code.trim(),
        title: input.title,
        holderName: input.holderName,
        holderPhone: input.holderPhone || null,
        limitAmount: new Prisma.Decimal(input.limitAmount),
        currentBalance: input.initialBalance
          ? new Prisma.Decimal(input.initialBalance)
          : new Prisma.Decimal(0),
        accountId: defaultAccount?.id || null,
        isActive: true,
      },
    });
  }

  /**
   * شارژ صندوق تنخواه‌گردان کارخانه از حساب بانکی همراه با صدور سند دوبل حسابداری
   * Dr: صندوق و تنخواه‌گردان کارخانه (۱۱۰۲۰۱)
   * Cr: موجودی نقد و بانک‌ها (۱۱۰۱۰۱)
   */
  static async fundPettyCash(
    fundId: string,
    bankAccountId: string,
    amountInput: number | Prisma.Decimal,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;
    const amount = new Prisma.Decimal(amountInput);

    if (amount.lte(0)) {
      throw new Error('مبلغ شارژ تنخواه باید بزرگتر از صفر باشد.');
    }

    const fund = await client.pettyCashFund.findUnique({
      where: { id: fundId },
    });
    if (!fund) throw new Error('صندوق تنخواه‌گردان یافت نشد.');

    const bank = await client.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bank) throw new Error('حساب بانکی مبدا یافت نشد.');

    // بررسی سقف مجاز تنخواه
    const newBalance = fund.currentBalance.add(amount);
    if (newBalance.gt(fund.limitAmount)) {
      throw new Error(
        `مجموع موجودی پس از شارژ (${newBalance.toNumber().toLocaleString('fa-IR')} تومان) فراتر از سقف مجاز تنخواه (${fund.limitAmount.toNumber().toLocaleString('fa-IR')} تومان) خواهد بود.`
      );
    }

    // ۱. افزایش موجودی صندوق
    await client.pettyCashFund.update({
      where: { id: fundId },
      data: { currentBalance: newBalance },
    });

    // ۲. ایجاد تراکنش شارژ تنخواه
    const tx = await client.pettyCashTransaction.create({
      data: {
        fundId,
        type: PettyCashTxType.FUNDING,
        amount,
        status: PettyCashStatus.APPROVED,
        description: `شارژ تنخواه از حساب ${bank.bankName} (${bank.accountNumber})`,
      },
    });

    // ۳. صدور سند دوبل حسابداری
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.PETTY_CASH_FUNDING,
        companyId
      );

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: صندوق و تنخواه‌گردان کارخانه (۱۱۰۲۰۱)
        {
          accountId: mapping.debitAccountId,
          detail1Type: 'PETTY_CASH',
          detail1Id: fund.id,
          debit: amount,
          credit: new Prisma.Decimal(0),
          description: `شارژ صندوق تنخواه ${fund.title} (${fund.code})`,
        },
        // بستانکار: موجودی نقد و بانک‌ها (۱۱۰۱۰۱)
        {
          accountId: mapping.creditAccountId,
          detail1Type: 'BANK',
          detail1Id: bank.id,
          debit: new Prisma.Decimal(0),
          credit: amount,
          description: `برداشت از حساب ${bank.bankName} بابت شارژ تنخواه ${fund.holderName}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند شارژ صندوق تنخواه‌گردان ${fund.title} به مبلغ ${amount.toNumber().toLocaleString('fa-IR')} تومان`,
          type: VoucherType.PAYMENT,
          referenceModule: 'PETTY_CASH_FUNDING',
          referenceId: tx.id,
          idempotencyKey: `PC-FUND-${tx.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.pettyCashTransaction.update({
        where: { id: tx.id },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting petty cash funding voucher:', err);
    }

    const freshTx = await client.pettyCashTransaction.findUnique({
      where: { id: tx.id },
    });
    const freshFund = await client.pettyCashFund.findUnique({
      where: { id: fundId },
    });

    return {
      transaction: freshTx || tx,
      fund: freshFund || fund,
    };
  }

  /**
   * ثبت هزینه تنخواه همراه با فاکتور/رسید، مرکز هزینه و کسر از مانده موجودی صندوق
   */
  static async recordExpense(
    fundId: string,
    input: RecordExpenseInput,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;
    const amount = new Prisma.Decimal(input.amount);

    if (amount.lte(0)) {
      throw new Error('مبلغ هزینه تنخواه باید بزرگتر از صفر باشد.');
    }

    const fund = await client.pettyCashFund.findUnique({
      where: { id: fundId },
    });
    if (!fund) throw new Error('صندوق تنخواه‌گردان یافت نشد.');

    // بررسی کفایت موجودی صندوق تنخواه
    if (fund.currentBalance.lt(amount)) {
      throw new Error(
        `موجودی صندوق تنخواه (${fund.currentBalance.toNumber().toLocaleString('fa-IR')} تومان) برای ثبت این هزینه (${amount.toNumber().toLocaleString('fa-IR')} تومان) کافی نیست (موجودی ناکافی).`
      );
    }

    // ۱. کسر از موجودی تنخواه
    await client.pettyCashFund.update({
      where: { id: fundId },
      data: {
        currentBalance: fund.currentBalance.sub(amount),
      },
    });

    // ۲. ثبت تراکنش هزینه
    return await client.pettyCashTransaction.create({
      data: {
        fundId,
        type: PettyCashTxType.EXPENSE,
        amount,
        date: input.date ? new Date(input.date) : new Date(),
        expenseCategory: input.expenseCategory || 'هزینه‌های جاری کارخانه',
        expenseAccountId: input.expenseAccountId || null,
        costCenterId: input.costCenterId || fund.costCenterId || null,
        receiptNo: input.receiptNo || null,
        supplierName: input.supplierName || null,
        receiptUrl: input.receiptUrl || null,
        status: PettyCashStatus.APPROVED,
        description: input.description || null,
      },
    });
  }

  /**
   * تسویه صورت‌وضعیت هزینه‌های تنخواه‌گردان و صدور سند تجمیعی هزینه در دفتر کل
   * Dr: هزینه‌های عمومی و اداری / تولیدی بر اساس مرکز هزینه (۶۱۰۱۰۱)
   * Cr: صندوق و تنخواه‌گردان کارخانه (۱۱۰۲۰۱)
   */
  static async settlePettyCash(
    fundId: string,
    transactionIds: string[],
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const fund = await client.pettyCashFund.findUnique({
      where: { id: fundId },
    });
    if (!fund) throw new Error('صندوق تنخواه یافت نشد.');

    // دریافت تراکنش‌های هزینه مورد نظر
    const expenses = await client.pettyCashTransaction.findMany({
      where: {
        id: { in: transactionIds },
        fundId,
        type: PettyCashTxType.EXPENSE,
        status: PettyCashStatus.APPROVED,
      },
    });

    if (expenses.length === 0) {
      throw new Error('هیچ تراکنش هزینه معتبری جهت تسویه یافت نشد.');
    }

    const totalExpense = expenses.reduce(
      (sum, e) => sum.add(e.amount),
      new Prisma.Decimal(0)
    );

    // ۱. صدور سند تجمیعی دوبل حسابداری
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.PETTY_CASH_SETTLEMENT,
        companyId
      );

      const entries: CreateJournalEntryInput[] = [];

      // آرتیکل‌های بدهکار هزینه‌ها تفکیک شده بر اساس مرکز هزینه
      for (const exp of expenses) {
        let accountId = exp.expenseAccountId || mapping.debitAccountId;
        entries.push({
          accountId,
          costCenterId: exp.costCenterId || null,
          debit: exp.amount,
          credit: new Prisma.Decimal(0),
          description: `هزینه تنخواه: ${exp.expenseCategory || ''} - ${exp.supplierName || ''} (${exp.receiptNo ? 'فاکتور ' + exp.receiptNo : exp.description || ''})`,
        });
      }

      // آرتیکل بستانکار: حساب تنخواه‌گردان (۱۱۰۲۰۱)
      entries.push({
        accountId: mapping.creditAccountId,
        detail1Type: 'PETTY_CASH',
        detail1Id: fund.id,
        debit: new Prisma.Decimal(0),
        credit: totalExpense,
        description: `تسویه صورت‌وضعیت هزینه‌های تنخواه‌گردان ${fund.title} (${expenses.length} فقره فاکتور)`,
      });

      const settlementBatchId = `PC-SETTLE-${fund.code}-${Date.now()}`;
      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند تسویه صورت‌وضعیت تنخواه‌گردان ${fund.title} به مبلغ کل ${totalExpense.toNumber().toLocaleString('fa-IR')} تومان`,
          type: VoucherType.PAYMENT,
          referenceModule: 'PETTY_CASH_SETTLEMENT',
          referenceId: settlementBatchId,
          idempotencyKey: settlementBatchId,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      // ۲. به‌روزرسانی وضعیت تراکنش‌ها به SETTLED
      await client.pettyCashTransaction.updateMany({
        where: { id: { in: expenses.map((e) => e.id) } },
        data: {
          status: PettyCashStatus.SETTLED,
          journalVoucherId: finalized.id,
        },
      });

      return {
        settledCount: expenses.length,
        updatedCount: expenses.length,
        totalExpense,
        voucher: finalized,
        voucherId: finalized.id,
      };
    } catch (err) {
      console.error('Error posting petty cash settlement voucher:', err);
      throw err;
    }
  }
}
