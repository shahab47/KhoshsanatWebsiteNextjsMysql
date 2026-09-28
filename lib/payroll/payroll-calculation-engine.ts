import { Prisma } from '@prisma/client';

export interface CalculationInput {
  baseDailyWage: Prisma.Decimal | number; // دستمزد پایه روزانه (ریال)
  workedDays: number; // روزهای کارکرد (معمولاً ۳۰ یا ۳۱)
  housingAllowance?: Prisma.Decimal | number; // حق مسکن مصوب (پیش‌فرض ۹,۰۰۰,۰۰۰ ریال)
  foodSubsidy?: Prisma.Decimal | number; // بن خواربار (پیش‌فرض ۱۴,۰۰۰,۰۰۰ ریال)
  childCount?: number; // تعداد فرزندان
  childAllowance?: Prisma.Decimal | number; // در صورت ورود مستقیم
  overtimeHours?: Prisma.Decimal | number; // ساعات اضافه‌کاری
  bonusAmount?: Prisma.Decimal | number; // پاداش و کارانه
  otherAdditions?: Prisma.Decimal | number; // سایر مزایا
  otherDeductions?: Prisma.Decimal | number; // سایر کسورات (مساعده، وام و...)
  monthlyTaxExemption?: Prisma.Decimal | number; // سقف معافیت ماهانه مالیات ماده ۸۴ (پیش‌فرض ۱۲۰,۰۰۰,۰۰۰ ریال)
}

export interface CalculationResult {
  baseSalary: Prisma.Decimal;
  housingAllowance: Prisma.Decimal;
  foodSubsidy: Prisma.Decimal;
  childAllowance: Prisma.Decimal;
  overtimeHours: Prisma.Decimal;
  overtimeAmount: Prisma.Decimal;
  bonusAmount: Prisma.Decimal;
  otherAdditions: Prisma.Decimal;
  grossSalary: Prisma.Decimal;
  insuredEarnings: Prisma.Decimal;
  insuranceWorker: Prisma.Decimal; // ۷٪
  insuranceEmployer: Prisma.Decimal; // ۲۳٪
  taxExemptAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  incomeTax: Prisma.Decimal;
  otherDeductions: Prisma.Decimal;
  netSalary: Prisma.Decimal;
}

/**
 * موتور محاسباتی حقوق و دستمزد منطبق بر قانون کار و تامین اجتماعی و مالیات‌های مستقیم جمهوری اسلامی ایران
 */
export class PayrollCalculationEngine {
  // مبالغ پیش‌فرض مصوب شورای عالی کار (ریال)
  public static readonly DEFAULT_HOUSING_ALLOWANCE = new Prisma.Decimal(9000000); // ۹۰۰ هزار تومان
  public static readonly DEFAULT_FOOD_SUBSIDY = new Prisma.Decimal(14000000); // ۱.۴ میلیون تومان
  public static readonly DEFAULT_TAX_EXEMPTION_MONTHLY = new Prisma.Decimal(120000000); // ۱۲ میلیون تومان سقف معافیت ماهانه

  /**
   * محاسبه فیش حقوقی پرسنل با دقت اعشاری و بدون خطای ممیز شناور
   */
  public static calculate(input: CalculationInput): CalculationResult {
    const dailyWage = new Prisma.Decimal(input.baseDailyWage || 0);
    const days = Math.max(0, input.workedDays);

    // ۱. دستمزد پایه = روزهای کارکرد × مزد روزانه
    const baseSalary = dailyWage.mul(days).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    // ۲. مزایای رفاهی و انگیزشی
    const housing = input.housingAllowance !== undefined
      ? new Prisma.Decimal(input.housingAllowance)
      : this.DEFAULT_HOUSING_ALLOWANCE;

    const food = input.foodSubsidy !== undefined
      ? new Prisma.Decimal(input.foodSubsidy)
      : this.DEFAULT_FOOD_SUBSIDY;

    // ۳. حق اولاد: طبق ماده ۸۶ قانون تامین اجتماعی (۳ برابر حداقل مزد روزانه برای هر فرزند)
    let child = new Prisma.Decimal(0);
    if (input.childAllowance !== undefined) {
      child = new Prisma.Decimal(input.childAllowance);
    } else if (input.childCount && input.childCount > 0) {
      child = dailyWage.mul(3).mul(input.childCount).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    }

    // ۴. اضافه‌کاری: ماده ۵۹ قانون کار (نرخ ساعت = مزد روزانه / ۷.۳۳۳، با ضریب ۱.۴)
    const otHours = new Prisma.Decimal(input.overtimeHours || 0);
    let otAmount = new Prisma.Decimal(0);
    if (otHours.gt(0) && dailyWage.gt(0)) {
      // ساعت کار قانونی روزانه ۷ ساعت و ۲۰ دقیقه = ۷.۳۳۳۳ ساعت
      const hourlyRate = dailyWage.div(new Prisma.Decimal('7.333333'));
      const otHourlyRate = hourlyRate.mul(new Prisma.Decimal('1.4'));
      otAmount = otHours.mul(otHourlyRate).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    }

    const bonus = new Prisma.Decimal(input.bonusAmount || 0);
    const otherAdd = new Prisma.Decimal(input.otherAdditions || 0);
    const otherDed = new Prisma.Decimal(input.otherDeductions || 0);

    // ۵. جمع ناخالص حقوق و مزایا
    const grossSalary = baseSalary
      .add(housing)
      .add(food)
      .add(child)
      .add(otAmount)
      .add(bonus)
      .add(otherAdd)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    // ۶. درآمد مشمول بیمه (حق اولاد طبق قانون از بیمه معاف است)
    const insuredEarnings = baseSalary
      .add(housing)
      .add(food)
      .add(otAmount)
      .add(bonus)
      .add(otherAdd)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    // ۷. بیمه تامین اجتماعی: ۷٪ سهم کارگر و ۲۳٪ سهم کارفرما (۲۰٪ عادی + ۳٪ بیکاری)
    const insuranceWorker = insuredEarnings
      .mul(new Prisma.Decimal('0.07'))
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    const insuranceEmployer = insuredEarnings
      .mul(new Prisma.Decimal('0.23'))
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    // ۸. مالیات بر درآمد حقوق (ماده ۸۴ و ۸۶ قانون مالیات‌های مستقیم)
    // طبق بخشنامه‌های مالیاتی، ۲ هفتم سهم بیمه کارگر و حق اولاد از درآمد مشمول مالیات کسر می‌شود
    const taxExemptInsurancePortion = insuranceWorker
      .mul(new Prisma.Decimal(2))
      .div(new Prisma.Decimal(7))
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    const taxableBase = grossSalary
      .sub(child)
      .sub(taxExemptInsurancePortion);

    const taxExemption = input.monthlyTaxExemption !== undefined
      ? new Prisma.Decimal(input.monthlyTaxExemption)
      : this.DEFAULT_TAX_EXEMPTION_MONTHLY;

    // درآمد مشمول مازاد بر سقف معافیت
    const taxableAmount = Prisma.Decimal.max(new Prisma.Decimal(0), taxableBase.sub(taxExemption));

    // محاسبه پله‌های تصاعدی مالیاتی سالانه/ماهانه
    const incomeTax = this.calculateProgressiveTax(taxableAmount);

    // ۹. خالص حقوق پرداختی = ناخالص - بیمه کارگر - مالیات - سایر کسورات
    const netSalary = grossSalary
      .sub(insuranceWorker)
      .sub(incomeTax)
      .sub(otherDed)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

    return {
      baseSalary,
      housingAllowance: housing,
      foodSubsidy: food,
      childAllowance: child,
      overtimeHours: otHours,
      overtimeAmount: otAmount,
      bonusAmount: bonus,
      otherAdditions: otherAdd,
      grossSalary,
      insuredEarnings,
      insuranceWorker,
      insuranceEmployer,
      taxExemptAmount: taxExemption,
      taxableAmount,
      incomeTax,
      otherDeductions: otherDed,
      netSalary,
    };
  }

  /**
   * محاسبه مالیات پلکانی مازاد بر سقف معافیت ماهانه:
   * تا ۴۵,۰۰۰,۰۰۰ ریال مازاد: ۱۰٪
   * از ۴۵,۰۰۰,۰۰۰ تا ۱۵۰,۰۰۰,۰۰۰ ریال: ۱۵٪
   * از ۱۵۰,۰۰۰,۰۰۰ تا ۲۸۰,۰۰۰,۰۰۰ ریال: ۲۰٪
   * مازاد بر ۲۸۰,۰۰۰,۰۰۰ ریال: ۳۰٪
   */
  private static calculateProgressiveTax(taxableSurplus: Prisma.Decimal): Prisma.Decimal {
    if (taxableSurplus.lte(0)) {
      return new Prisma.Decimal(0);
    }

    let remaining = taxableSurplus;
    let tax = new Prisma.Decimal(0);

    // پله اول: ۴۵ میلیون ریال با نرخ ۱۰٪
    const bracket1Limit = new Prisma.Decimal(45000000);
    const bracket1Amount = Prisma.Decimal.min(remaining, bracket1Limit);
    tax = tax.add(bracket1Amount.mul(new Prisma.Decimal('0.10')));
    remaining = remaining.sub(bracket1Amount);

    if (remaining.lte(0)) {
      return tax.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    }

    // پله دوم: ۱۰۵ میلیون ریال (از ۴۵ تا ۱۵۰) با نرخ ۱۵٪
    const bracket2Limit = new Prisma.Decimal(105000000);
    const bracket2Amount = Prisma.Decimal.min(remaining, bracket2Limit);
    tax = tax.add(bracket2Amount.mul(new Prisma.Decimal('0.15')));
    remaining = remaining.sub(bracket2Amount);

    if (remaining.lte(0)) {
      return tax.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    }

    // پله سوم: ۱۳۰ میلیون ریال (از ۱۵۰ تا ۲۸۰) با نرخ ۲۰٪
    const bracket3Limit = new Prisma.Decimal(130000000);
    const bracket3Amount = Prisma.Decimal.min(remaining, bracket3Limit);
    tax = tax.add(bracket3Amount.mul(new Prisma.Decimal('0.20')));
    remaining = remaining.sub(bracket3Amount);

    if (remaining.lte(0)) {
      return tax.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    }

    // پله چهارم: مبالغ مازاد با نرخ ۳۰٪
    tax = tax.add(remaining.mul(new Prisma.Decimal('0.30')));

    return tax.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  }
}
