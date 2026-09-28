import db from '@/lib/db';
import { PeriodStatus, AuditAction } from '@prisma/client';

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * سرویس مدیریت سال‌های مالی، دوره‌های حسابداری و قفل دوره‌ها
 */
export class PeriodService {
  /**
   * تعریف یک سال مالی جدید به همراه دوره‌های ماهانه ۱۲ گانه
   */
  static async createFiscalYear(params: {
    companyId: string;
    year: number;
    title: string;
    startDate: Date;
    endDate: Date;
  }) {
    return await db.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscalYear.create({
        data: {
          companyId: params.companyId,
          year: params.year,
          title: params.title,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      });

      // تقسیم دوره سال به ۱۲ دوره ماهانه
      const totalDuration = params.endDate.getTime() - params.startDate.getTime();
      const approxMonthMs = totalDuration / 12;

      for (let i = 1; i <= 12; i++) {
        const periodStart = new Date(params.startDate.getTime() + (i - 1) * approxMonthMs);
        const periodEnd = i === 12
          ? params.endDate
          : new Date(params.startDate.getTime() + i * approxMonthMs - 1);

        await tx.fiscalPeriod.create({
          data: {
            fiscalYearId: fiscalYear.id,
            periodNumber: i,
            title: `${PERSIAN_MONTH_NAMES[i - 1]} ${params.year}`,
            startDate: periodStart,
            endDate: periodEnd,
            status: PeriodStatus.OPEN,
          },
        });
      }

      return fiscalYear;
    });
  }

  /**
   * بستن موقت یا دائم یک دوره مالی (Soft / Hard Close)
   */
  static async closePeriod(params: {
    periodId: string;
    status: PeriodStatus; // SOFT_CLOSED or HARD_CLOSED
    userId?: string | null;
    reason?: string;
  }) {
    if (params.status === PeriodStatus.OPEN) {
      throw new Error('برای بازگشایی دوره از متد reopenPeriod استفاده فرمایید.');
    }

    return await db.$transaction(async (tx) => {
      const period = await tx.fiscalPeriod.findUnique({
        where: { id: params.periodId },
      });

      if (!period) {
        throw new Error('دوره مالی مورد نظر یافت نشد.');
      }

      const updated = await tx.fiscalPeriod.update({
        where: { id: params.periodId },
        data: { status: params.status },
      });

      await tx.auditLog.create({
        data: {
          userId: params.userId,
          action: AuditAction.UPDATE,
          entity: 'FiscalPeriod',
          entityId: params.periodId,
          oldValue: { status: period.status },
          newValue: { status: params.status },
          reason: params.reason || `بستن دوره مالی ${period.title} به وضعیت ${params.status}`,
        },
      });

      return updated;
    });
  }

  /**
   * بازگشایی دوره بسته شده با مجوز خاص و ثبت Audit Trail
   */
  static async reopenPeriod(params: {
    periodId: string;
    userId: string;
    reason: string;
  }) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('برای بازگشایی یک دوره مالی بسته، ذکر دلیل موجه و ثبت لاگ الزامی است.');
    }

    return await db.$transaction(async (tx) => {
      const period = await tx.fiscalPeriod.findUnique({
        where: { id: params.periodId },
      });

      if (!period) {
        throw new Error('دوره مالی مورد نظر یافت نشد.');
      }

      const updated = await tx.fiscalPeriod.update({
        where: { id: params.periodId },
        data: { status: PeriodStatus.OPEN },
      });

      await tx.auditLog.create({
        data: {
          userId: params.userId,
          action: AuditAction.UPDATE,
          entity: 'FiscalPeriod',
          entityId: params.periodId,
          oldValue: { status: period.status },
          newValue: { status: PeriodStatus.OPEN },
          reason: `بازگشایی دوره مالی: ${params.reason}`,
        },
      });

      return updated;
    });
  }

  /**
   * دریافت دوره مالی متناظر با یک تاریخ خاص
   */
  static async getPeriodForDate(date: Date, companyId?: string | null) {
    return await db.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        ...(companyId ? { fiscalYear: { companyId } } : {}),
      },
      include: {
        fiscalYear: true,
      },
    });
  }
}
