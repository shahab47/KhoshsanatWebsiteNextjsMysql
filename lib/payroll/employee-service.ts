import db from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface CreateEmployeeInput {
  personnelCode?: string;
  nationalCode: string;
  insuranceNo?: string | null;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  phone?: string | null;
  jobTitle: string;
  department?: string; // PRODUCTION, LOGISTICS, SALES, FINANCE, ADMIN, ENGINEERING
  workshopCode?: string;
  baseDailyWage: number | Prisma.Decimal;
  housingAllowance?: number | Prisma.Decimal;
  foodSubsidy?: number | Prisma.Decimal;
  childCount?: number;
  childAllowance?: number | Prisma.Decimal;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIban?: string | null;
  maritalStatus?: string;
  hireDate?: Date | string;
  companyId?: string | null;
}

export interface UpdateEmployeeInput {
  insuranceNo?: string | null;
  firstName?: string;
  lastName?: string;
  fatherName?: string | null;
  phone?: string | null;
  jobTitle?: string;
  department?: string;
  workshopCode?: string;
  baseDailyWage?: number | Prisma.Decimal;
  housingAllowance?: number | Prisma.Decimal;
  foodSubsidy?: number | Prisma.Decimal;
  childCount?: number;
  childAllowance?: number | Prisma.Decimal;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIban?: string | null;
  maritalStatus?: string;
  isActive?: boolean;
}

export class EmployeeService {
  /**
   * اعتبارسنجی کد ملی ۱۰ رقمی ایرانی
   */
  public static isValidNationalCode(code: string): boolean {
    if (!/^\d{10}$/.test(code)) return false;
    const check = parseInt(code[9], 10);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(code[i], 10) * (10 - i);
    }
    const remainder = sum % 11;
    return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
  }

  /**
   * اعتبارسنجی شماره شبا بانکی ایران (IR + 24 رقم)
   */
  public static isValidIban(iban: string): boolean {
    if (!iban) return true;
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    if (!/^IR\d{24}$/.test(cleaned)) return false;
    return true;
  }

  /**
   * ثبت پرسنل جدید با شماره پرسنلی خودکار و اعتبارسنجی
   */
  static async createEmployee(input: CreateEmployeeInput) {
    const nationalCode = input.nationalCode.trim();
    if (!/^\d{10}$/.test(nationalCode)) {
      throw new Error('کد ملی باید دقیقا ۱۰ رقم عددی باشد.');
    }

    const existingByNational = await db.employee.findUnique({
      where: { nationalCode },
    });
    if (existingByNational) {
      throw new Error(`پرسنل دیگری با کد ملی ${nationalCode} قبلاً ثبت شده است.`);
    }

    let iban = input.bankIban?.trim().toUpperCase() || null;
    if (iban && !this.isValidIban(iban)) {
      throw new Error('فرمت شماره شبا نامعتبر است (باید با IR آغاز شده و ۲۶ کاراکتر باشد).');
    }

    let personnelCode = input.personnelCode?.trim();
    if (!personnelCode) {
      const { formattedNumber } = await SequenceService.nextNumber('EMPLOYEE', input.companyId);
      personnelCode = formattedNumber;
    } else {
      const existingByCode = await db.employee.findUnique({
        where: { personnelCode },
      });
      if (existingByCode) {
        throw new Error(`کد پرسنلی ${personnelCode} قبلاً به پرسنل دیگری اختصاص یافته است.`);
      }
    }

    // کارگاه پیش‌فرض کارخانه خوش‌صنعت پایدار
    const workshopCode = input.workshopCode || '0123456789';

    return await db.employee.create({
      data: {
        personnelCode,
        nationalCode,
        insuranceNo: input.insuranceNo || null,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        fatherName: input.fatherName || null,
        phone: input.phone || null,
        jobTitle: input.jobTitle.trim(),
        department: input.department || 'PRODUCTION',
        workshopCode,
        baseDailyWage: new Prisma.Decimal(input.baseDailyWage),
        housingAllowance: input.housingAllowance ? new Prisma.Decimal(input.housingAllowance) : new Prisma.Decimal(9000000),
        foodSubsidy: input.foodSubsidy ? new Prisma.Decimal(input.foodSubsidy) : new Prisma.Decimal(14000000),
        childCount: input.childCount ?? 0,
        childAllowance: input.childAllowance ? new Prisma.Decimal(input.childAllowance) : new Prisma.Decimal(0),
        bankName: input.bankName || null,
        bankAccount: input.bankAccount || null,
        bankIban: iban,
        maritalStatus: input.maritalStatus || 'MARRIED',
        hireDate: input.hireDate ? new Date(input.hireDate) : new Date(),
        companyId: input.companyId || null,
        isActive: true,
      },
    });
  }

  /**
   * ویرایش مشخصات پرسنل
   */
  static async updateEmployee(id: string, input: UpdateEmployeeInput) {
    if (input.bankIban && !this.isValidIban(input.bankIban)) {
      throw new Error('فرمت شماره شبا نامعتبر است.');
    }

    const data: Prisma.EmployeeUpdateInput = {};

    if (input.firstName !== undefined) data.firstName = input.firstName.trim();
    if (input.lastName !== undefined) data.lastName = input.lastName.trim();
    if (input.fatherName !== undefined) data.fatherName = input.fatherName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle.trim();
    if (input.department !== undefined) data.department = input.department;
    if (input.workshopCode !== undefined) data.workshopCode = input.workshopCode;
    if (input.insuranceNo !== undefined) data.insuranceNo = input.insuranceNo;
    if (input.bankName !== undefined) data.bankName = input.bankName;
    if (input.bankAccount !== undefined) data.bankAccount = input.bankAccount;
    if (input.bankIban !== undefined) data.bankIban = input.bankIban?.trim().toUpperCase() || null;
    if (input.maritalStatus !== undefined) data.maritalStatus = input.maritalStatus;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (input.baseDailyWage !== undefined) {
      data.baseDailyWage = new Prisma.Decimal(input.baseDailyWage);
    }
    if (input.housingAllowance !== undefined) {
      data.housingAllowance = new Prisma.Decimal(input.housingAllowance);
    }
    if (input.foodSubsidy !== undefined) {
      data.foodSubsidy = new Prisma.Decimal(input.foodSubsidy);
    }
    if (input.childCount !== undefined) {
      data.childCount = input.childCount;
    }
    if (input.childAllowance !== undefined) {
      data.childAllowance = new Prisma.Decimal(input.childAllowance);
    }

    return await db.employee.update({
      where: { id },
      data,
    });
  }

  /**
   * جستجو و فهرست پرسنل با فیلتر بخش و وضعیت
   */
  static async getEmployees(params?: {
    search?: string;
    department?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.EmployeeWhereInput = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.department) {
      where.department = params.department;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { personnelCode: { contains: q } },
        { nationalCode: { contains: q } },
        { jobTitle: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      db.employee.findMany({
        where,
        orderBy: { personnelCode: 'asc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 100,
        include: {
          _count: {
            select: { payslips: true },
          },
        },
      }),
      db.employee.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت مشخصات کامل یک پرسنل همراه با آخرین فیش‌های حقوقی
   */
  static async getEmployeeById(id: string) {
    return await db.employee.findUnique({
      where: { id },
      include: {
        payslips: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
      },
    });
  }

  /**
   * غیرفعال‌سازی وضعیت پرسنل (بدون حذف سوابق مالی)
   */
  static async deactivateEmployee(id: string) {
    return await db.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * حذف پرسنل (تنها در صورتی مجاز است که هیچ فیش حقوقی در سیستم نداشته باشد)
   */
  static async deleteEmployee(id: string) {
    const slipCount = await db.payrollSlip.count({
      where: { employeeId: id },
    });
    if (slipCount > 0) {
      throw new Error('به دلیل وجود سوابق مالی و فیش‌های حقوقی، حذف این پرسنل امکان‌پذیر نیست. می‌توانید وضعیت او را غیرفعال کنید.');
    }
    return await db.employee.delete({
      where: { id },
    });
  }
}
