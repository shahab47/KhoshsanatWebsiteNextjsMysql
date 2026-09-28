import db from '@/lib/db';
import { Prisma, VoucherStatus, VoucherType, PeriodStatus } from '@prisma/client';
import { SequenceService } from './sequence-service';

export class YearEndClosingService {
  /**
   * بستن سال مالی، صفر کردن حساب‌های موقت سود و زیانی و انتقال سود خالص به سود انباشته
   */
  static async closeFiscalYear(fiscalYearId: string, companyId?: string | null) {
    const fiscalYear = await db.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      include: { periods: true },
    });

    if (!fiscalYear) {
      throw new Error(`سال مالی با شناسه ${fiscalYearId} یافت نشد.`);
    }

    if (fiscalYear.isClosed) {
      throw new Error(`سال مالی ${fiscalYear.title} قبلاً بسته شده است.`);
    }

    const cId = companyId || fiscalYear.companyId;

    return await db.$transaction(async (tx) => {
      // ۱. حساب سود و زیان انباشته
      const retainedEarningsAcc = await tx.account.findUnique({ where: { code: '330101' } });
      if (!retainedEarningsAcc) {
        throw new Error('حساب معین ۳۳۰۱۰۱ (سود و زیان انباشته) در کدینگ یافت نشد.');
      }

      // ۲. استخراج مانده کلیه حساب‌های درآمدی (کد ۴)
      const revenueAccounts = await tx.account.findMany({
        where: { code: { startsWith: '4' }, level: 3, isActive: true },
      });

      const revenueBalances: { account: any; netCredit: Prisma.Decimal }[] = [];
      let totalRevenue = new Prisma.Decimal(0);

      for (const acc of revenueAccounts) {
        const entries = await tx.journalEntry.findMany({
          where: {
            accountId: acc.id,
            voucher: {
              status: VoucherStatus.FINALIZED,
              voucherDate: {
                gte: fiscalYear.startDate,
                lte: fiscalYear.endDate,
              },
            },
          },
          select: { debit: true, credit: true },
        });

        let netCredit = new Prisma.Decimal(0);
        for (const e of entries) {
          netCredit = netCredit.add(e.credit).sub(e.debit);
        }

        if (netCredit.gt(0)) {
          revenueBalances.push({ account: acc, netCredit });
          totalRevenue = totalRevenue.add(netCredit);
        }
      }

      // ۳. استخراج مانده کلیه حساب‌های هزینه و بهای تمام‌شده (کدهای ۵ و ۶)
      const expenseAccounts = await tx.account.findMany({
        where: {
          OR: [{ code: { startsWith: '5' } }, { code: { startsWith: '6' } }],
          level: 3,
          isActive: true,
        },
      });

      const expenseBalances: { account: any; netDebit: Prisma.Decimal }[] = [];
      let totalExpense = new Prisma.Decimal(0);

      for (const acc of expenseAccounts) {
        const entries = await tx.journalEntry.findMany({
          where: {
            accountId: acc.id,
            voucher: {
              status: VoucherStatus.FINALIZED,
              voucherDate: {
                gte: fiscalYear.startDate,
                lte: fiscalYear.endDate,
              },
            },
          },
          select: { debit: true, credit: true },
        });

        let netDebit = new Prisma.Decimal(0);
        for (const e of entries) {
          netDebit = netDebit.add(e.debit).sub(e.credit);
        }

        if (netDebit.gt(0)) {
          expenseBalances.push({ account: acc, netDebit });
          totalExpense = totalExpense.add(netDebit);
        }
      }

      // ۴. محاسبه سود یا زیان خالص سال مالی
      const netProfitOrLoss = totalRevenue.sub(totalExpense);

      // ۵. ایجاد آرتیکل‌های سند اختتامیه و بستن حساب‌ها (Closing Voucher)
      const voucherEntries: any[] = [];
      let rowOrder = 1;

      // صفر کردن حساب‌های درآمد: بدهکار کردن درآمدها
      for (const r of revenueBalances) {
        voucherEntries.push({
          accountId: r.account.id,
          debit: r.netCredit,
          credit: new Prisma.Decimal(0),
          description: `بستن حساب موقت ${r.account.name} در پایان ${fiscalYear.title}`,
          rowOrder: rowOrder++,
        });
      }

      // صفر کردن حساب‌های هزینه: بستانکار کردن هزینه‌ها
      for (const ex of expenseBalances) {
        voucherEntries.push({
          accountId: ex.account.id,
          debit: new Prisma.Decimal(0),
          credit: ex.netDebit,
          description: `بستن حساب موقت ${ex.account.name} در پایان ${fiscalYear.title}`,
          rowOrder: rowOrder++,
        });
      }

      // انتقال سود یا زیان خالص به سود انباشته
      if (netProfitOrLoss.gt(0)) {
        // در صورت سود: بستانکار کردن سود انباشته
        voucherEntries.push({
          accountId: retainedEarningsAcc.id,
          debit: new Prisma.Decimal(0),
          credit: netProfitOrLoss,
          description: `انتقال سود خالص سال مالی ${fiscalYear.title} به سود و زیان انباشته`,
          rowOrder: rowOrder++,
        });
      } else if (netProfitOrLoss.lt(0)) {
        // در صورت زیان: بدهکار کردن سود انباشته
        voucherEntries.push({
          accountId: retainedEarningsAcc.id,
          debit: netProfitOrLoss.abs(),
          credit: new Prisma.Decimal(0),
          description: `انتقال زیان خالص سال مالی ${fiscalYear.title} به سود و زیان انباشته`,
          rowOrder: rowOrder++,
        });
      }

      // اگر هیج گردشی وجود نداشت (مثلاً سال مالی خالی)، یک آرتیکل صوری ثبت نمی‌کنیم
      let voucher = null;
      if (voucherEntries.length > 0) {
        const totalVoucherDebit = voucherEntries.reduce((sum, e) => sum.add(e.debit), new Prisma.Decimal(0));
        const totalVoucherCredit = voucherEntries.reduce((sum, e) => sum.add(e.credit), new Prisma.Decimal(0));

        if (!totalVoucherDebit.equals(totalVoucherCredit)) {
          throw new Error(`خطای عدم تراز سند اختتامیه! بدهکار: ${totalVoucherDebit.toString()}، بستانکار: ${totalVoucherCredit.toString()}`);
        }

        const { rawNumber: voucherNo } = await SequenceService.nextNumber('VOUCHER', cId, tx);
        const idempotencyKey = `CLOSING-VOUCHER-${fiscalYear.id}`;

        voucher = await tx.journalVoucher.create({
          data: {
            voucherNo,
            voucherDate: fiscalYear.endDate,
            type: VoucherType.CLOSING,
            description: `سند اختتامیه و بستن حساب‌های موقت سود و زیانی ${fiscalYear.title}`,
            status: VoucherStatus.FINALIZED,
            referenceModule: 'CLOSING',
            referenceId: fiscalYear.id,
            idempotencyKey,
            companyId: cId,
            totalDebit: totalVoucherDebit,
            totalCredit: totalVoucherCredit,
            postedAt: new Date(),
            entries: {
              create: voucherEntries,
            },
          },
        });
      }

      // ۶. قفل کردن کلیه دوره‌های ماهانه این سال مالی
      await tx.fiscalPeriod.updateMany({
        where: { fiscalYearId: fiscalYear.id },
        data: { status: PeriodStatus.HARD_CLOSED },
      });

      // ۷. نشانه‌گذاری سال مالی به عنوان بسته شده
      const updatedYear = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { isClosed: true },
      });

      return {
        fiscalYear: updatedYear,
        closingVoucher: voucher,
        netProfitOrLoss,
        totalRevenue,
        totalExpense,
      };
    });
  }
}
