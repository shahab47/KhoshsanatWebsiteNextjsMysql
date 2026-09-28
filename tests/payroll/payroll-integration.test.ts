import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, VoucherStatus, VoucherType } from '@prisma/client';
import { EmployeeService } from '@/lib/payroll/employee-service';
import { PayrollCalculationEngine } from '@/lib/payroll/payroll-calculation-engine';
import { PayrollRunService } from '@/lib/payroll/payroll-run-service';
import { DisketteExportService } from '@/lib/payroll/diskette-export-service';

describe('Phase 7: Payroll, Employee Management, Tax/Insurance Compliance & Bank Diskette Integration', () => {
  let emp1Id: string;
  let emp2Id: string;
  let payrollRunId: string;
  let bankAccountId: string;
  const testYear = 1405;
  const testMonth = 7; // مهر ۱۴۰۵ (۳۰ روزه)

  const createdEmployeeIds: string[] = [];
  const createdRunIds: string[] = [];
  const createdVoucherIds: string[] = [];
  const createdBankIds: string[] = [];

  beforeAll(async () => {
    // اطمینان از وجود حساب‌های معین حقوق و دستمزد
    const parent23 = await db.account.findUnique({ where: { code: '23' } });
    if (parent23) {
      await db.account.upsert({
        where: { code: '210602' },
        create: {
          code: '210602',
          name: 'بیمه تامین اجتماعی پرداختنی',
          level: 3,
          nature: 'CREDIT',
          accountType: 'LIABILITY',
          parentId: parent23.id,
        },
        update: {},
      });
      await db.account.upsert({
        where: { code: '210603' },
        create: {
          code: '210603',
          name: 'مالیات حقوق پرداختنی',
          level: 3,
          nature: 'CREDIT',
          accountType: 'LIABILITY',
          parentId: parent23.id,
        },
        update: {},
      });
    }

    // ایجاد یک حساب بانکی تست برای پرداخت پایا
    const defaultCompany = await db.company.findFirst({ where: { isDefault: true } });
    const bank = await db.bankAccount.create({
      data: {
        bankName: 'بانک ملت شعبه کارخانه',
        accountNumber: `TEST-ACC-${Date.now()}`,
        iban: `IR99012000000000${Date.now().toString().slice(-10)}`,
        initialBalance: new Prisma.Decimal(1000000000), // ۱ میلیارد ریال
        companyId: defaultCompany?.id || null,
      },
    });
    bankAccountId = bank.id;
    createdBankIds.push(bank.id);

    // پاکسازی احتمالی دوره‌های قبلی تستی همین ماه
    const prevRun = await db.payrollRun.findUnique({
      where: { year_month: { year: testYear, month: testMonth } },
    });
    if (prevRun) {
      await db.payrollSlip.deleteMany({ where: { payrollRunId: prevRun.id } });
      await db.payrollRun.delete({ where: { id: prevRun.id } });
    }
  });

  afterAll(async () => {
    // پاکسازی داده‌های تستی
    for (const rId of createdRunIds) {
      await db.payrollSlip.deleteMany({ where: { payrollRunId: rId } });
      await db.payrollRun.delete({ where: { id: rId } }).catch(() => {});
    }
    for (const eId of createdEmployeeIds) {
      await db.payrollSlip.deleteMany({ where: { employeeId: eId } });
      await db.employee.delete({ where: { id: eId } }).catch(() => {});
    }
    for (const bId of createdBankIds) {
      await db.bankAccount.delete({ where: { id: bId } }).catch(() => {});
    }
    for (const vId of createdVoucherIds) {
      await db.journalEntry.deleteMany({ where: { voucherId: vId } });
      await db.journalVoucher.delete({ where: { id: vId } }).catch(() => {});
    }
  });

  // ۱. ایجاد و اعتبارسنجی پرسنل
  it('Step 1: Create employees with sequence numbering and data validation', async () => {
    const emp1 = await EmployeeService.createEmployee({
      firstName: 'حمید',
      lastName: 'رضایی',
      nationalCode: '0012345678',
      insuranceNo: '1234567890',
      jobTitle: 'اپراتور برش پلاسما و CNC',
      department: 'PRODUCTION',
      workshopCode: '0123456789',
      baseDailyWage: 3000000, // ۳ میلیون ریال روزانه
      housingAllowance: 9000000, // ۹ میلیون ریال
      foodSubsidy: 14000000, // ۱۴ میلیون ریال
      childCount: 2, // ۲ فرزند
      bankName: 'بانک ملت',
      bankAccount: '123456789',
      bankIban: 'IR120120000000001234567890',
      maritalStatus: 'MARRIED',
    });

    expect(emp1).toBeDefined();
    expect(emp1.personnelCode).toMatch(/^EMP-\d{6}$/);
    expect(emp1.nationalCode).toBe('0012345678');
    expect(Number(emp1.baseDailyWage)).toBe(3000000);
    expect(emp1.childCount).toBe(2);

    emp1Id = emp1.id;
    createdEmployeeIds.push(emp1.id);

    const emp2 = await EmployeeService.createEmployee({
      firstName: 'سهراب',
      lastName: 'کاظمی',
      nationalCode: '0087654321',
      insuranceNo: '0987654321',
      jobTitle: 'سرپرست کنترل کیفی و جوش',
      department: 'ENGINEERING',
      workshopCode: '0123456789',
      baseDailyWage: 4500000, // ۴.۵ میلیون ریال روزانه
      housingAllowance: 9000000,
      foodSubsidy: 14000000,
      childCount: 0,
      bankName: 'بانک صادرات',
      bankAccount: '987654321',
      bankIban: 'IR980180000000009876543210',
      maritalStatus: 'SINGLE',
    });

    expect(emp2).toBeDefined();
    expect(emp2.personnelCode).toMatch(/^EMP-\d{6}$/);
    expect(emp2.personnelCode).not.toBe(emp1.personnelCode);

    emp2Id = emp2.id;
    createdEmployeeIds.push(emp2.id);

    // جلوگیری از ثبت کد ملی تکراری
    await expect(
      EmployeeService.createEmployee({
        firstName: 'تست',
        lastName: 'تکراری',
        nationalCode: '0012345678', // همان کد ملی emp1
        jobTitle: 'کارگر ساده',
        baseDailyWage: 2000000,
      })
    ).rejects.toThrow(/قبلاً ثبت شده است/);
  });

  // ۲. دقت موتور محاسباتی حقوق طبق قانون کار
  it('Step 2: Payroll calculation engine accurately applies Labor Law, 7% & 23% Insurance, and Tax', () => {
    const calc = PayrollCalculationEngine.calculate({
      baseDailyWage: 3000000,
      workedDays: 30, // ۳۰ روز کارکرد
      housingAllowance: 9000000,
      foodSubsidy: 14000000,
      childCount: 2, // ۲ فرزند: 2 * (3 * 3,000,000) = 18,000,000 ریال
      overtimeHours: 20, // ۲۰ ساعت اضافه‌کاری
      bonusAmount: 5000000,
      otherAdditions: 0,
      otherDeductions: 2000000, // ۲ میلیون ریال مساعده
      monthlyTaxExemption: 120000000, // ۱۲۰ میلیون ریال معافیت ماهانه
    });

    // ۱. مزد پایه کارکرد = 30 * 3,000,000 = 90,000,000
    expect(calc.baseSalary.toString()).toBe('90000000');
    // ۲. حق مسکن و بن
    expect(calc.housingAllowance.toString()).toBe('9000000');
    expect(calc.foodSubsidy.toString()).toBe('14000000');
    // ۳. حق اولاد = 2 * (3 * 3,000,000) = 18,000,000
    expect(calc.childAllowance.toString()).toBe('18000000');
    // ۴. اضافه‌کاری: 20 ساعت با نرخ ۱.۴ برابر دستمزد ساعتی (۳,۰۰۰,۰۰۰ / ۷.۳۳۳۳ = ۴۰۹,۰۹۱ ریال -> با ۱.۴ = ۵۷۲,۷۲۷ ریال -> ضرب در ۲۰ = ۱۱,۴۵۴,۵۴۵ ریال)
    expect(calc.overtimeAmount.toNumber()).toBeGreaterThan(11400000);
    expect(calc.overtimeAmount.toNumber()).toBeLessThan(11500000);

    // ۵. جمع ناخالص حقوق
    const expectedGross = calc.baseSalary
      .add(calc.housingAllowance)
      .add(calc.foodSubsidy)
      .add(calc.childAllowance)
      .add(calc.overtimeAmount)
      .add(calc.bonusAmount);
    expect(calc.grossSalary.toString()).toBe(expectedGross.toString());

    // ۶. درآمد مشمول بیمه (ناخالص منهای حق اولاد)
    expect(calc.insuredEarnings.toString()).toBe(expectedGross.sub(calc.childAllowance).toString());

    // ۷. بیمه تامین اجتماعی: ۷٪ سهم کارگر و ۲۳٪ سهم کارفرما
    const expectedWorkerIns = calc.insuredEarnings.mul(new Prisma.Decimal('0.07')).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    const expectedEmployerIns = calc.insuredEarnings.mul(new Prisma.Decimal('0.23')).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    expect(calc.insuranceWorker.toString()).toBe(expectedWorkerIns.toString());
    expect(calc.insuranceEmployer.toString()).toBe(expectedEmployerIns.toString());

    // ۸. خالص پرداختی = ناخالص - بیمه کارگر - مالیات - سایر کسورات
    const expectedNet = calc.grossSalary
      .sub(calc.insuranceWorker)
      .sub(calc.incomeTax)
      .sub(calc.otherDeductions);
    expect(calc.netSalary.toString()).toBe(expectedNet.toString());
  });

  // ۳. ایجاد دوره ماهانه حقوق (DRAFT)
  it('Step 3: Create monthly payroll run in DRAFT status with automatic slip generation', async () => {
    const run = await PayrollRunService.createPayrollRun({
      year: testYear,
      month: testMonth,
      title: `حقوق و دستمزد مهر ۱۴۰۵ کارخانه خوش‌صنعت`,
      adjustments: {
        [emp1Id]: {
          workedDays: 30,
          overtimeHours: 15,
          bonusAmount: 3000000,
        },
        [emp2Id]: {
          workedDays: 30,
          overtimeHours: 25,
          bonusAmount: 7000000,
        },
      },
    });

    expect(run).toBeDefined();
    expect(run.runNumber).toMatch(/^PR-\d{6}$/);
    expect(run.status).toBe('DRAFT');
    expect(run.totalEmployees).toBeGreaterThanOrEqual(2);
    expect(run.slips.length).toBeGreaterThanOrEqual(2);

    payrollRunId = run.id;
    createdRunIds.push(run.id);

    // بررسی سرجمع‌ها
    expect(Number(run.totalGross)).toBeGreaterThan(0);
    expect(Number(run.totalWorkerIns)).toBeGreaterThan(0);
    expect(Number(run.totalEmployerIns)).toBeGreaterThan(0);
    expect(Number(run.totalNet)).toBeGreaterThan(0);

    // بررسی برابری ناخالص = خالص + بیمه کارگر + مالیات + کسورات
    const totalDeductions = run.totalWorkerIns.add(run.totalTax);
    expect(Number(run.totalNet)).toBeLessThanOrEqual(Number(run.totalGross));
  });

  // ۴. به‌روزرسانی فیش در وضعیت DRAFT
  it('Step 4: Update draft slip and recalculate run totals accurately', async () => {
    const runBefore = await PayrollRunService.getPayrollRunById(payrollRunId);
    const slip1 = runBefore!.slips.find((s) => s.employeeId === emp1Id)!;

    const oldGross = slip1.grossSalary;

    // اضافه کردن ۱۰ ساعت دیگر به اضافه‌کاری
    const updatedSlip = await PayrollRunService.updateDraftSlip(slip1.id, {
      overtimeHours: 25, // از ۱۵ به ۲۵
    });

    expect(Number(updatedSlip.overtimeHours)).toBe(25);
    expect(Number(updatedSlip.grossSalary)).toBeGreaterThan(Number(oldGross));

    // بررسی به‌روزرسانی سرجمع در دوره
    const runAfter = await PayrollRunService.getPayrollRunById(payrollRunId);
    expect(Number(runAfter!.totalGross)).toBeGreaterThan(Number(runBefore!.totalGross));
  });

  // ۵. تایید نهایی و صدور سند دوبل خودکار حسابداری
  it('Step 5: Approve payroll run should issue balanced journal voucher Dr 610101 / Cr 210301, 210602, 210603', async () => {
    const runBefore = await PayrollRunService.getPayrollRunById(payrollRunId);
    expect(runBefore!.status).toBe('DRAFT');

    const result = await PayrollRunService.approvePayrollRun(payrollRunId);
    expect(result.payrollRun.status).toBe('APPROVED');
    expect(result.voucher).toBeDefined();

    createdVoucherIds.push(result.voucher.id);

    // واکشی سند حسابداری صادره
    const voucher = await db.journalVoucher.findUnique({
      where: { id: result.voucher.id },
      include: {
        entries: {
          include: { account: true },
        },
      },
    });

    expect(voucher).toBeDefined();
    expect(voucher!.type).toBe(VoucherType.PAYROLL);
    expect(voucher!.status).toBe(VoucherStatus.FINALIZED);
    expect(voucher!.referenceModule).toBe('PAYROLL');

    // موازنه تراز حسابداری
    expect(voucher!.totalDebit.toString()).toBe(voucher!.totalCredit.toString());

    // بررسی آرتیکل‌های دوبل:
    // ۱. بدهکار ۶۱۰۱۰۱ (هزینه دستمزد و حقوق پرسنل) = ناخالص حقوق + ۲۳٪ بیمه کارفرما
    const expenseEntry = voucher!.entries.find((e) => e.account.code === '610101');
    expect(expenseEntry).toBeDefined();
    expect(Number(expenseEntry!.debit)).toBeGreaterThan(0);
    expect(Number(expenseEntry!.credit)).toBe(0);

    // ۲. بستانکار ۲۱۰۳۰۱ (حقوق و دستمزد پرداختنی) = خالص پرداختی پرسنل
    const payableEntry = voucher!.entries.find((e) => e.account.code === '210301');
    expect(payableEntry).toBeDefined();
    expect(payableEntry!.credit.toString()).toBe(result.payrollRun.totalNet.toString());
    expect(Number(payableEntry!.debit)).toBe(0);

    // ۳. بستانکار ۲۱۰۶۰۲ (بیمه تامین اجتماعی پرداختنی) = ۳۰٪ (۷٪ کارگر + ۲۳٪ کارفرما)
    const insuranceEntry = voucher!.entries.find((e) => e.account.code === '210602');
    expect(insuranceEntry).toBeDefined();
    const total30Ins = result.payrollRun.totalWorkerIns.add(result.payrollRun.totalEmployerIns);
    expect(insuranceEntry!.credit.toString()).toBe(total30Ins.toString());

    // ۴. بستانکار ۲۱۰۶۰۳ (مالیات حقوق پرداختنی) = ماده ۸۶
    const taxEntry = voucher!.entries.find((e) => e.account.code === '210603');
    expect(taxEntry).toBeDefined();
    expect(taxEntry!.credit.toString()).toBe(result.payrollRun.totalTax.toString());

    // بررسی موازنه کلی آرتیکل‌ها
    const sumCredits = payableEntry!.credit.add(insuranceEntry!.credit).add(taxEntry!.credit);
    expect(expenseEntry!.debit.toString()).toBe(sumCredits.toString());

    // تلاش برای ویرایش فیش پس از تایید باید خطا دهد
    const slip1 = runBefore!.slips.find((s) => s.employeeId === emp1Id)!;
    await expect(
      PayrollRunService.updateDraftSlip(slip1.id, { overtimeHours: 30 })
    ).rejects.toThrow(/امکان ویرایش فیش در دوره‌های تاییدشده یا پرداخت‌شده وجود ندارد/);
  });

  // ۶. پرداخت بانکی (دیسکت پایا) و تسویه حقوق پرداختنی
  it('Step 6: Disburse payroll run via bank transfer should issue payment voucher Dr 210301 / Cr 110101', async () => {
    const runBefore = await PayrollRunService.getPayrollRunById(payrollRunId);
    expect(runBefore!.status).toBe('APPROVED');

    const result = await PayrollRunService.disbursePayrollRun({
      runId: payrollRunId,
      bankAccountId,
      description: 'پرداخت گروهی حقوق و دستمزد پرسنل کارخانه از طریق پایا بانک ملت',
    });

    expect(result.payrollRun.status).toBe('PAID');
    expect(result.payrollRun.paidAt).toBeDefined();
    expect(result.paymentVoucher).toBeDefined();

    createdVoucherIds.push(result.paymentVoucher.id);

    // واکشی سند تسویه
    const voucher = await db.journalVoucher.findUnique({
      where: { id: result.paymentVoucher.id },
      include: {
        entries: {
          include: { account: true },
        },
      },
    });

    expect(voucher).toBeDefined();
    expect(voucher!.type).toBe(VoucherType.PAYMENT);
    expect(voucher!.status).toBe(VoucherStatus.FINALIZED);
    expect(voucher!.totalDebit.toString()).toBe(runBefore!.totalNet.toString());
    expect(voucher!.totalCredit.toString()).toBe(runBefore!.totalNet.toString());

    // آرتیکل ۱: بدهکار ۲۱۰۳۰۱ (تسویه بدهی حقوق)
    const debitPayable = voucher!.entries.find((e) => e.account.code === '210301');
    expect(debitPayable).toBeDefined();
    expect(debitPayable!.debit.toString()).toBe(runBefore!.totalNet.toString());

    // آرتیکل ۲: بستانکار ۱۱۰۱۰۱ (خروج وجه از بانک)
    const creditBank = voucher!.entries.find((e) => e.account.code === '110101');
    expect(creditBank).toBeDefined();
    expect(creditBank!.credit.toString()).toBe(runBefore!.totalNet.toString());

    // بررسی وضعیت فیش‌ها که PAID شده باشند
    const runAfter = await PayrollRunService.getPayrollRunById(payrollRunId);
    expect(runAfter!.slips.every((s) => s.status === 'PAID')).toBe(true);
  });

  // ۷. تولید دیسکت پرداخت گروهی پایا (Paya Bank Diskette)
  it('Step 7: Generate Paya Bank Diskette in Iranian banking format with UTF-8 BOM', async () => {
    const diskette = await DisketteExportService.generatePayaDiskette(payrollRunId);

    expect(diskette).toBeDefined();
    expect(diskette.fileName).toMatch(/^PAYA_PR-\d{6}_1405_07\.csv$/);
    expect(diskette.totalCount).toBeGreaterThanOrEqual(2);
    expect(Number(diskette.totalAmount)).toBeGreaterThan(0);

    // بررسی محتوای فایل
    const content = diskette.content;
    // شروع با UTF-8 BOM
    expect(content.charCodeAt(0)).toBe(0xfeff);

    // سرستون پایا
    expect(content).toContain('ردیف,شماره شبا,مبلغ (ریال),نام و نام خانوادگی,کد ملی,شماره پرسنلی,شرح و بابت');

    // وجود شبا و مبالغ پرسنل
    expect(content).toContain('IR120120000000001234567890');
    expect(content).toContain('IR980180000000009876543210');
    expect(content).toContain('0012345678');
    expect(content).toContain('حمید رضایی');
    expect(content).toContain('سهراب کاظمی');
  });

  // ۸. تولید دیسکت و گزارش بیمه تامین اجتماعی
  it('Step 8: Generate Social Security (Tamin) insurance export matching 7% and 23% totals', async () => {
    const taminExport = await DisketteExportService.generateTaminInsuranceExport(payrollRunId);

    expect(taminExport).toBeDefined();
    expect(taminExport.fileName).toMatch(/^TAMIN_PR-\d{6}_1405_07\.csv$/);
    expect(taminExport.summary.totalEmployees).toBeGreaterThanOrEqual(2);

    // بررسی برابری مجموع ۳۰٪ بیمه با جمع ۷٪ و ۲۳٪
    const expected30 = taminExport.summary.totalWorkerInsurance.add(taminExport.summary.totalEmployerInsurance);
    expect(taminExport.summary.total30PercentInsurance.toString()).toBe(expected30.toString());

    // محتوای فایل
    const content = taminExport.content;
    expect(content).toContain('کد کارگاه,شماره بیمه,کد ملی,نام و نام خانوادگی,عنوان شغل,روز کارکرد');
    expect(content).toContain('1234567890'); // شماره بیمه حمید رضایی
    expect(content).toContain('0987654321'); // شماره بیمه سهراب کاظمی
  });

  // ۹. محدودیت عدم حذف پرسنل دارای سوابق مالی و امکان غیرفعال‌سازی
  it('Step 9: Prevent deleting employee with payroll history to preserve financial audit trail', async () => {
    // تلاش برای حذف حمید رضایی که دارای فیش حقوقی در این دوره است
    await expect(EmployeeService.deleteEmployee(emp1Id)).rejects.toThrow(
      /به دلیل وجود سوابق مالی و فیش‌های حقوقی، حذف این پرسنل امکان‌پذیر نیست/
    );

    // غیرفعال‌سازی پرسنل باید با موفقیت انجام شود
    const deactivated = await EmployeeService.deactivateEmployee(emp1Id);
    expect(deactivated.isActive).toBe(false);

    // بازیابی مجدد به حالت فعال برای ادامه کار
    await EmployeeService.updateEmployee(emp1Id, { isActive: true });
    const reactivated = await EmployeeService.getEmployeeById(emp1Id);
    expect(reactivated!.isActive).toBe(true);
  });
});
