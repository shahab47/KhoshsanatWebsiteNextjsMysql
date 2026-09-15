import db from '@/lib/db';
import { Prisma, VoucherStatus } from '@prisma/client';

export interface CreateJournalEntryInput {
  accountId: string;
  detail1Id?: string | null;
  detail2Id?: string | null;
  debit: number | string | Prisma.Decimal;
  credit: number | string | Prisma.Decimal;
  description?: string | null;
}

export interface CreateJournalVoucherInput {
  voucherDate: Date;
  description: string;
  referenceModule?: string | null;
  referenceId?: string | null;
  createdById?: string | null;
  entries: CreateJournalEntryInput[];
}

/**
 * سرویس مدیریت اسناد حسابداری دوبل، دفاتر قانونی و تراز آزمایشی
 */
export class VoucherService {
  /**
   * ثبت سند حسابداری جدید با تضمین اصل توازن بدهکار و بستانکار
   */
  static async createVoucher(input: CreateJournalVoucherInput) {
    if (!input.entries || input.entries.length < 2) {
      throw new Error('یک سند حسابداری دوبل باید حداقل شامل دو ردیف (آرتیکل) باشد.');
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const formattedEntries = input.entries.map((entry, index) => {
      const debit = new Prisma.Decimal(entry.debit || 0);
      const credit = new Prisma.Decimal(entry.credit || 0);

      if (debit.isNegative() || credit.isNegative()) {
        throw new Error(`ردیف ${index + 1}: ارقام بدهکار و بستانکار نمی‌توانند منفی باشند.`);
      }

      if (debit.gt(0) && credit.gt(0)) {
        throw new Error(`ردیف ${index + 1}: یک ردیف سند نمی‌تواند همزمان دارای بدهکار و بستانکار باشد.`);
      }

      if (debit.isZero() && credit.isZero()) {
        throw new Error(`ردیف ${index + 1}: مبلغ ردیف سند نمی‌تواند صفر باشد.`);
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        accountId: entry.accountId,
        detail1Id: entry.detail1Id || null,
        detail2Id: entry.detail2Id || null,
        debit,
        credit,
        description: entry.description || input.description,
        rowOrder: index + 1,
      };
    });

    // بررسی تراز بودن سند (Debit === Credit)
    if (!totalDebit.equals(totalCredit)) {
      const diff = totalDebit.sub(totalCredit).abs();
      throw new Error(
        `سند حسابداری ناتراز است! جمع بدهکار: ${totalDebit.toString()}، جمع بستانکار: ${totalCredit.toString()}، اختلاف: ${diff.toString()}`
      );
    }

    return await db.$transaction(async (tx) => {
      // استخراج آخرین شماره سند تصاعدی
      const lastVoucher = await tx.journalVoucher.findFirst({
        orderBy: { voucherNo: 'desc' },
        select: { voucherNo: true },
      });

      const nextVoucherNo = (lastVoucher?.voucherNo ?? 0) + 1;

      return await tx.journalVoucher.create({
        data: {
          voucherNo: nextVoucherNo,
          voucherDate: input.voucherDate,
          description: input.description,
          status: VoucherStatus.DRAFT,
          referenceModule: input.referenceModule,
          referenceId: input.referenceId,
          createdById: input.createdById,
          entries: {
            create: formattedEntries,
          },
        },
        include: {
          entries: {
            include: {
              account: true,
            },
            orderBy: { rowOrder: 'asc' },
          },
        },
      });
    });
  }

  /**
   * قطعی‌سازی و قفل سند حسابداری
   */
  static async finalizeVoucher(voucherId: string) {
    const voucher = await db.journalVoucher.findUnique({
      where: { id: voucherId },
      include: { entries: true },
    });

    if (!voucher) {
      throw new Error('سند حسابداری مورد نظر یافت نشد.');
    }

    if (voucher.status === VoucherStatus.FINALIZED) {
      throw new Error('این سند قبلاً قطعی و قفل شده است.');
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const entry of voucher.entries) {
      totalDebit = totalDebit.add(entry.debit);
      totalCredit = totalCredit.add(entry.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error('سند ناتراز امکان قطعی‌سازی ندارد.');
    }

    return await db.journalVoucher.update({
      where: { id: voucherId },
      data: { status: VoucherStatus.FINALIZED },
      include: { entries: true },
    });
  }

  /**
   * گزارش تراز آزمایشی چهار ستونی
   */
  static async getTrialBalance(params?: { startDate?: Date; endDate?: Date; level?: number }) {
    const whereCondition: Prisma.JournalVoucherWhereInput = {
      status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
    };

    if (params?.startDate || params?.endDate) {
      whereCondition.voucherDate = {};
      if (params.startDate) whereCondition.voucherDate.gte = params.startDate;
      if (params.endDate) whereCondition.voucherDate.lte = params.endDate;
    }

    const accounts = await db.account.findMany({
      where: params?.level ? { level: params.level } : undefined,
      orderBy: { code: 'asc' },
      include: {
        journalEntries: {
          where: {
            voucher: whereCondition,
          },
        },
      },
    });

    let grandDebitTurnover = new Prisma.Decimal(0);
    let grandCreditTurnover = new Prisma.Decimal(0);
    let grandDebitBalance = new Prisma.Decimal(0);
    let grandCreditBalance = new Prisma.Decimal(0);

    const rows = accounts.map((acc) => {
      let debitTurnover = new Prisma.Decimal(0);
      let creditTurnover = new Prisma.Decimal(0);

      for (const entry of acc.journalEntries) {
        debitTurnover = debitTurnover.add(entry.debit);
        creditTurnover = creditTurnover.add(entry.credit);
      }

      grandDebitTurnover = grandDebitTurnover.add(debitTurnover);
      grandCreditTurnover = grandCreditTurnover.add(creditTurnover);

      let debitBalance = new Prisma.Decimal(0);
      let creditBalance = new Prisma.Decimal(0);

      if (debitTurnover.gt(creditTurnover)) {
        debitBalance = debitTurnover.sub(creditTurnover);
        grandDebitBalance = grandDebitBalance.add(debitBalance);
      } else if (creditTurnover.gt(debitTurnover)) {
        creditBalance = creditTurnover.sub(debitTurnover);
        grandCreditBalance = grandCreditBalance.add(creditBalance);
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        level: acc.level,
        nature: acc.nature,
        debitTurnover,
        creditTurnover,
        debitBalance,
        creditBalance,
      };
    });

    return {
      rows,
      totals: {
        grandDebitTurnover,
        grandCreditTurnover,
        grandDebitBalance,
        grandCreditBalance,
        isBalanced: grandDebitTurnover.equals(grandCreditTurnover) && grandDebitBalance.equals(grandCreditBalance),
      },
    };
  }

  /**
   * استخراج دفتر روزنامه رسمی به ترتیب شماره سند و تاریخ
   */
  static async getJournalBook(params?: { startDate?: Date; endDate?: Date }) {
    const whereCondition: Prisma.JournalVoucherWhereInput = {
      status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
    };

    if (params?.startDate || params?.endDate) {
      whereCondition.voucherDate = {};
      if (params.startDate) whereCondition.voucherDate.gte = params.startDate;
      if (params.endDate) whereCondition.voucherDate.lte = params.endDate;
    }

    return await db.journalVoucher.findMany({
      where: whereCondition,
      orderBy: [{ voucherDate: 'asc' }, { voucherNo: 'asc' }],
      include: {
        entries: {
          include: {
            account: true,
          },
          orderBy: { rowOrder: 'asc' },
        },
      },
    });
  }
}
