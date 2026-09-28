import db from '@/lib/db';
import { Prisma, VoucherStatus, VoucherType } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { PayrollCalculationEngine } from './payroll-calculation-engine';

export interface EmployeeAdjustmentInput {
  employeeId: string;
  workedDays?: number;
  overtimeHours?: number | Prisma.Decimal;
  bonusAmount?: number | Prisma.Decimal;
  otherAdditions?: number | Prisma.Decimal;
  otherDeductions?: number | Prisma.Decimal;
  housingAllowance?: number | Prisma.Decimal;
  foodSubsidy?: number | Prisma.Decimal;
  childAllowance?: number | Prisma.Decimal;
}

export interface CreatePayrollRunInput {
  year: number; // مثلا ۱۴۰۵
  month: number; // ۱ تا ۱۲
  title?: string;
  companyId?: string | null;
  adjustments?: Record<string, Partial<EmployeeAdjustmentInput>>;
}

export class PayrollRunService {
  /**
   * ایجاد دوره حقوق و دستمزد ماهانه برای کلیه پرسنل فعال
   */
  static async createPayrollRun(input: CreatePayrollRunInput) {
    const { year, month } = input;
    if (month < 1 || month > 12) {
      throw new Error('شماره ماه باید بین ۱ تا ۱۲ باشد.');
    }

    const existing = await db.payrollRun.findUnique({
      where: {
        year_month: { year, month },
      },
    });

    if (existing) {
      throw new Error(`محاسبه حقوق برای دوره سال ${year} و ماه ${month} قبلاً ثبت شده است (شماره دوره: ${existing.runNumber}).`);
    }

    // دریافت شرکت پیش‌فرض در صورت مشخص نبودن
    let companyId = input.companyId;
    if (!companyId) {
      const defaultCompany = await db.company.findFirst({ where: { isDefault: true } });
      companyId = defaultCompany?.id || null;
    }

    // دریافت کلیه پرسنل فعال
    const employees = await db.employee.findMany({
      where: { isActive: true },
      orderBy: { personnelCode: 'asc' },
    });

    if (employees.length === 0) {
      throw new Error('هیچ پرسنل فعالی در سامانه برای محاسبه حقوق یافت نشد.');
    }

    const { formattedNumber: runNumber } = await SequenceService.nextNumber('PAYROLL_RUN', companyId);

    const monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    const defaultTitle = input.title || `حقوق و دستمزد ${monthNames[month - 1]} ماه ${year}`;

    // تعیین روزهای استاندارد ماه (ماه‌های ۱ تا ۶ = ۳۱ روز، ۷ تا ۱۱ = ۳۰ روز، ۱۲ = ۲۹ یا ۳۰ روز)
    const defaultDays = month <= 6 ? 31 : 30;

    let totalGross = new Prisma.Decimal(0);
    let totalWorkerIns = new Prisma.Decimal(0);
    let totalEmployerIns = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    let totalNet = new Prisma.Decimal(0);

    const slipDataList: any[] = [];

    for (const emp of employees) {
      const adj = input.adjustments?.[emp.id] || {};
      const workedDays = adj.workedDays !== undefined ? adj.workedDays : defaultDays;
      const overtimeHours = adj.overtimeHours !== undefined ? adj.overtimeHours : 0;
      const bonusAmount = adj.bonusAmount !== undefined ? adj.bonusAmount : 0;
      const otherAdditions = adj.otherAdditions !== undefined ? adj.otherAdditions : 0;
      const otherDeductions = adj.otherDeductions !== undefined ? adj.otherDeductions : 0;

      const calc = PayrollCalculationEngine.calculate({
        baseDailyWage: emp.baseDailyWage,
        workedDays,
        housingAllowance: adj.housingAllowance !== undefined ? adj.housingAllowance : emp.housingAllowance,
        foodSubsidy: adj.foodSubsidy !== undefined ? adj.foodSubsidy : emp.foodSubsidy,
        childCount: emp.childCount,
        childAllowance: adj.childAllowance !== undefined ? adj.childAllowance : (emp.childAllowance.gt(0) ? emp.childAllowance : undefined),
        overtimeHours,
        bonusAmount,
        otherAdditions,
        otherDeductions,
      });

      totalGross = totalGross.add(calc.grossSalary);
      totalWorkerIns = totalWorkerIns.add(calc.insuranceWorker);
      totalEmployerIns = totalEmployerIns.add(calc.insuranceEmployer);
      totalTax = totalTax.add(calc.incomeTax);
      totalNet = totalNet.add(calc.netSalary);

      slipDataList.push({
        employeeId: emp.id,
        year,
        month,
        workedDays,
        baseSalary: calc.baseSalary,
        housingAllowance: calc.housingAllowance,
        foodSubsidy: calc.foodSubsidy,
        childAllowance: calc.childAllowance,
        overtimeHours: calc.overtimeHours,
        overtimeAmount: calc.overtimeAmount,
        bonusAmount: calc.bonusAmount,
        otherAdditions: calc.otherAdditions,
        grossSalary: calc.grossSalary,
        insuredEarnings: calc.insuredEarnings,
        insuranceWorker: calc.insuranceWorker,
        insuranceEmployer: calc.insuranceEmployer,
        taxExemptAmount: calc.taxExemptAmount,
        taxableAmount: calc.taxableAmount,
        incomeTax: calc.incomeTax,
        otherDeductions: calc.otherDeductions,
        netSalary: calc.netSalary,
        status: 'DRAFT',
      });
    }

    return await db.$transaction(async (tx) => {
      const payrollRun = await tx.payrollRun.create({
        data: {
          runNumber,
          year,
          month,
          title: defaultTitle,
          status: 'DRAFT',
          totalEmployees: employees.length,
          totalGross,
          totalWorkerIns,
          totalEmployerIns,
          totalTax,
          totalNet,
          companyId,
          slips: {
            create: slipDataList,
          },
        },
        include: {
          slips: {
            include: {
              employee: true,
            },
          },
        },
      });

      return payrollRun;
    });
  }

  /**
   * تایید لیست حقوق و صدور سند حسابداری دوبل شناسایی هزینه حقوق، بیمه و مالیات
   * بدهکار: ۶۱۰۱۰۱ (هزینه دستمزد و حقوق پرسنل) = ناخالص حقوق + ۲۳٪ سهم کارفرما
   * بستانکار: ۲۱۰۳۰۱ (حقوق و دستمزد پرداختنی) = خالص پرداختی پرسنل
   * بستانکار: ۲۱۰۶۰۲ (بیمه تامین اجتماعی پرداختنی) = ۳۰٪ سهم کارگر + کارفرما
   * بستانکار: ۲۱۰۶۰۳ (مالیات حقوق پرداختنی) = مالیات تکلیفی ماده ۸۶
   */
  static async approvePayrollRun(runId: string, companyId?: string | null) {
    const run = await db.payrollRun.findUnique({
      where: { id: runId },
      include: {
        slips: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!run) {
      throw new Error(`دوره حقوق با شناسه ${runId} یافت نشد.`);
    }

    if (run.status !== 'DRAFT') {
      throw new Error(`این دوره حقوق قبلاً در وضعیت ${run.status} قرار گرفته است.`);
    }

    const cId = companyId || run.companyId;

    return await db.$transaction(async (tx) => {
      // ۱. یافتن حساب‌های معین حسابداری
      const expenseAcc = await tx.account.findUnique({ where: { code: '610101' } }); // هزینه دستمزد و حقوق
      const payableAcc = await tx.account.findUnique({ where: { code: '210301' } }); // حقوق و دستمزد پرداختنی
      const insuranceAcc = await tx.account.findUnique({ where: { code: '210602' } }); // بیمه تامین اجتماعی پرداختنی
      const taxAcc = await tx.account.findUnique({ where: { code: '210603' } }); // مالیات حقوق پرداختنی

      if (!expenseAcc || !payableAcc || !insuranceAcc || !taxAcc) {
        throw new Error('حساب‌های معین حقوق و دستمزد (۶۱۰۱۰۱، ۲۱۰۳۰۱، ۲۱۰۶۰۲، ۲۱۰۶۰۳) در کدینگ یافت نشدند.');
      }

      // ۲. محاسبه دقیق آرتیکل‌ها
      // هزینه کل = ناخالص حقوق + ۲۳٪ بیمه سهم کارفرما
      const totalExpense = run.totalGross.add(run.totalEmployerIns);
      // مجموع بیمه پرداختنی به تامین اجتماعی = ۷٪ سهم کارگر + ۲۳٪ سهم کارفرما (۳۰٪ کل)
      const totalInsurance = run.totalWorkerIns.add(run.totalEmployerIns);
      const totalNetPayable = run.totalNet;
      const totalTax = run.totalTax;

      // بررسی موازنه دقیق بدهکار و بستانکار
      const totalCredit = totalNetPayable.add(totalInsurance).add(totalTax);
      if (!totalExpense.equals(totalCredit)) {
        throw new Error(`عدم تراز سند حقوق! بدهکار: ${totalExpense.toString()}، بستانکار: ${totalCredit.toString()}`);
      }

      // ۳. صدور سند حسابداری دوبل
      const { rawNumber: voucherNo } = await SequenceService.nextNumber('VOUCHER', cId, tx);
      const idempotencyKey = `PAYROLL-VOUCHER-${run.id}`;

      const voucher = await tx.journalVoucher.create({
        data: {
          voucherNo,
          voucherDate: new Date(),
          type: VoucherType.PAYROLL,
          description: `سند شناسایی هزینه حقوق و دستمزد ${run.title} (شماره دوره: ${run.runNumber})`,
          status: VoucherStatus.FINALIZED,
          referenceModule: 'PAYROLL',
          referenceId: run.runNumber,
          idempotencyKey,
          companyId: cId,
          totalDebit: totalExpense,
          totalCredit: totalExpense,
          postedAt: new Date(),
          entries: {
            create: [
              {
                accountId: expenseAcc.id,
                debit: totalExpense,
                credit: new Prisma.Decimal(0),
                description: `هزینه ناخالص حقوق پرسنل و حق بیمه سهم کارفرما - ${run.title}`,
                rowOrder: 1,
              },
              {
                accountId: payableAcc.id,
                debit: new Prisma.Decimal(0),
                credit: totalNetPayable,
                description: `خالص حقوق و دستمزد پرداختنی پرسنل کارخانه - ${run.title}`,
                rowOrder: 2,
              },
              {
                accountId: insuranceAcc.id,
                debit: new Prisma.Decimal(0),
                credit: totalInsurance,
                description: `حق بیمه تامین اجتماعی ۳۰٪ (۷٪ کارگر + ۲۳٪ کارفرما) - کارگاه کارخانه`,
                rowOrder: 3,
              },
              {
                accountId: taxAcc.id,
                debit: new Prisma.Decimal(0),
                credit: totalTax,
                description: `مالیات تکلیفی حقوق و دستمزد ماده ۸۶ - ${run.title}`,
                rowOrder: 4,
              },
            ],
          },
        },
      });

      // ۴. به‌روزرسانی دوره و فیش‌های حقوقی به وضعیت APPROVED
      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'APPROVED',
          journalVoucherId: voucher.id,
        },
      });

      await tx.payrollSlip.updateMany({
        where: { payrollRunId: run.id },
        data: {
          status: 'APPROVED',
          journalVoucherId: voucher.id,
        },
      });

      return {
        payrollRun: updatedRun,
        voucher,
      };
    });
  }

  /**
   * ثبت پرداخت بانکی حقوق پرسنل (دیسکت پایا) و صدور سند تسویه
   * بدهکار: ۲۱۰۳۰۱ (حقوق و دستمزد پرداختنی)
   * بستانکار: ۱۱۰۱۰۱ (موجودی نقد و بانک‌ها - حساب بانک کارخانه)
   */
  static async disbursePayrollRun(input: {
    runId: string;
    bankAccountId?: string | null;
    paymentDate?: Date | string;
    description?: string;
  }) {
    const run = await db.payrollRun.findUnique({
      where: { id: input.runId },
    });

    if (!run) {
      throw new Error(`دوره حقوق با شناسه ${input.runId} یافت نشد.`);
    }

    if (run.status !== 'APPROVED') {
      throw new Error('تنها دوره‌های تاییدشده (APPROVED) قابل واریز بانکی هستند.');
    }

    return await db.$transaction(async (tx) => {
      // انتخاب حساب بانکی
      let bankAccount = null;
      if (input.bankAccountId) {
        bankAccount = await tx.bankAccount.findUnique({ where: { id: input.bankAccountId } });
      } else {
        bankAccount = await tx.bankAccount.findFirst({ where: { isDefault: true } });
      }

      const payableAcc = await tx.account.findUnique({ where: { code: '210301' } }); // حقوق پرداختنی
      const bankLedgerAcc = await tx.account.findUnique({ where: { code: '110101' } }); // نقد و بانک

      if (!payableAcc || !bankLedgerAcc) {
        throw new Error('حساب‌های ۲۱۰۳۰۱ یا ۱۱۰۱۰۱ در کدینگ یافت نشدند.');
      }

      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const { rawNumber: voucherNo } = await SequenceService.nextNumber('VOUCHER', run.companyId, tx);
      const idempotencyKey = `PAYROLL-DISBURSE-${run.id}`;

      const voucher = await tx.journalVoucher.create({
        data: {
          voucherNo,
          voucherDate: paymentDate,
          type: VoucherType.PAYMENT,
          description: input.description || `سند واریز بانکی گروهی حقوق و دستمزد پرسنل - ${run.title}`,
          status: VoucherStatus.FINALIZED,
          referenceModule: 'PAYROLL',
          referenceId: run.runNumber,
          idempotencyKey,
          companyId: run.companyId,
          totalDebit: run.totalNet,
          totalCredit: run.totalNet,
          postedAt: new Date(),
          entries: {
            create: [
              {
                accountId: payableAcc.id,
                debit: run.totalNet,
                credit: new Prisma.Decimal(0),
                description: `تسویه حقوق و دستمزد پرداختنی پرسنل - ${run.title}`,
                rowOrder: 1,
              },
              {
                accountId: bankLedgerAcc.id,
                detail1Type: bankAccount ? 'BANK' : null,
                detail1Id: bankAccount?.id || null,
                debit: new Prisma.Decimal(0),
                credit: run.totalNet,
                description: `خروج وجه از حساب بانکی کارخانه بابت پرداخت گروهی پایا - ${run.title}`,
                rowOrder: 2,
              },
            ],
          },
        },
      });

      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'PAID',
          paymentVoucherId: voucher.id,
          paidAt: paymentDate,
        },
      });

      await tx.payrollSlip.updateMany({
        where: { payrollRunId: run.id },
        data: {
          status: 'PAID',
        },
      });

      return {
        payrollRun: updatedRun,
        paymentVoucher: voucher,
      };
    });
  }

  /**
   * دریافت فهرست دوره‌های حقوق و دستمزد
   */
  static async getPayrollRuns() {
    return await db.payrollRun.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: {
          select: { slips: true },
        },
      },
    });
  }

  /**
   * دریافت مشخصات کامل یک دوره حقوق و کلیه فیش‌های مرتبط
   */
  static async getPayrollRunById(id: string) {
    return await db.payrollRun.findUnique({
      where: { id },
      include: {
        slips: {
          include: {
            employee: true,
          },
          orderBy: {
            employee: {
              personnelCode: 'asc',
            },
          },
        },
      },
    });
  }

  /**
   * به‌روزرسانی و بازمحاسبه فیش یک پرسنل در دوره در حال پیش‌نویس (DRAFT)
   */
  static async updateDraftSlip(slipId: string, adjustment: Partial<EmployeeAdjustmentInput>) {
    const slip = await db.payrollSlip.findUnique({
      where: { id: slipId },
      include: { employee: true, payrollRun: true },
    });

    if (!slip) {
      throw new Error('فیش حقوقی مورد نظر یافت نشد.');
    }

    if (slip.status !== 'DRAFT' || slip.payrollRun?.status !== 'DRAFT') {
      throw new Error('امکان ویرایش فیش در دوره‌های تاییدشده یا پرداخت‌شده وجود ندارد.');
    }

    const workedDays = adjustment.workedDays !== undefined ? adjustment.workedDays : slip.workedDays;
    const overtimeHours = adjustment.overtimeHours !== undefined ? adjustment.overtimeHours : slip.overtimeHours;
    const bonusAmount = adjustment.bonusAmount !== undefined ? adjustment.bonusAmount : slip.bonusAmount;
    const otherAdditions = adjustment.otherAdditions !== undefined ? adjustment.otherAdditions : slip.otherAdditions;
    const otherDeductions = adjustment.otherDeductions !== undefined ? adjustment.otherDeductions : slip.otherDeductions;
    const housingAllowance = adjustment.housingAllowance !== undefined ? adjustment.housingAllowance : slip.housingAllowance;
    const foodSubsidy = adjustment.foodSubsidy !== undefined ? adjustment.foodSubsidy : slip.foodSubsidy;
    const childAllowance = adjustment.childAllowance !== undefined ? adjustment.childAllowance : slip.childAllowance;

    const calc = PayrollCalculationEngine.calculate({
      baseDailyWage: slip.employee.baseDailyWage,
      workedDays,
      housingAllowance,
      foodSubsidy,
      childAllowance,
      overtimeHours,
      bonusAmount,
      otherAdditions,
      otherDeductions,
    });

    return await db.$transaction(async (tx) => {
      const updatedSlip = await tx.payrollSlip.update({
        where: { id: slipId },
        data: {
          workedDays,
          baseSalary: calc.baseSalary,
          housingAllowance: calc.housingAllowance,
          foodSubsidy: calc.foodSubsidy,
          childAllowance: calc.childAllowance,
          overtimeHours: calc.overtimeHours,
          overtimeAmount: calc.overtimeAmount,
          bonusAmount: calc.bonusAmount,
          otherAdditions: calc.otherAdditions,
          grossSalary: calc.grossSalary,
          insuredEarnings: calc.insuredEarnings,
          insuranceWorker: calc.insuranceWorker,
          insuranceEmployer: calc.insuranceEmployer,
          taxExemptAmount: calc.taxExemptAmount,
          taxableAmount: calc.taxableAmount,
          incomeTax: calc.incomeTax,
          otherDeductions: calc.otherDeductions,
          netSalary: calc.netSalary,
        },
      });

      // بازنگری سرجمع کل در PayrollRun
      const allSlips = await tx.payrollSlip.findMany({
        where: { payrollRunId: slip.payrollRunId! },
      });

      let totalGross = new Prisma.Decimal(0);
      let totalWorkerIns = new Prisma.Decimal(0);
      let totalEmployerIns = new Prisma.Decimal(0);
      let totalTax = new Prisma.Decimal(0);
      let totalNet = new Prisma.Decimal(0);

      for (const s of allSlips) {
        totalGross = totalGross.add(s.grossSalary);
        totalWorkerIns = totalWorkerIns.add(s.insuranceWorker);
        totalEmployerIns = totalEmployerIns.add(s.insuranceEmployer);
        totalTax = totalTax.add(s.incomeTax);
        totalNet = totalNet.add(s.netSalary);
      }

      await tx.payrollRun.update({
        where: { id: slip.payrollRunId! },
        data: {
          totalGross,
          totalWorkerIns,
          totalEmployerIns,
          totalTax,
          totalNet,
        },
      });

      return updatedSlip;
    });
  }
}
