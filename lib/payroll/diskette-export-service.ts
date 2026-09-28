import db from '@/lib/db';
import { Prisma } from '@prisma/client';

export class DisketteExportService {
  /**
   * تولید فایل استاندارد پرداخت گروهی پایا (بانک مرکزی ایران)
   * دارای کاراکتر BOM برای سازگاری کامل با Excel و پورتال‌های اینترنت بانک
   */
  static async generatePayaDiskette(runId: string) {
    const run = await db.payrollRun.findUnique({
      where: { id: runId },
      include: {
        slips: {
          include: { employee: true },
          orderBy: { employee: { personnelCode: 'asc' } },
        },
      },
    });

    if (!run) {
      throw new Error(`دوره حقوق با شناسه ${runId} یافت نشد.`);
    }

    const lines: string[] = [];
    // هدر فایل پایا با کاراکتر BOM (Byte Order Mark)
    const UTF8_BOM = '\uFEFF';

    // ردیف سرستون
    lines.push('ردیف,شماره شبا,مبلغ (ریال),نام و نام خانوادگی,کد ملی,شماره پرسنلی,شرح و بابت');

    let missingIbanCount = 0;

    run.slips.forEach((slip, idx) => {
      const emp = slip.employee;
      const iban = emp.bankIban?.trim().toUpperCase() || '';
      if (!iban) {
        missingIbanCount++;
      }
      const fullName = `"${emp.firstName} ${emp.lastName}"`;
      const description = `"حقوق ${run.title} - کارخانه خوش‌صنعت پایدار"`;
      const amountStr = slip.netSalary.toFixed(0);

      lines.push(`${idx + 1},${iban},${amountStr},${fullName},${emp.nationalCode},${emp.personnelCode},${description}`);
    });

    const content = UTF8_BOM + lines.join('\r\n');
    const fileName = `PAYA_${run.runNumber}_${run.year}_${String(run.month).padStart(2, '0')}.csv`;

    return {
      fileName,
      content,
      totalCount: run.slips.length,
      totalAmount: run.totalNet,
      missingIbanCount,
    };
  }

  /**
   * تولید گزارش و دیسکت استاندارد ارسال اطلاعات به سازمان تامین اجتماعی
   */
  static async generateTaminInsuranceExport(runId: string) {
    const run = await db.payrollRun.findUnique({
      where: { id: runId },
      include: {
        slips: {
          include: { employee: true },
          orderBy: { employee: { personnelCode: 'asc' } },
        },
      },
    });

    if (!run) {
      throw new Error(`دوره حقوق با شناسه ${runId} یافت نشد.`);
    }

    const UTF8_BOM = '\uFEFF';
    const lines: string[] = [];

    // سرستون گزارش سازمان تامین اجتماعی
    lines.push('ردیف,کد کارگاه,شماره بیمه,کد ملی,نام و نام خانوادگی,عنوان شغل,روز کارکرد,مزد روزانه (ریال),مشمول بیمه ماهانه (ریال),سهم کارگر ۷٪,سهم کارفرما ۲۳٪,جمع بیمه ۳۰٪');

    run.slips.forEach((slip, idx) => {
      const emp = slip.employee;
      const insuranceNo = emp.insuranceNo || '---';
      const fullName = `"${emp.firstName} ${emp.lastName}"`;
      const jobTitle = `"${emp.jobTitle}"`;
      const totalIns = slip.insuranceWorker.add(slip.insuranceEmployer);

      lines.push(
        `${idx + 1},${emp.workshopCode},${insuranceNo},${emp.nationalCode},${fullName},${jobTitle},${slip.workedDays},${emp.baseDailyWage.toFixed(0)},${slip.insuredEarnings.toFixed(0)},${slip.insuranceWorker.toFixed(0)},${slip.insuranceEmployer.toFixed(0)},${totalIns.toFixed(0)}`
      );
    });

    const content = UTF8_BOM + lines.join('\r\n');
    const fileName = `TAMIN_${run.runNumber}_${run.year}_${String(run.month).padStart(2, '0')}.csv`;

    return {
      fileName,
      content,
      summary: {
        totalEmployees: run.slips.length,
        totalInsuredEarnings: run.slips.reduce((acc, s) => acc.add(s.insuredEarnings), new Prisma.Decimal(0)),
        totalWorkerInsurance: run.totalWorkerIns,
        totalEmployerInsurance: run.totalEmployerIns,
        total30PercentInsurance: run.totalWorkerIns.add(run.totalEmployerIns),
      },
    };
  }
}
