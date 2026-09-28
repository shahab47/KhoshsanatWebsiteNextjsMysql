import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, DeliveryStatus, TransactionType, VoucherType, VoucherStatus, FreightTerm } from '@prisma/client';
import { ScaleService } from '@/lib/logistics/scale-service';
import { WaybillService } from '@/lib/logistics/waybill-service';
import { DeliveryService } from '@/lib/logistics/delivery-service';

describe('Phase 3: Digital Scale Tickets, Waybills, Warehouse Outbound & COGS Integration', () => {
  let testCustomerId: number;
  let testDeliveryId: number;
  let fgWarehouseId: string;

  beforeAll(async () => {
    // ۱. ایجاد مشتری تست لجستیک
    const testCustomer = await db.customer.create({
      data: {
        name: 'مجتمع ساختمانی فولاد البرز (تست لجستیک و باسکول)',
        email: `alborz_logistics_${Date.now()}@example.com`,
        phone: '02177665544',
        company: 'فولاد البرز',
        nationalId: `1400${Date.now().toString().slice(-7)}`,
        economicCode: '411888999111',
        postalCode: '1666677777',
      },
    });
    testCustomerId = testCustomer.id;

    // ۲. یافتن انبار محصول نهایی
    const fgWh = await db.warehouse.findFirst({
      where: { type: 'FINISHED_GOODS' },
    });
    if (fgWh) {
      fgWarehouseId = fgWh.id;
    } else {
      const createdWh = await db.warehouse.create({
        data: {
          code: 'WH-FG-TEST',
          name: 'انبار تست محصول نهایی',
          type: 'FINISHED_GOODS',
        },
      });
      fgWarehouseId = createdWh.id;
    }
  });

  afterAll(async () => {
    // پاکسازی داده‌های تست
    if (testDeliveryId) {
      const del = await db.delivery.findUnique({
        where: { id: testDeliveryId },
        select: { stockTransactionId: true, journalVoucherId: true },
      });

      await db.delivery.deleteMany({ where: { id: testDeliveryId } });

      if (del?.stockTransactionId) {
        await db.stockTransaction.deleteMany({ where: { id: del.stockTransactionId } });
      }

      if (del?.journalVoucherId) {
        await db.journalEntry.deleteMany({ where: { voucherId: del.journalVoucherId } });
        await db.journalVoucher.deleteMany({ where: { id: del.journalVoucherId } });
      }
    }

    if (testCustomerId) {
      await db.delivery.deleteMany({ where: { customerId: testCustomerId } });
      await db.customer.deleteMany({ where: { id: testCustomerId } });
    }
  });

  // ========================================================
  // آزمون‌های محاسبات ریاضی و منطق باسکول دیجیتال (ScaleService)
  // ========================================================
  describe('Digital Scale Weighing Calculations (Single Source of Truth)', () => {
    it('باید وزن خالص را بر اساس فرمول Net = Gross - Tare دقیق محاسبه کند', () => {
      const result = ScaleService.calculateScaleWeights({
        scaleGrossKg: 28500, // وزن تریلی پر بر روی باسکول
        scaleTareKg: 11200,  // وزن خالی تریلی (تارا)
      });

      expect(result.scaleGrossKg.toNumber()).toBe(28500);
      expect(result.scaleTareKg.toNumber()).toBe(11200);
      expect(result.scaleNetKg.toNumber()).toBe(17300); // 28500 - 11200 = 17300 kg
      expect(result.isToleranceExceeded).toBe(false);
    });

    it('باید در صورت بروز خطای منطقی اوزان (وزن پر کمتر از خالی یا منفی) استثنا پرتاب کند', () => {
      // وزن ناخالص کمتر از خالی
      expect(() => {
        ScaleService.calculateScaleWeights({
          scaleGrossKg: 10000,
          scaleTareKg: 12000,
        });
      }).toThrowError(/خطای منطقی توزین/);

      // وزن ناخالص صفر یا منفی
      expect(() => {
        ScaleService.calculateScaleWeights({
          scaleGrossKg: 0,
          scaleTareKg: 0,
        });
      }).toThrowError(/باید بزرگتر از صفر باشد/);

      // وزن خالی منفی
      expect(() => {
        ScaleService.calculateScaleWeights({
          scaleGrossKg: 20000,
          scaleTareKg: -500,
        });
      }).toThrowError(/نمی‌تواند منفی باشد/);
    });

    it('باید درصد مغایرت را با وزن اسمی سنجیده و تلورانس مجاز ۲ درصد را کنترل نماید', () => {
      // حالت ۱: اختلاف ۰.۵۸٪ (کمتر از ۲٪ => مجاز)
      const validTolerance = ScaleService.calculateScaleWeights({
        scaleGrossKg: 25000,
        scaleTareKg: 10000, // خالص = 15000
        nominalWeightKg: 15088, // اسمی
      });

      expect(validTolerance.scaleNetKg.toNumber()).toBe(15000);
      expect(validTolerance.isToleranceExceeded).toBe(false);
      expect(validTolerance.weightVariancePercent?.toNumber()).toBeLessThanOrEqual(2.0);

      // حالت ۲: اختلاف ۶.۶۷٪ (بیشتر از ۲٪ => هشدار تخلف از تلورانس مجاز)
      const exceededTolerance = ScaleService.calculateScaleWeights({
        scaleGrossKg: 26000,
        scaleTareKg: 10000, // خالص = 16000
        nominalWeightKg: 15000, // اسمی => اختلاف ۱۰۰۰ کیلوگرم = ۶.۶۷٪
      });

      expect(exceededTolerance.scaleNetKg.toNumber()).toBe(16000);
      expect(exceededTolerance.isToleranceExceeded).toBe(true);
      expect(exceededTolerance.weightVariancePercent?.toNumber()).toBe(6.67);
      expect(exceededTolerance.message).toContain('اخطار مغایرت وزنی با باسکول');
    });

    it('باید شماره قبض باسکول را به صورت اتومیک و پیشوند استاندارد تولید کند', async () => {
      const ticketNo = await ScaleService.nextScaleTicketNo();
      expect(ticketNo).toMatch(/^SCL-\d{6}$/);
    });
  });

  // ========================================================
  // آزمون‌های اعتبارسنجی بارنامه و ناوگان ترابری (WaybillService)
  // ========================================================
  describe('Waybill & Fleet Logistics Validation (WaybillService)', () => {
    it('باید کد ملی ۱۰ رقمی راننده و موبایل ۱۱ رقمی را اعتبارسنجی کند', () => {
      // داده‌های معتبر
      const valid = WaybillService.validateWaybillInfo({
        driverName: 'عباس اکبری',
        driverNationalId: '0012345678',
        driverPhone: '09121112233',
        truckPlate: '22 ع 456 ایران 77',
        freightCost: 4500000,
        freightPaymentTerm: FreightTerm.PAID_BY_CUSTOMER,
      });
      expect(valid.isValid).toBe(true);
      expect(valid.errors.length).toBe(0);

      // داده‌های نامعتبر
      const invalid = WaybillService.validateWaybillInfo({
        driverNationalId: '12345', // کمتر از ۱۰ رقم
        driverPhone: '02188889999', // تلفن ثابت به جای ۰۹
        freightCost: -1000, // مبلغ منفی
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.length).toBe(3);
    });

    it('باید شماره بارنامه دولتی را به صورت اتمیک تولید کند', async () => {
      const waybillNo = await WaybillService.nextWaybillNo();
      expect(waybillNo).toMatch(/^WAY-\d{6}$/);
    });
  });

  // ========================================================
  // آزمون چرخه حیات تحویل کالا، کسر انبار و صدور خودکار COGS
  // ========================================================
  describe('Delivery Lifecycle, Warehouse Outbound & Automated COGS Posting', () => {
    it('باید رکورد تحویل بار جدید را به همراه توزین باسکول و بارنامه ثبت کند', async () => {
      const delivery = await DeliveryService.createDelivery({
        customerId: testCustomerId,
        productName: 'پروفیل مهندسی گالوانیزه رده ۴۰ ساختمانی',
        quantity: 50,
        unit: 'شاخه',
        deliveryDate: new Date(),
        status: DeliveryStatus.PENDING,
        warehouseId: fgWarehouseId,
        description: 'بارگیری آزمایشی تست یکپارچگی فاز ۳',

        // بارنامه
        waybillNo: 'WAY-999001',
        driverName: 'حمیدرضا صادقی',
        driverNationalId: '0076543210',
        driverPhone: '09123456789',
        truckPlate: '34 ب 789 ایران 21',
        shippingCompany: 'باربری پیشتاز ترابر',
        freightCost: 6500000,
        freightPaymentTerm: FreightTerm.PAID_BY_CUSTOMER,

        // باسکول
        scaleGrossKg: 24500,
        scaleTareKg: 9500,
        nominalWeightKg: 15000,
        scaleTicketNo: 'SCL-888001',
      });

      expect(delivery).toBeDefined();
      expect(delivery?.id).toBeGreaterThan(0);
      testDeliveryId = delivery!.id;

      expect(delivery?.deliveryNo).toMatch(/^DEL-\d{6}$/);
      expect(delivery?.status).toBe(DeliveryStatus.PENDING);
      expect(Number(delivery?.scaleGrossKg)).toBe(24500);
      expect(Number(delivery?.scaleTareKg)).toBe(9500);
      expect(Number(delivery?.scaleNetKg)).toBe(15000); // 24500 - 9500
      expect(delivery?.isToleranceExceeded).toBe(false);
      expect(delivery?.driverName).toBe('حمیدرضا صادقی');
      expect(delivery?.truckPlate).toBe('34 ب 789 ایران 21');
    });

    it('باید با تایید تحویل (DELIVERED)، خروج انبار ثبت شده و سند دوبل COGS صادر شود', async () => {
      expect(testDeliveryId).toBeDefined();

      const fulfilled = await DeliveryService.fulfillDelivery(testDeliveryId);

      expect(fulfilled.status).toBe(DeliveryStatus.DELIVERED);
      expect(fulfilled.stockTransactionId).toBeDefined();
      expect(fulfilled.journalVoucherId).toBeDefined();

      // ۱. بررسی گردش انبار (StockTransaction)
      const stockTxn = await db.stockTransaction.findUnique({
        where: { id: fulfilled.stockTransactionId! },
      });
      expect(stockTxn).toBeDefined();
      expect(stockTxn?.type).toBe(TransactionType.DELIVERY_NOTE);
      expect(stockTxn?.warehouseId).toBe(fgWarehouseId);
      expect(Number(stockTxn?.quantity)).toBe(15000); // بر مبنای وزن خالص باسکول (Single Source of Truth)

      // ۲. بررسی سند دوبل حسابداری بهای تمام‌شده (JournalVoucher)
      const voucher = await db.journalVoucher.findUnique({
        where: { id: fulfilled.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(voucher?.status).toBe(VoucherStatus.FINALIZED);
      expect(voucher?.type).toBe(VoucherType.SALES);
      expect(voucher?.referenceModule).toBe('DELIVERY_SHIPMENT');
      expect(voucher?.referenceId).toBe(testDeliveryId.toString());

      // سند باید کاملاً متوازن باشد: بدهکار = بستانکار
      expect(Number(voucher?.totalDebit)).toBeGreaterThan(0);
      expect(Number(voucher?.totalDebit)).toBe(Number(voucher?.totalCredit));

      // بررسی آرتیکل بدهکار: بهای تمام‌شده کالای فروش‌رفته (کد ۵۱۰۱۰۱)
      const debitEntry = voucher?.entries.find((e) => e.account.code === '510101');
      expect(debitEntry).toBeDefined();
      expect(Number(debitEntry?.debit)).toBeGreaterThan(0);
      expect(Number(debitEntry?.credit)).toBe(0);
      expect(debitEntry?.detail1Type).toBe('CUSTOMER');
      expect(debitEntry?.detail1Id).toBe(testCustomerId.toString());

      // بررسی آرتیکل بستانکار: موجودی محصول نهایی آماده بارگیری (کد ۱۱۰۵۰۳)
      const creditEntry = voucher?.entries.find((e) => e.account.code === '110503');
      expect(creditEntry).toBeDefined();
      expect(Number(creditEntry?.credit)).toBeGreaterThan(0);
      expect(Number(creditEntry?.debit)).toBe(0);
    });

    it('باید با برگشت تحویل بار (RETURNED)، سند معکوس بهای تمام‌شده صادر گردد', async () => {
      expect(testDeliveryId).toBeDefined();

      const reversedDelivery = await DeliveryService.reverseDelivery(
        testDeliveryId,
        'انصراف خریدار و عودت محموله به انبار'
      );

      expect(reversedDelivery.status).toBe(DeliveryStatus.RETURNED);

      // بررسی صدور سند معکوس (REVERSAL)
      const reversalVoucher = await db.journalVoucher.findFirst({
        where: {
          type: VoucherType.REVERSAL,
          description: { contains: reversedDelivery.deliveryNo },
        },
      });

      expect(reversalVoucher).toBeDefined();
      expect(reversalVoucher?.status).toBe(VoucherStatus.FINALIZED);
      expect(Number(reversalVoucher?.totalDebit)).toBe(Number(reversalVoucher?.totalCredit));
    });
  });

  // ========================================================
  // آزمون اصل عدم تخریب سوابق تاریخی (Historical Invariant)
  // ========================================================
  describe('Historical Delivery Preservation Invariant', () => {
    it('باید تضمین کند که رکورد تاریخی شماره ۵ (DEL-000001) بدون تغییر و آسیب در دیتابیس پایدار مانده است', async () => {
      const historicalDelivery = await db.delivery.findUnique({
        where: { id: 5 },
        include: { customer: true },
      });

      expect(historicalDelivery).toBeDefined();
      expect(historicalDelivery?.deliveryNo).toBe('DEL-000001');
      expect(historicalDelivery?.customerId).toBe(4);
      expect(historicalDelivery?.quantity).toBe(23);
      expect(historicalDelivery?.productName).toBeDefined();
      expect(historicalDelivery?.signatureUrl).toBeDefined();
      expect(historicalDelivery?.attachments).toBeDefined();
    });
  });
});
