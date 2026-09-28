import db from '@/lib/db';
import { Prisma } from '@prisma/client';

export type SequenceCode =
  | 'VOUCHER'
  | 'INVOICE'
  | 'RECEIPT'
  | 'PAYMENT'
  | 'WAYBILL'
  | 'SCALE_TICKET'
  | 'DELIVERY'
  | 'WORK_ORDER'
  | 'CHEQUE'
  | 'PETTY_CASH'
  | 'SUPPLIER'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'SUPPLIER_INVOICE'
  | 'SUPPLIER_PAYMENT'
  | 'BOM'
  | 'EMPLOYEE'
  | 'PAYROLL_RUN';

const DEFAULT_PREFIXES: Record<SequenceCode, string> = {
  VOUCHER: 'SAN-',
  INVOICE: 'INV-',
  RECEIPT: 'REC-',
  PAYMENT: 'PAY-',
  WAYBILL: 'WAY-',
  SCALE_TICKET: 'SCL-',
  DELIVERY: 'DEL-',
  WORK_ORDER: 'WO-',
  CHEQUE: 'CHQ-',
  PETTY_CASH: 'PC-',
  SUPPLIER: 'SUP-',
  PURCHASE_ORDER: 'PO-',
  GOODS_RECEIPT: 'GRN-',
  SUPPLIER_INVOICE: 'SINV-',
  SUPPLIER_PAYMENT: 'SPAY-',
  BOM: 'BOM-',
  EMPLOYEE: 'EMP-',
  PAYROLL_RUN: 'PR-',
};

/**
 * سرویس شماره‌گذاری اتمیک و ایمن در برابر Concurrency برای کلیه اسناد مالی و عملیاتی
 */
export class SequenceService {
  /**
   * دریافت شماره سریال بعدی به همراه پیشوند استاندارد با تضمین اتمیک بودن در تراکنش دیتابیس
   */
  static async nextNumber(
    code: SequenceCode,
    companyId?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<{ formattedNumber: string; rawNumber: number }> {
    const client = tx || db;

    // ۱. اطمینان از وجود رکورد شمارنده
    let seq = await client.documentSequence.findUnique({
      where: { code },
    });

    if (!seq) {
      let initialVal = 0;
      if (code === 'VOUCHER') {
        const lastV = await client.journalVoucher.findFirst({
          orderBy: { voucherNo: 'desc' },
          select: { voucherNo: true },
        });
        initialVal = lastV?.voucherNo ?? 1000;
      } else if (code === 'DELIVERY') {
        const lastD = await client.delivery.findFirst({
          orderBy: { id: 'desc' },
          select: { deliveryNo: true },
        });
        if (lastD?.deliveryNo) {
          const numPart = parseInt(lastD.deliveryNo.replace(/\D/g, '') || '0', 10);
          initialVal = Math.max(initialVal, numPart);
        }
      }
      seq = await client.documentSequence.create({
        data: {
          code,
          prefix: DEFAULT_PREFIXES[code] || `${code}-`,
          currentVal: initialVal,
          padLength: 6,
          companyId: companyId || null,
        },
      });
    }

    // ۲. بررسی حداکثر شماره موجود در اسناد برای جلوگیری از Unique Constraint
    if (code === 'VOUCHER') {
      const lastVoucher = await client.journalVoucher.findFirst({
        orderBy: { voucherNo: 'desc' },
        select: { voucherNo: true },
      });
      if (lastVoucher && seq.currentVal < lastVoucher.voucherNo) {
        seq = await client.documentSequence.update({
          where: { code },
          data: { currentVal: lastVoucher.voucherNo },
        });
      }
    } else if (code === 'DELIVERY') {
      const lastD = await client.delivery.findFirst({
        orderBy: { id: 'desc' },
        select: { deliveryNo: true },
      });
      if (lastD?.deliveryNo) {
        const numPart = parseInt(lastD.deliveryNo.replace(/\D/g, '') || '0', 10);
        if (seq.currentVal < numPart) {
          seq = await client.documentSequence.update({
            where: { code },
            data: { currentVal: numPart },
          });
        }
      }
    }

    // ۳. افزایش اتمیک شمارنده
    const sequence = await client.documentSequence.update({
      where: { code },
      data: {
        currentVal: {
          increment: 1,
        },
      },
      select: {
        prefix: true,
        currentVal: true,
        padLength: true,
      },
    });

    const formatted = `${sequence.prefix}${String(sequence.currentVal).padStart(sequence.padLength, '0')}`;

    return {
      formattedNumber: formatted,
      rawNumber: sequence.currentVal,
    };
  }

  /**
   * همگام‌سازی و تنظیم مقدار کف شمارنده
   */
  static async setFloorValue(
    code: SequenceCode,
    floorValue: number,
    companyId?: string | null
  ): Promise<void> {
    const existing = await db.documentSequence.findUnique({
      where: { code },
    });

    if (!existing) {
      await db.documentSequence.create({
        data: {
          code,
          prefix: DEFAULT_PREFIXES[code] || `${code}-`,
          currentVal: floorValue,
          padLength: 6,
          companyId: companyId || null,
        },
      });
    } else if (existing.currentVal < floorValue) {
      await db.documentSequence.update({
        where: { code },
        data: { currentVal: floorValue },
      });
    }
  }
}
