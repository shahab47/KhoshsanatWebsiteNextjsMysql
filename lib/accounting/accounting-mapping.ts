import db from '@/lib/db';
import { MappingTrigger, Prisma } from '@prisma/client';

export interface StandardMappingRule {
  trigger: MappingTrigger;
  debitAccountCode: string;
  creditAccountCode: string;
  description: string;
}

/**
 * کدهای استاندارد نقشه حساب‌های پیش‌فرض صنعت فولاد و اتصالات ساختمانی
 */
export const DEFAULT_ACCOUNTING_MAPPINGS: StandardMappingRule[] = [
  {
    trigger: MappingTrigger.SALES_INVOICE,
    debitAccountCode: '110301', // حساب‌های دریافتنی تجاری - مشتریان
    creditAccountCode: '410101', // درآمد حاصل از فروش قطعات و اتصالات
    description: 'سند شناسایی درآمد فروش و ایجاد حساب دریافتنی مشتری',
  },
  {
    trigger: MappingTrigger.SALES_SHIPMENT_COGS,
    debitAccountCode: '510101', // بهای تمام‌شده کالای فروش‌رفته (COGS)
    creditAccountCode: '110503', // موجودی کالای ساخته‌شده آماده بارگیری
    description: 'سند بهای تمام‌شده و خروج محصول نهایی از انبار به مشتری',
  },
  {
    trigger: MappingTrigger.CUSTOMER_RECEIPT,
    debitAccountCode: '110101', // موجودی نقد و بانک‌ها
    creditAccountCode: '110301', // حساب‌های دریافتنی تجاری - مشتریان
    description: 'سند وصول مطالبات و تسویه فاکتور مشتری',
  },
  {
    trigger: MappingTrigger.CUSTOMER_ADVANCE,
    debitAccountCode: '110101', // موجودی نقد و بانک‌ها
    creditAccountCode: '210201', // پیش‌دریافت از مشتریان (بستانکاران تجاری)
    description: 'سند دریافت پیش‌پرداخت و بیعانه مشتری قبل از فاکتور',
  },
  {
    trigger: MappingTrigger.SUPPLIER_PURCHASE,
    debitAccountCode: '110501', // موجودی مواد اولیه و مصالح فولادی
    creditAccountCode: '210101', // حساب‌های پرداختنی تجاری - تامین‌کنندگان
    description: 'سند خرید مواد اولیه، مقاطع و ورق فلزی با باسکول',
  },
  {
    trigger: MappingTrigger.SUPPLIER_PAYMENT,
    debitAccountCode: '210101', // حساب‌های پرداختنی تجاری - تامین‌کنندگان
    creditAccountCode: '110101', // موجودی نقد و بانک‌ها
    description: 'سند تسویه فاکتور خرید و پرداخت به تامین‌کننده',
  },
  {
    trigger: MappingTrigger.PAYROLL_EXPENSE,
    debitAccountCode: '610101', // هزینه دستمزد و حقوق پرسنل
    creditAccountCode: '210301', // حقوق و دستمزد پرداختنی
    description: 'سند شناسایی هزینه حقوق و مزایای ماهانه پرسنل کارخانه',
  },
  {
    trigger: MappingTrigger.INVENTORY_ADJUSTMENT,
    debitAccountCode: '610201', // هزینه کسری و انحراف انبارگردانی
    creditAccountCode: '110501', // موجودی مواد اولیه
    description: 'سند اصلاح انحراف مقداری و ریالی موجودی انبار',
  },
  {
    trigger: MappingTrigger.CHEQUE_RECEIPT,
    debitAccountCode: '110401', // اسناد دریافتنی تجاری - چک‌های نزد صندوق
    creditAccountCode: '110301', // حساب‌های دریافتنی تجاری - مشتریان
    description: 'سند دریافت چک صیادی از مشتری و واریز به صندوق اسناد',
  },
  {
    trigger: MappingTrigger.CHEQUE_DEPOSIT,
    debitAccountCode: '110402', // اسناد دریافتنی در جریان وصول (واگذار شده به بانک)
    creditAccountCode: '110401', // اسناد دریافتنی - چک‌های نزد صندوق
    description: 'سند واگذاری چک به بانک جهت وصول و خواباندن به حساب',
  },
  {
    trigger: MappingTrigger.CHEQUE_CLEAR,
    debitAccountCode: '110101', // موجودی نقد و بانک‌ها
    creditAccountCode: '110402', // اسناد دریافتنی در جریان وصول
    description: 'سند وصول قطعی چک صیادی و واریز وجه به حساب بانکی',
  },
  {
    trigger: MappingTrigger.CHEQUE_BOUNCE,
    debitAccountCode: '110301', // حساب‌های دریافتنی تجاری - مشتریان
    creditAccountCode: '110402', // اسناد دریافتنی در جریان وصول
    description: 'سند برگشت چک و احیای بدهی و مطالبات از مشتری',
  },
  {
    trigger: MappingTrigger.PETTY_CASH_FUNDING,
    debitAccountCode: '110201', // صندوق و تنخواه‌گردان کارخانه
    creditAccountCode: '110101', // موجودی نقد و بانک‌ها
    description: 'سند شارژ صندوق تنخواه‌گردان کارخانه از حساب بانکی',
  },
  {
    trigger: MappingTrigger.PETTY_CASH_SETTLEMENT,
    debitAccountCode: '610101', // هزینه‌های عمومی و اداری
    creditAccountCode: '110201', // صندوق و تنخواه‌گردان کارخانه
    description: 'سند تسویه صورت‌وضعیت هزینه‌های تنخواه‌گردان کارخانه',
  },
];

/**
 * موتور نگاشت داینامیک حساب‌ها (Accounting Mapping Engine)
 * این موتور مانع از Hard-code شدن شناسه‌های حساب در کدهای بیزینس می‌شود.
 */
export class AccountingMappingEngine {
  /**
   * استخراج نگاشت حساب‌های بدهکار و بستانکار برای یک رویداد مالی
   */
  static async getAccountsForTrigger(
    trigger: MappingTrigger,
    companyId?: string | null
  ): Promise<{
    debitAccountId: string;
    debitAccountCode: string;
    creditAccountId: string;
    creditAccountCode: string;
    description: string;
  }> {
    // ۱. بررسی نگاشت سفارشی‌سازی شده در دیتابیس
    const customMapping = await db.accountingMapping.findFirst({
      where: {
        trigger,
        isActive: true,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    if (customMapping) {
      return {
        debitAccountId: customMapping.debitAccountId,
        debitAccountCode: customMapping.debitAccount.code,
        creditAccountId: customMapping.creditAccountId,
        creditAccountCode: customMapping.creditAccount.code,
        description: customMapping.description || `نگاشت خودکار رویداد ${trigger}`,
      };
    }

    // ۲. در صورت نبود نگاشت سفارشی، استفاده از قوانین استاندارد و یافتن حساب‌ها با کد
    const defaultRule = DEFAULT_ACCOUNTING_MAPPINGS.find((r) => r.trigger === trigger);
    if (!defaultRule) {
      throw new Error(`هیچ قانون نگاشت پیش‌فرضی برای رویداد مالی ${trigger} تعریف نشده است.`);
    }

    const debitAcc = await db.account.findUnique({
      where: { code: defaultRule.debitAccountCode },
    });
    const creditAcc = await db.account.findUnique({
      where: { code: defaultRule.creditAccountCode },
    });

    if (!debitAcc || !creditAcc) {
      throw new Error(
        `حساب‌های پیش‌فرض برای رویداد ${trigger} یافت نشدند! کد بدهکار: ${defaultRule.debitAccountCode}، کد بستانکار: ${defaultRule.creditAccountCode}. لطفاً ابتدا سید جدول کدینگ حساب‌ها را اجرا کنید.`
      );
    }

    return {
      debitAccountId: debitAcc.id,
      debitAccountCode: debitAcc.code,
      creditAccountId: creditAcc.id,
      creditAccountCode: creditAcc.code,
      description: defaultRule.description,
    };
  }

  /**
   * ثبت یا به‌روزرسانی نگاشت یک رویداد مالی در دیتابیس
   */
  static async configureMapping(params: {
    trigger: MappingTrigger;
    debitAccountId: string;
    creditAccountId: string;
    description?: string;
    companyId?: string | null;
  }) {
    return await db.accountingMapping.upsert({
      where: {
        companyId_trigger: {
          companyId: params.companyId || '',
          trigger: params.trigger,
        },
      },
      create: {
        trigger: params.trigger,
        debitAccountId: params.debitAccountId,
        creditAccountId: params.creditAccountId,
        description: params.description,
        companyId: params.companyId || null,
      },
      update: {
        debitAccountId: params.debitAccountId,
        creditAccountId: params.creditAccountId,
        description: params.description,
      },
    });
  }
}
