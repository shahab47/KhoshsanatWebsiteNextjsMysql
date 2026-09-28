import db from '@/lib/db';
import { Prisma, VoucherStatus, OrderStatus } from '@prisma/client';

export interface CustomerCreditStatus {
  customerId: number;
  customerName: string;
  creditLimit: Prisma.Decimal;
  isCreditBlocked: boolean;
  creditBlockReason: string | null;
  riskRating: string;
  arLedgerBalance: Prisma.Decimal; // مانده بدهی دفتری در حساب معین مشتریان
  pendingChequesAmount: Prisma.Decimal; // اسناد دریافتنی در جریان وصول (چک‌ها)
  openOrdersAmount: Prisma.Decimal; // تعهدات سفارش‌های باز در حال تولید
  totalExposure: Prisma.Decimal; // کل ریسک تعهدات و بدهی مشتری
  availableCredit: Prisma.Decimal; // اعتبار آزاد قابل استفاده
  utilizationRate: number; // درصد استفاده از سقف اعتبار
  isOverLimit: boolean;
}

export class CreditService {
  /**
   * استعلام وضعیت جامع ریسک و سقف اعتبار مشتری بر اساس مانده دفتر معین و تعهدات باز
   */
  static async getCustomerCreditStatus(customerId: number): Promise<CustomerCreditStatus> {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(`مشتری با شناسه ${customerId} یافت نشد.`);
    }

    const creditLimit = new Prisma.Decimal(customer.creditLimit || 0);

    // ۱. استخراج مانده واقعی دفتر معین حساب‌های دریافتنی (Account Code: 110301)
    const arAccount = await db.account.findUnique({
      where: { code: '110301' },
    });

    let arLedgerBalance = new Prisma.Decimal(0);

    if (arAccount) {
      const entries = await db.journalEntry.findMany({
        where: {
          accountId: arAccount.id,
          detail1Id: customerId.toString(),
          voucher: {
            status: { in: [VoucherStatus.VERIFIED, VoucherStatus.FINALIZED] },
          },
        },
      });

      let debitSum = new Prisma.Decimal(0);
      let creditSum = new Prisma.Decimal(0);

      for (const entry of entries) {
        debitSum = debitSum.add(entry.debit);
        creditSum = creditSum.add(entry.credit);
      }

      arLedgerBalance = debitSum.sub(creditSum);
    } else {
      // در صورت عدم دسترسی به حساب، از فیلد تراز موجود در جدول مشتریان استفاده می‌شود
      arLedgerBalance = new Prisma.Decimal(customer.totalDebt || 0);
    }

    // ۲. محاسبه اسناد دریافتنی در جریان وصول (چک‌های ثبت‌شده سررسیدنرسیده)
    const pendingCheques = await db.payment.findMany({
      where: {
        customerId,
        paymentMethod: 'CHECK',
      },
    });

    const pendingChequesAmount = pendingCheques.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    );

    // ۳. محاسبه تعهدات سفارش‌های ساخت و تولید در دست اقدام (Open Orders)
    const openOrders = await db.productionOrder.findMany({
      where: {
        customerId,
        status: { in: [OrderStatus.PLANNED, OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CONTROL] },
      },
    });

    const openOrdersAmount = openOrders.reduce(
      (sum, ord) => sum.add(new Prisma.Decimal(ord.actualMaterialCost).add(ord.actualLaborCost)),
      new Prisma.Decimal(0)
    );

    // ۴. محاسبه کل ریسک مالی باز
    // Total Exposure = بدهی قطعی + چک‌های وصول‌نشده + سفارش‌های در حال ساخت
    const totalExposure = arLedgerBalance.add(pendingChequesAmount).add(openOrdersAmount);

    // ۵. محاسبه اعتبار در دسترس
    let availableCredit = new Prisma.Decimal(0);
    let utilizationRate = 0;
    let isOverLimit = false;

    if (creditLimit.gt(0)) {
      availableCredit = creditLimit.sub(totalExposure);
      utilizationRate = totalExposure.div(creditLimit).mul(100).toNumber();
      isOverLimit = totalExposure.gt(creditLimit);
    }

    return {
      customerId,
      customerName: customer.name,
      creditLimit,
      isCreditBlocked: customer.isCreditBlocked,
      creditBlockReason: customer.creditBlockReason,
      riskRating: customer.riskRating || 'A',
      arLedgerBalance,
      pendingChequesAmount,
      openOrdersAmount,
      totalExposure,
      availableCredit,
      utilizationRate: Math.max(0, Math.round(utilizationRate * 10) / 10),
      isOverLimit,
    };
  }

  /**
   * اعتبارسنجی ثبت فاکتور یا سفارش جدید قبل از صدور نهایی
   */
  static async validateNewInvoice(
    customerId: number,
    newInvoiceAmount: number | Prisma.Decimal
  ): Promise<{ allowed: boolean; reason?: string; status: CustomerCreditStatus }> {
    const status = await this.getCustomerCreditStatus(customerId);
    const invoiceAmt = new Prisma.Decimal(newInvoiceAmount);

    if (status.isCreditBlocked) {
      return {
        allowed: false,
        reason: `اعتبار این مشتری مسدود است: ${status.creditBlockReason || 'بدون توضیح'}`,
        status,
      };
    }

    if (status.creditLimit.gt(0)) {
      const projectedExposure = status.totalExposure.add(invoiceAmt);
      if (projectedExposure.gt(status.creditLimit)) {
        const excess = projectedExposure.sub(status.creditLimit);
        return {
          allowed: false,
          reason: `مبلغ فاکتور موجب تجاوز از سقف اعتبار مشتری می‌شود. سقف: ${status.creditLimit.toNumber().toLocaleString('fa-IR')} تومان، ریسک با این فاکتور: ${projectedExposure.toNumber().toLocaleString('fa-IR')} تومان (مازاد: ${excess.toNumber().toLocaleString('fa-IR')} تومان)`,
          status,
        };
      }
    }

    return {
      allowed: true,
      status,
    };
  }

  /**
   * تغییر و تنظیم سقف اعتبار و رتبه ریسک مشتری
   */
  static async updateCreditSettings(
    customerId: number,
    data: {
      creditLimit?: number | Prisma.Decimal;
      isCreditBlocked?: boolean;
      creditBlockReason?: string | null;
      riskRating?: string;
    }
  ) {
    return await db.customer.update({
      where: { id: customerId },
      data: {
        ...(data.creditLimit !== undefined ? { creditLimit: new Prisma.Decimal(data.creditLimit) } : {}),
        ...(data.isCreditBlocked !== undefined ? { isCreditBlocked: data.isCreditBlocked } : {}),
        ...(data.creditBlockReason !== undefined ? { creditBlockReason: data.creditBlockReason } : {}),
        ...(data.riskRating !== undefined ? { riskRating: data.riskRating } : {}),
      },
    });
  }
}
