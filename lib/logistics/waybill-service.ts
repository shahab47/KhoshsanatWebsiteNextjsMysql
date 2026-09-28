import { Prisma, FreightTerm } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface WaybillData {
  waybillNo?: string | null;
  driverName?: string | null;
  driverNationalId?: string | null;
  driverPhone?: string | null;
  truckPlate?: string | null;
  shippingCompany?: string | null;
  freightCost?: number | Prisma.Decimal;
  freightPaymentTerm?: FreightTerm;
}

export class WaybillService {
  /**
   * تولید شماره تصاعدی بارنامه دولتی / حمل و نقل جاده‌ای
   */
  static async nextWaybillNo(companyId?: string | null, tx?: Prisma.TransactionClient) {
    const { formattedNumber } = await SequenceService.nextNumber('WAYBILL', companyId, tx);
    return formattedNumber;
  }

  /**
   * اعتبارسنجی اطلاعات باربری، راننده و ناوگان حمل جاده‌ای
   */
  static validateWaybillInfo(data: WaybillData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.driverNationalId) {
      const nid = data.driverNationalId.trim();
      if (!/^\d{10}$/.test(nid)) {
        errors.push('کد ملی راننده باید دقیقاً یک عدد ۱۰ رقمی معتبر باشد.');
      }
    }

    if (data.driverPhone) {
      const phone = data.driverPhone.trim();
      if (!/^09\d{9}$/.test(phone)) {
        errors.push('شماره تلفن راننده باید با ۰۹ شروع شده و ۱۱ رقم باشد.');
      }
    }

    if (data.freightCost !== undefined && data.freightCost !== null) {
      const cost = new Prisma.Decimal(data.freightCost);
      if (cost.isNegative()) {
        errors.push('مبلغ کرایه حمل نمی‌تواند منفی باشد.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
