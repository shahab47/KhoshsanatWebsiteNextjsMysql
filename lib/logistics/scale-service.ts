import { Prisma } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface ScaleWeightCalculationResult {
  scaleGrossKg: Prisma.Decimal;
  scaleTareKg: Prisma.Decimal;
  scaleNetKg: Prisma.Decimal;
  nominalWeightKg: Prisma.Decimal | null;
  weightVariancePercent: Prisma.Decimal | null;
  isToleranceExceeded: boolean;
  message: string;
}

export class ScaleService {
  public static readonly DEFAULT_TOLERANCE_PERCENT = 2.0; // ۲ درصد حد مجاز مغایرت وزنی در صنعت فولاد ایران

  /**
   * محاسبه دقیق وزن خالص باسکول و کنترل تلورانس مغایرت با وزن اسمی مهندسی
   * فرمول منبع واحد حقیقت: Net = Gross - Tare
   * فرمول مغایرت: Variance% = (|Net - Nominal| / Nominal) * 100
   */
  static calculateScaleWeights(params: {
    scaleGrossKg: number | string | Prisma.Decimal;
    scaleTareKg: number | string | Prisma.Decimal;
    nominalWeightKg?: number | string | Prisma.Decimal | null;
    tolerancePercent?: number;
  }): ScaleWeightCalculationResult {
    const gross = new Prisma.Decimal(params.scaleGrossKg || 0);
    const tare = new Prisma.Decimal(params.scaleTareKg || 0);
    const tolerance = params.tolerancePercent ?? this.DEFAULT_TOLERANCE_PERCENT;

    if (gross.lte(0)) {
      throw new Error('وزن ناخالص تریلی بر روی باسکول (وزن پر) باید بزرگتر از صفر باشد.');
    }

    if (tare.lt(0)) {
      throw new Error('وزن خالی تریلی (تارا) نمی‌تواند منفی باشد.');
    }

    if (gross.lte(tare)) {
      throw new Error(
        `خطای منطقی توزین: وزن ناخالص تریلی (${gross.toString()} کیلوگرم) نمی‌تواند کمتر یا مساوی وزن خالی (${tare.toString()} کیلوگرم) باشد.`
      );
    }

    const net = gross.sub(tare);

    let nominal: Prisma.Decimal | null = null;
    let variancePercent: Prisma.Decimal | null = null;
    let isToleranceExceeded = false;
    let message = `وزن خالص باسکول: ${net.toNumber().toLocaleString('fa-IR')} کیلوگرم.`;

    if (params.nominalWeightKg !== undefined && params.nominalWeightKg !== null) {
      nominal = new Prisma.Decimal(params.nominalWeightKg);
      if (nominal.gt(0)) {
        // محاسبه قدرمطلق اختلاف
        const diff = net.sub(nominal).abs();
        const rawVariance = diff.div(nominal).mul(100);
        variancePercent = new Prisma.Decimal(Math.round(rawVariance.toNumber() * 100) / 100);

        if (variancePercent.gt(tolerance)) {
          isToleranceExceeded = true;
          message = `⚠️ اخطار مغایرت وزنی با باسکول: اختلاف ${variancePercent.toString()}% فراتر از حد مجاز استاندارد (${tolerance}%) است. وزن باسکول: ${net.toNumber().toLocaleString('fa-IR')} ک‌گ، وزن اسمی: ${nominal.toNumber().toLocaleString('fa-IR')} ک‌گ (اختلاف: ${diff.toNumber().toLocaleString('fa-IR')} ک‌گ).`;
        } else {
          message = `✅ تطابق استاندارد: اختلاف وزنی ${variancePercent.toString()}% در محدوده مجاز تلورانس باسکول (${tolerance}%) قرار دارد.`;
        }
      }
    }

    return {
      scaleGrossKg: gross,
      scaleTareKg: tare,
      scaleNetKg: net,
      nominalWeightKg: nominal,
      weightVariancePercent: variancePercent,
      isToleranceExceeded,
      message,
    };
  }

  /**
   * تولید شماره سریال تصاعدی قبض باسکول دیجیتال
   */
  static async nextScaleTicketNo(companyId?: string | null, tx?: Prisma.TransactionClient) {
    const { formattedNumber } = await SequenceService.nextNumber('SCALE_TICKET', companyId, tx);
    return formattedNumber;
  }
}
