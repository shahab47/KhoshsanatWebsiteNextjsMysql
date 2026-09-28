import db from '@/lib/db';
import {
  Prisma,
  VoucherStatus,
  VoucherType,
  PeriodStatus,
  AuditAction,
} from '@prisma/client';
import { SequenceService } from './sequence-service';

export interface CreateJournalEntryInput {
  accountId: string;
  costCenterId?: string | null;
  detail1Type?: string | null; // CUSTOMER, SUPPLIER, EMPLOYEE, BANK_ACCOUNT
  detail1Id?: string | null;   // شناسه تفصیلی ۱
  detail2Type?: string | null; // COST_CENTER, PROJECT, WORK_ORDER
  detail2Id?: string | null;   // شناسه تفصیلی ۲
  debit: number | string | Prisma.Decimal;
  credit: number | string | Prisma.Decimal;
  description?: string | null;
}

export interface CreateJournalVoucherInput {
  voucherDate: Date;
  description: string;
  type?: VoucherType;
  referenceModule?: string | null; // SALES, INVOICE, PAYMENT, RECEIPT, WAREHOUSE, PAYROLL, SCALE
  referenceId?: string | null;     // Lineage ID
  idempotencyKey?: string | null;  // کلید ضد تکرار سند
  companyId?: string | null;
  branchId?: string | null;
  fiscalYearId?: string | null;
  periodId?: string | null;
  createdById?: string | null;
  entries: CreateJournalEntryInput[];
}

/**
 * هسته مدیریت اسناد حسابداری دوبل، دفاتر قانونی و تراز آزمایشی
 */
export class VoucherService {
  /**
   * ثبت سند حسابداری جدید با تضمین اصل توازن بدهکار/بستانکار، بررسی قفل دوره و کلید یکتایی
   */
  static async createVoucher(
    input: CreateJournalVoucherInput,
    externalTx?: Prisma.TransactionClient
  ) {
    if (!input.entries || input.entries.length < 2) {
      throw new Error('یک سند حسابداری دوبل باید حداقل شامل دو ردیف (آرتیکل) باشد.');
    }

    // ۱. بررسی Idempotency Key برای جلوگیری از ثبت تکراری رویداد مالی
    if (input.idempotencyKey) {
      const existing = await (externalTx || db).journalVoucher.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          entries: {
            include: { account: true },
            orderBy: { rowOrder: 'asc' },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    // ۲. بررسی باز بودن دوره و سال مالی (Accounting Period Lock Check)
    if (input.periodId) {
      const period = await (externalTx || db).fiscalPeriod.findUnique({
        where: { id: input.periodId },
      });
      if (period && period.status !== PeriodStatus.OPEN) {
        throw new Error(
          `دوره مالی "${period.title}" در وضعیت ${period.status} (بسته) قرار دارد و امکان ثبت سند عادی در آن وجود ندارد.`
        );
      }
    }

    // ۳. اعتبارسنجی ریاضی آرتیکل‌ها
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const formattedEntries = input.entries.map((entry, index) => {
      const debit = new Prisma.Decimal(entry.debit || 0);
      const credit = new Prisma.Decimal(entry.credit || 0);

      if (debit.isNegative() || credit.isNegative()) {
        throw new Error(`ردیف ${index + 1}: ارقام بدهکار و بستانکار نمی‌توانند منفی باشند.`);
      }

      if (debit.gt(0) && credit.gt(0)) {
        throw new Error(
          `ردیف ${index + 1}: یک ردیف سند نمی‌تواند همزمان دارای بدهکار و بستانکار باشد (XOR Invariant).`
        );
      }

      if (debit.isZero() && credit.isZero()) {
        throw new Error(`ردیف ${index + 1}: مبلغ ردیف سند نمی‌تواند صفر باشد.`);
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        accountId: entry.accountId,
        costCenterId: entry.costCenterId || null,
        detail1Type: entry.detail1Type || null,
        detail1Id: entry.detail1Id || null,
        detail2Type: entry.detail2Type || null,
        detail2Id: entry.detail2Id || null,
        debit,
        credit,
        description: entry.description || input.description,
        rowOrder: index + 1,
      };
    });

    // ۴. بررسی توازن سند (Sum Debit === Sum Credit)
    if (!totalDebit.equals(totalCredit)) {
      const diff = totalDebit.sub(totalCredit).abs();
      throw new Error(
        `سند حسابداری ناتراز است! جمع بدهکار: ${totalDebit.toString()}، جمع بستانکار: ${totalCredit.toString()}، اختلاف: ${diff.toString()}`
      );
    }

    const executeLogic = async (tx: Prisma.TransactionClient) => {
      // دریافت شماره سند ترتیبی با توالی اتمیک و Concurrency-safe
      const { rawNumber } = await SequenceService.nextNumber(
        'VOUCHER',
        input.companyId,
        tx
      );

      const voucher = await tx.journalVoucher.create({
        data: {
          voucherNo: rawNumber,
          voucherDate: input.voucherDate,
          type: input.type || VoucherType.GENERAL,
          description: input.description,
          status: VoucherStatus.DRAFT,
          referenceModule: input.referenceModule,
          referenceId: input.referenceId,
          idempotencyKey: input.idempotencyKey,
          companyId: input.companyId,
          branchId: input.branchId,
          fiscalYearId: input.fiscalYearId,
          periodId: input.periodId,
          createdById: input.createdById,
          totalDebit,
          totalCredit,
          entries: {
            create: formattedEntries,
          },
        },
        include: {
          entries: {
            include: { account: true, costCenter: true },
            orderBy: { rowOrder: 'asc' },
          },
        },
      });

      // ثبت لاگ ممیزی
      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          action: AuditAction.CREATE,
          entity: 'JournalVoucher',
          entityId: voucher.id,
          newValue: {
            voucherNo: voucher.voucherNo,
            totalDebit: totalDebit.toString(),
            type: voucher.type,
            referenceModule: voucher.referenceModule,
          },
          reason: `صدور سند حسابداری شماره ${voucher.voucherNo}`,
        },
      });

      return voucher;
    };

    if (externalTx) {
      return await executeLogic(externalTx);
    } else {
      return await db.$transaction(async (tx) => {
        return await executeLogic(tx);
      });
    }
  }

  /**
   * قطعی‌سازی و قفل سند حسابداری (Posting Engine)
   */
  static async finalizeVoucher(
    voucherId: string,
    postedById?: string | null,
    externalTx?: Prisma.TransactionClient
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const voucher = await tx.journalVoucher.findUnique({
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

      const updated = await tx.journalVoucher.update({
        where: { id: voucherId },
        data: {
          status: VoucherStatus.FINALIZED,
          postedById: postedById || null,
          postedAt: new Date(),
        },
        include: { entries: true },
      });

      await tx.auditLog.create({
        data: {
          userId: postedById,
          action: AuditAction.POST,
          entity: 'JournalVoucher',
          entityId: voucherId,
          newValue: { status: VoucherStatus.FINALIZED, voucherNo: voucher.voucherNo },
          reason: `قطعی‌سازی و قفل سند حسابداری شماره ${voucher.voucherNo}`,
        },
      });

      return updated;
    };

    if (externalTx) {
      return await run(externalTx);
    } else {
      return await db.$transaction(run);
    }
  }

  /**
   * برگشت و ابطال سند قطعی (Reversal Voucher Engine)
   * طبق اصل ۳ معماری: سند قطعی هرگز پاک یا ادیت نمی‌شود؛ اصلاح تنها از طریق سند عکس انجام می‌شود.
   */
  static async reverseVoucher(params: {
    voucherId: string;
    reason: string;
    createdById?: string | null;
  }) {
    return await db.$transaction(async (tx) => {
      const originalVoucher = await tx.journalVoucher.findUnique({
        where: { id: params.voucherId },
        include: { entries: true },
      });

      if (!originalVoucher) {
        throw new Error('سند مبدا جهت برگشت یافت نشد.');
      }

      if (originalVoucher.status !== VoucherStatus.FINALIZED) {
        throw new Error('فقط اسناد قطعی‌شده امکان صدور سند برگشت (Reversal) دارند.');
      }

      // بررسی اینکه قبلا برگشت نخورده باشد
      const existingReversal = await tx.journalVoucher.findFirst({
        where: { reversalOfId: params.voucherId },
      });
      if (existingReversal) {
        throw new Error('این سند قبلاً برگشت خورده است و نمی‌تواند مجدداً معکوس شود.');
      }

      // تولید آرتیکل‌های معکوس: جای بدهکار و بستانکار دقیقاً جابجا می‌شود
      const reversedEntries: CreateJournalEntryInput[] = originalVoucher.entries.map((entry) => ({
        accountId: entry.accountId,
        costCenterId: entry.costCenterId,
        detail1Type: entry.detail1Type,
        detail1Id: entry.detail1Id,
        detail2Type: entry.detail2Type,
        detail2Id: entry.detail2Id,
        debit: entry.credit,  // بدهکار قبلی بستانکار می‌شود
        credit: entry.debit,  // بستانکار قبلی بدهکار می‌شود
        description: `برگشت آرتیکل سند ${originalVoucher.voucherNo}: ${entry.description || ''}`,
      }));

      const reversalVoucher = await this.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند معکوس/برگشت سند شماره ${originalVoucher.voucherNo} - علت: ${params.reason}`,
          type: VoucherType.REVERSAL,
          referenceModule: originalVoucher.referenceModule,
          referenceId: originalVoucher.referenceId,
          companyId: originalVoucher.companyId,
          branchId: originalVoucher.branchId,
          fiscalYearId: originalVoucher.fiscalYearId,
          periodId: originalVoucher.periodId,
          createdById: params.createdById,
          entries: reversedEntries,
        },
        tx
      );

      // پیوند دادن سند معکوس با سند اصلی و قطعی‌سازی آن
      const finalizedReversal = await tx.journalVoucher.update({
        where: { id: reversalVoucher.id },
        data: {
          reversalOfId: originalVoucher.id,
          status: VoucherStatus.FINALIZED,
          postedById: params.createdById,
          postedAt: new Date(),
        },
        include: {
          entries: {
            include: { account: true, costCenter: true },
            orderBy: { rowOrder: 'asc' },
          },
        },
      });

      // ثبت لاگ ممیزی
      await tx.auditLog.create({
        data: {
          userId: params.createdById,
          action: AuditAction.REVERSE,
          entity: 'JournalVoucher',
          entityId: originalVoucher.id,
          newValue: { reversalVoucherId: finalizedReversal.id, reversalVoucherNo: finalizedReversal.voucherNo },
          reason: params.reason,
        },
      });

      return finalizedReversal;
    });
  }

  /**
   * گزارش تراز آزمایشی چهار ستونی
   */
  static async getTrialBalance(params?: {
    startDate?: Date;
    endDate?: Date;
    level?: number;
    companyId?: string;
  }) {
    const whereCondition: Prisma.JournalVoucherWhereInput = {
      status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
      ...(params?.companyId ? { companyId: params.companyId } : {}),
    };

    if (params?.startDate || params?.endDate) {
      whereCondition.voucherDate = {};
      if (params.startDate) whereCondition.voucherDate.gte = params.startDate;
      if (params.endDate) whereCondition.voucherDate.lte = params.endDate;
    }

    const accounts = await db.account.findMany({
      where: {
        ...(params?.level ? { level: params.level } : {}),
        ...(params?.companyId ? { OR: [{ companyId: params.companyId }, { companyId: null }] } : {}),
      },
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
        accountType: acc.accountType,
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
        isBalanced:
          grandDebitTurnover.equals(grandCreditTurnover) &&
          grandDebitBalance.equals(grandCreditBalance),
      },
    };
  }

  /**
   * استخراج دفتر روزنامه رسمی به ترتیب شماره سند و تاریخ
   */
  static async getJournalBook(params?: {
    startDate?: Date;
    endDate?: Date;
    companyId?: string;
  }) {
    const whereCondition: Prisma.JournalVoucherWhereInput = {
      status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
      ...(params?.companyId ? { companyId: params.companyId } : {}),
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
            costCenter: true,
          },
          orderBy: { rowOrder: 'asc' },
        },
      },
    });
  }

  /**
   * استخراج دفتر معین با فیلتر شناسه حساب و تفصیلی اشخاص/پروژه
   */
  static async getSubsidiaryLedger(params: {
    accountId: string;
    detail1Id?: string | null;
    startDate?: Date;
    endDate?: Date;
  }) {
    const voucherWhere: Prisma.JournalVoucherWhereInput = {
      status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
    };

    if (params.startDate || params.endDate) {
      voucherWhere.voucherDate = {};
      if (params.startDate) voucherWhere.voucherDate.gte = params.startDate;
      if (params.endDate) voucherWhere.voucherDate.lte = params.endDate;
    }

    const entries = await db.journalEntry.findMany({
      where: {
        accountId: params.accountId,
        ...(params.detail1Id ? { detail1Id: params.detail1Id } : {}),
        voucher: voucherWhere,
      },
      include: {
        voucher: true,
        account: true,
      },
      orderBy: [
        { voucher: { voucherDate: 'asc' } },
        { voucher: { voucherNo: 'asc' } },
        { rowOrder: 'asc' },
      ],
    });

    let runningBalance = new Prisma.Decimal(0);
    const enrichedEntries = entries.map((e) => {
      runningBalance = runningBalance.add(e.debit).sub(e.credit);
      return {
        ...e,
        runningBalance,
      };
    });

    return {
      entries: enrichedEntries,
      finalBalance: runningBalance,
    };
  }
}
