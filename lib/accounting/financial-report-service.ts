import db from '@/lib/db';
import { Prisma, VoucherStatus, AccountNature, AccountType } from '@prisma/client';

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  companyId?: string | null;
}

export class FinancialReportService {
  /**
   * دفتر روزنامه رسمی (General Journal)
   * فهرست ترتیبی اسناد حسابداری قطعی به ترتیب تاریخ و شماره سند با تفکیک آرتیکل‌ها
   */
  static async getGeneralJournal(params: ReportFilter & { skip?: number; take?: number }) {
    const where: Prisma.JournalVoucherWhereInput = {
      status: VoucherStatus.FINALIZED,
    };

    if (params.companyId) where.companyId = params.companyId;
    if (params.startDate || params.endDate) {
      where.voucherDate = {};
      if (params.startDate) where.voucherDate.gte = params.startDate;
      if (params.endDate) where.voucherDate.lte = params.endDate;
    }

    const [vouchers, total] = await Promise.all([
      db.journalVoucher.findMany({
        where,
        orderBy: [{ voucherDate: 'asc' }, { voucherNo: 'asc' }],
        skip: params.skip ?? 0,
        take: params.take ?? 100,
        include: {
          entries: {
            orderBy: { rowOrder: 'asc' },
            include: { account: true },
          },
        },
      }),
      db.journalVoucher.count({ where }),
    ]);

    let totalPeriodDebit = new Prisma.Decimal(0);
    let totalPeriodCredit = new Prisma.Decimal(0);

    for (const v of vouchers) {
      totalPeriodDebit = totalPeriodDebit.add(v.totalDebit);
      totalPeriodCredit = totalPeriodCredit.add(v.totalCredit);
    }

    return {
      vouchers,
      total,
      summary: {
        totalDebit: totalPeriodDebit,
        totalCredit: totalPeriodCredit,
        isBalanced: totalPeriodDebit.equals(totalPeriodCredit),
      },
    };
  }

  /**
   * دفتر کل و معین حساب (Account Ledger)
   * ریز تراکنش‌ها، گردش و مانده جاری لحظه‌ای یک حساب معین یا کل
   */
  static async getAccountLedger(accountCode: string, filter?: ReportFilter) {
    const account = await db.account.findUnique({
      where: { code: accountCode },
    });

    if (!account) {
      throw new Error(`حساب با کد ${accountCode} در جدول کدینگ یافت نشد.`);
    }

    // ۱. محاسبه مانده ابتدای دوره (قبل از startDate)
    let openingBalance = new Prisma.Decimal(0);
    if (filter?.startDate) {
      const priorEntries = await db.journalEntry.findMany({
        where: {
          accountId: account.id,
          voucher: {
            status: VoucherStatus.FINALIZED,
            voucherDate: { lt: filter.startDate },
            ...(filter.companyId ? { companyId: filter.companyId } : {}),
          },
        },
        select: { debit: true, credit: true },
      });

      for (const e of priorEntries) {
        if (account.nature === AccountNature.DEBIT) {
          openingBalance = openingBalance.add(e.debit).sub(e.credit);
        } else {
          openingBalance = openingBalance.add(e.credit).sub(e.debit);
        }
      }
    }

    // ۲. استخراج گردش طی دوره
    const entriesWhere: Prisma.JournalEntryWhereInput = {
      accountId: account.id,
      voucher: {
        status: VoucherStatus.FINALIZED,
        ...(filter?.companyId ? { companyId: filter.companyId } : {}),
      },
    };

    if (filter?.startDate || filter?.endDate) {
      entriesWhere.voucher!.voucherDate = {};
      if (filter.startDate) entriesWhere.voucher!.voucherDate.gte = filter.startDate;
      if (filter.endDate) entriesWhere.voucher!.voucherDate.lte = filter.endDate;
    }

    const entries = await db.journalEntry.findMany({
      where: entriesWhere,
      orderBy: [
        { voucher: { voucherDate: 'asc' } },
        { voucher: { voucherNo: 'asc' } },
        { rowOrder: 'asc' },
      ],
      include: {
        voucher: {
          select: {
            id: true,
            voucherNo: true,
            voucherDate: true,
            type: true,
            description: true,
            referenceModule: true,
            referenceId: true,
          },
        },
      },
    });

    let currentBalance = openingBalance;
    let totalDebitTurnover = new Prisma.Decimal(0);
    let totalCreditTurnover = new Prisma.Decimal(0);

    const rows = entries.map((entry) => {
      totalDebitTurnover = totalDebitTurnover.add(entry.debit);
      totalCreditTurnover = totalCreditTurnover.add(entry.credit);

      if (account.nature === AccountNature.DEBIT) {
        currentBalance = currentBalance.add(entry.debit).sub(entry.credit);
      } else {
        currentBalance = currentBalance.add(entry.credit).sub(entry.debit);
      }

      const diagnosis = currentBalance.gt(0)
        ? account.nature === AccountNature.DEBIT ? 'بدهکار' : 'بستانکار'
        : currentBalance.lt(0)
        ? account.nature === AccountNature.DEBIT ? 'بستانکار' : 'بدهکار'
        : 'تسویه';

      return {
        id: entry.id,
        voucherId: entry.voucher.id,
        voucherNo: entry.voucher.voucherNo,
        voucherDate: entry.voucher.voucherDate,
        voucherType: entry.voucher.type,
        voucherDescription: entry.voucher.description,
        entryDescription: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance: currentBalance.abs(),
        diagnosis,
      };
    });

    const finalDiagnosis = currentBalance.gt(0)
      ? account.nature === AccountNature.DEBIT ? 'بدهکار' : 'بستانکار'
      : currentBalance.lt(0)
      ? account.nature === AccountNature.DEBIT ? 'بستانکار' : 'بدهکار'
      : 'تسویه';

    return {
      account,
      openingBalance: openingBalance.abs(),
      openingDiagnosis: openingBalance.gt(0)
        ? account.nature === AccountNature.DEBIT ? 'بدهکار' : 'بستانکار'
        : 'تسویه',
      rows,
      summary: {
        totalDebitTurnover,
        totalCreditTurnover,
        endingBalance: currentBalance.abs(),
        endingDiagnosis: finalDiagnosis,
      },
    };
  }

  /**
   * تراز آزمایشی ۴ و ۶ ستونی (Trial Balance)
   * محاسبه سرجمع گردش و مانده کلیه حساب‌ها در سطوح کل (۲) و معین (۳) با تضمین تراز دوبل
   */
  static async getTrialBalance(level: number = 3, filter?: ReportFilter) {
    const entriesWhere: Prisma.JournalEntryWhereInput = {
      voucher: {
        status: VoucherStatus.FINALIZED,
        ...(filter?.companyId ? { companyId: filter.companyId } : {}),
        ...(filter?.startDate || filter?.endDate
          ? {
              voucherDate: {
                ...(filter.startDate ? { gte: filter.startDate } : {}),
                ...(filter.endDate ? { lte: filter.endDate } : {}),
              },
            }
          : {}),
      },
    };

    // ۱. واکشی کلیه حساب‌ها برای دسترسی به ساختار درختی
    const allAccounts = await db.account.findMany({
      where: { isActive: true },
      include: { parent: true },
    });

    // ۲. واکشی اتمیک کلیه آرتیکل‌ها در یک کوئری واحد و غیرقابل تداخل
    const entries = await db.journalEntry.findMany({
      where: entriesWhere,
      include: { account: true },
    });

    const accountMap = new Map<string, {
      code: string;
      name: string;
      level: number;
      nature: AccountNature;
      accountType: AccountType;
      debitTurnover: Prisma.Decimal;
      creditTurnover: Prisma.Decimal;
    }>();

    for (const e of entries) {
      let targetAccount = e.account;
      if (level === 2 && e.account.level === 3 && e.account.parentId) {
        const parentAcc = allAccounts.find((a) => a.id === e.account.parentId);
        if (parentAcc) {
          targetAccount = parentAcc as any;
        }
      }

      if (level === 2 && targetAccount.level !== 2) continue;
      if (level === 3 && targetAccount.level !== 3) continue;

      const existing = accountMap.get(targetAccount.code) || {
        code: targetAccount.code,
        name: targetAccount.name,
        level: targetAccount.level,
        nature: targetAccount.nature,
        accountType: targetAccount.accountType,
        debitTurnover: new Prisma.Decimal(0),
        creditTurnover: new Prisma.Decimal(0),
      };

      existing.debitTurnover = existing.debitTurnover.add(e.debit);
      existing.creditTurnover = existing.creditTurnover.add(e.credit);
      accountMap.set(targetAccount.code, existing);
    }

    const resultRows: any[] = [];
    let sumDebitTurnover = new Prisma.Decimal(0);
    let sumCreditTurnover = new Prisma.Decimal(0);
    let sumDebitBalance = new Prisma.Decimal(0);
    let sumCreditBalance = new Prisma.Decimal(0);

    const sortedAccounts = Array.from(accountMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    for (const acc of sortedAccounts) {
      let debitBal = new Prisma.Decimal(0);
      let creditBal = new Prisma.Decimal(0);

      if (acc.debitTurnover.gt(acc.creditTurnover)) {
        debitBal = acc.debitTurnover.sub(acc.creditTurnover);
      } else if (acc.creditTurnover.gt(acc.debitTurnover)) {
        creditBal = acc.creditTurnover.sub(acc.debitTurnover);
      }

      if (acc.debitTurnover.gt(0) || acc.creditTurnover.gt(0)) {
        resultRows.push({
          code: acc.code,
          name: acc.name,
          level: acc.level,
          nature: acc.nature,
          accountType: acc.accountType,
          debitTurnover: acc.debitTurnover,
          creditTurnover: acc.creditTurnover,
          debitBalance: debitBal,
          creditBalance: creditBal,
        });

        sumDebitTurnover = sumDebitTurnover.add(acc.debitTurnover);
        sumCreditTurnover = sumCreditTurnover.add(acc.creditTurnover);
        sumDebitBalance = sumDebitBalance.add(debitBal);
        sumCreditBalance = sumCreditBalance.add(creditBal);
      }
    }

    return {
      rows: resultRows,
      totals: {
        sumDebitTurnover,
        sumCreditTurnover,
        sumDebitBalance,
        sumCreditBalance,
        isTurnoverBalanced: sumDebitTurnover.equals(sumCreditTurnover),
        isBalanceBalanced: sumDebitBalance.equals(sumCreditBalance),
      },
    };
  }

  /**
   * صورت سود و زیان دوره‌ای (Income Statement)
   * درآمدها - بهای تمام‌شده کالای فروش‌رفته = سود ناخالص
   * سود ناخالص - هزینه‌های عمومی و اداری = سود خالص عملیاتی
   */
  static async getIncomeStatement(filter?: ReportFilter) {
    const whereEntries: Prisma.JournalEntryWhereInput = {
      voucher: {
        status: VoucherStatus.FINALIZED,
        ...(filter?.companyId ? { companyId: filter.companyId } : {}),
        ...(filter?.startDate || filter?.endDate
          ? {
              voucherDate: {
                ...(filter.startDate ? { gte: filter.startDate } : {}),
                ...(filter.endDate ? { lte: filter.endDate } : {}),
              },
            }
          : {}),
      },
    };

    // ۱. درآمدها (کدهای ۴ - ماهیت بستانکار)
    const revenueEntries = await db.journalEntry.findMany({
      where: {
        ...whereEntries,
        account: { code: { startsWith: '4' } },
      },
      include: { account: true },
    });

    let totalRevenue = new Prisma.Decimal(0);
    const revenueItemsMap = new Map<string, { code: string; name: string; amount: Prisma.Decimal }>();

    for (const e of revenueEntries) {
      // در حساب‌های درآمدی: بستانکار منهای بدهکار
      const net = e.credit.sub(e.debit);
      totalRevenue = totalRevenue.add(net);

      const existing = revenueItemsMap.get(e.account.code) || {
        code: e.account.code,
        name: e.account.name,
        amount: new Prisma.Decimal(0),
      };
      existing.amount = existing.amount.add(net);
      revenueItemsMap.set(e.account.code, existing);
    }

    // ۲. بهای تمام‌شده کالای فروش‌رفته (کدهای ۵ - ماهیت بدهکار)
    const cogsEntries = await db.journalEntry.findMany({
      where: {
        ...whereEntries,
        account: { code: { startsWith: '5' } },
      },
      include: { account: true },
    });

    let totalCOGS = new Prisma.Decimal(0);
    const cogsItemsMap = new Map<string, { code: string; name: string; amount: Prisma.Decimal }>();

    for (const e of cogsEntries) {
      const net = e.debit.sub(e.credit);
      totalCOGS = totalCOGS.add(net);

      const existing = cogsItemsMap.get(e.account.code) || {
        code: e.account.code,
        name: e.account.name,
        amount: new Prisma.Decimal(0),
      };
      existing.amount = existing.amount.add(net);
      cogsItemsMap.set(e.account.code, existing);
    }

    // سود ناخالص (Gross Profit)
    const grossProfit = totalRevenue.sub(totalCOGS);

    // ۳. هزینه‌های عمومی، اداری و تشکیلاتی (کدهای ۶ - ماهیت بدهکار)
    const expenseEntries = await db.journalEntry.findMany({
      where: {
        ...whereEntries,
        account: { code: { startsWith: '6' } },
      },
      include: { account: true },
    });

    let totalExpenses = new Prisma.Decimal(0);
    const expenseItemsMap = new Map<string, { code: string; name: string; amount: Prisma.Decimal }>();

    for (const e of expenseEntries) {
      const net = e.debit.sub(e.credit);
      totalExpenses = totalExpenses.add(net);

      const existing = expenseItemsMap.get(e.account.code) || {
        code: e.account.code,
        name: e.account.name,
        amount: new Prisma.Decimal(0),
      };
      existing.amount = existing.amount.add(net);
      expenseItemsMap.set(e.account.code, existing);
    }

    // سود خالص عملیاتی (Net Operating Income)
    const netOperatingIncome = grossProfit.sub(totalExpenses);

    return {
      revenues: {
        items: Array.from(revenueItemsMap.values()),
        total: totalRevenue,
      },
      cogs: {
        items: Array.from(cogsItemsMap.values()),
        total: totalCOGS,
      },
      grossProfit,
      expenses: {
        items: Array.from(expenseItemsMap.values()),
        total: totalExpenses,
      },
      netOperatingIncome,
    };
  }

  /**
   * ترازنامه و صورت وضعیت مالی (Balance Sheet)
   * معادله بنیادی حسابداری: دارایی‌ها = بدهی‌ها + حقوق صاحبان سهام
   */
  static async getBalanceSheet(asOfDate?: Date, companyId?: string | null) {
    const targetDate = asOfDate || new Date();

    const entriesWhere: Prisma.JournalEntryWhereInput = {
      voucher: {
        status: VoucherStatus.FINALIZED,
        voucherDate: { lte: targetDate },
        ...(companyId ? { companyId } : {}),
      },
    };

    const entries = await db.journalEntry.findMany({
      where: entriesWhere,
      include: { account: true },
    });

    const assetMap = new Map<string, { code: string; name: string; balance: Prisma.Decimal }>();
    const liabilityMap = new Map<string, { code: string; name: string; balance: Prisma.Decimal }>();
    const equityMap = new Map<string, { code: string; name: string; balance: Prisma.Decimal }>();

    let totalAssets = new Prisma.Decimal(0);
    let totalLiabilities = new Prisma.Decimal(0);
    let recordedEquity = new Prisma.Decimal(0);
    let totalRevenues = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);

    for (const e of entries) {
      const code = e.account.code;
      const firstDigit = code[0];

      if (firstDigit === '1') {
        // دارایی‌ها: بدهکار منهای بستانکار
        const net = e.debit.sub(e.credit);
        totalAssets = totalAssets.add(net);
        const item = assetMap.get(code) || { code, name: e.account.name, balance: new Prisma.Decimal(0) };
        item.balance = item.balance.add(net);
        assetMap.set(code, item);
      } else if (firstDigit === '2') {
        // بدهی‌ها: بستانکار منهای بدهکار
        const net = e.credit.sub(e.debit);
        totalLiabilities = totalLiabilities.add(net);
        const item = liabilityMap.get(code) || { code, name: e.account.name, balance: new Prisma.Decimal(0) };
        item.balance = item.balance.add(net);
        liabilityMap.set(code, item);
      } else if (firstDigit === '3') {
        // حقوق صاحبان سهام و تراز افتتاحیه: بستانکار منهای بدهکار
        const net = e.credit.sub(e.debit);
        recordedEquity = recordedEquity.add(net);
        const item = equityMap.get(code) || { code, name: e.account.name, balance: new Prisma.Decimal(0) };
        item.balance = item.balance.add(net);
        equityMap.set(code, item);
      } else if (firstDigit === '4') {
        // درآمدها: بستانکار منهای بدهکار
        const net = e.credit.sub(e.debit);
        totalRevenues = totalRevenues.add(net);
      } else if (firstDigit === '5' || firstDigit === '6') {
        // بهای تمام‌شده و هزینه‌ها: بدهکار منهای بستانکار
        const net = e.debit.sub(e.credit);
        totalExpenses = totalExpenses.add(net);
      }
    }

    // سود یا زیان خالص دوره جاری تا تاریخ ترازنامه
    const currentPeriodProfit = totalRevenues.sub(totalExpenses);

    if (!currentPeriodProfit.isZero()) {
      equityMap.set('330101', {
        code: '330101',
        name: 'سود (زیان) خالص دوره جاری',
        balance: currentPeriodProfit,
      });
    }

    const totalEquity = recordedEquity.add(currentPeriodProfit);
    const totalLiabilitiesAndEquity = totalLiabilities.add(totalEquity);

    return {
      asOfDate: targetDate,
      assets: {
        items: Array.from(assetMap.values()).filter((a) => !a.balance.isZero()),
        total: totalAssets,
      },
      liabilities: {
        items: Array.from(liabilityMap.values()).filter((l) => !l.balance.isZero()),
        total: totalLiabilities,
      },
      equity: {
        items: Array.from(equityMap.values()).filter((eq) => !eq.balance.isZero()),
        total: totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: totalAssets.equals(totalLiabilitiesAndEquity),
    };
  }
}
