import db from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface GenerateSalaryDiskettesInput {
  year: number;
  month: number;
}

/**
 * سرویس تولید فایل‌های متنی ماده ۸۶ مالیات بر حقوق و فایل‌های متنی لیست کارکرد
 * جهت بارگذاری مستقیم در سامانه salary.tax.gov.ir
 */
export class SalaryTaxDisketteService {
  /**
   * محاسبه مالیات ماهانه حقوق طبق جدول پلکانی ماده ۸۴
   * @param taxableSalary حقوق و مزایای مشمول مالیات ماهانه
   * @param monthlyExemptionCeiling سقف معافیت ماهانه (مثلاً سال ۱۴۰۳: ۱۲ میلیون تومان)
   */
  static calculateMonthlyTax(
    taxableSalary: number,
    monthlyExemptionCeiling: number = 120_000_000
  ): number {
    if (taxableSalary <= monthlyExemptionCeiling) {
      return 0;
    }

    const excess = taxableSalary - monthlyExemptionCeiling;

    // پله اول: تا سقف ۱.۵ برابر معافیت با نرخ ۱۰٪
    const bracket1Limit = 1.5 * monthlyExemptionCeiling;
    if (excess <= bracket1Limit) {
      return excess * 0.1;
    }

    // پله دوم: مازاد تا ۲.۵ برابر با نرخ ۱۵٪
    let tax = bracket1Limit * 0.1;
    const bracket2Limit = 2.5 * monthlyExemptionCeiling;
    const excess2 = excess - bracket1Limit;

    if (excess2 <= bracket2Limit) {
      return tax + excess2 * 0.15;
    }

    // پله‌های بالاتر: ۲۰٪
    tax += bracket2Limit * 0.15;
    const excess3 = excess2 - bracket2Limit;
    return tax + excess3 * 0.2;
  }

  /**
   * تولید فایل‌های سه‌گانه ماده ۸۶ (WP.txt, WH.txt, WK.txt)
   */
  static async generateArticle86Diskette(params: GenerateSalaryDiskettesInput) {
    const slips = await db.payrollSlip.findMany({
      where: {
        year: params.year,
        month: params.month,
      },
      include: {
        employee: true,
      },
    });

    if (slips.length === 0) {
      throw new Error(`هیچ فیش حقوقی برای دوره ${params.year}/${params.month} ثبت نشده است.`);
    }

    // ۱. تولید فایل WP.txt (مشخصات سجلی و پرسنلی کارکنان)
    // ساختار: کد ملی | نام | نام خانوادگی | مدرک تحصیلی | تاریخ استخدام
    const wpLines: string[] = [];
    // ۲. تولید فایل WH.txt (ریز اطلاعات مالی و مالیاتی ماهانه هر پرسنل)
    const whLines: string[] = [];

    let totalGrossSalary = new Prisma.Decimal(0);
    let totalTaxableAmount = new Prisma.Decimal(0);
    let totalTaxCalculated = new Prisma.Decimal(0);

    for (const slip of slips) {
      const emp = slip.employee;

      // سطر مشخصات سجلی
      wpLines.push(
        [
          emp.nationalCode,
          emp.firstName,
          emp.lastName,
          emp.fatherName || '',
          emp.personnelCode,
          emp.workshopCode,
          emp.jobTitle,
        ].join('\t')
      );

      totalGrossSalary = totalGrossSalary.add(slip.grossSalary);
      totalTaxCalculated = totalTaxCalculated.add(slip.incomeTax);

      // سطر جزئیات کارکرد و مالیات
      whLines.push(
        [
          emp.nationalCode,
          slip.workedDays,
          slip.grossSalary.toString(),
          slip.insuranceWorker.toString(),
          slip.incomeTax.toString(),
          slip.netSalary.toString(),
        ].join('\t')
      );
    }

    // ۳. تولید فایل WK.txt (خلاصه سرجمع لیست حقوق پرداختی)
    const wkContent = [
      params.year,
      params.month,
      slips.length, // تعداد پرسنل
      totalGrossSalary.toString(),
      totalTaxCalculated.toString(),
    ].join('\t');

    return {
      wp: wpLines.join('\r\n'),
      wh: whLines.join('\r\n'),
      wk: wkContent,
      stats: {
        employeeCount: slips.length,
        totalGross: totalGrossSalary,
        totalTax: totalTaxCalculated,
      },
    };
  }
}
