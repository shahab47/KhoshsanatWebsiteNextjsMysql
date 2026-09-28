import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, OrderStatus, TransactionType } from '@prisma/client';
import { BOMService } from '@/lib/production/bom-service';
import { WorkOrderService } from '@/lib/production/work-order-service';
import { JobCostingService } from '@/lib/costing/job-costing-service';
import { InventoryService } from '@/lib/warehouse/inventory-service';

describe('Phase 6: Production Engineering, BOM, Work Orders & WIP Job Costing Integration', () => {
  let testCustomerId: number;
  let testRawMaterialId: number;
  let testFinishedProductId: number;
  let testRawWarehouseId: string;
  let testFgWarehouseId: string;
  let testScrapWarehouseId: string;

  const createdBomIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    // ۱. دریافت یا ایجاد انبارهای سه‌گانه تولید
    const rawWh = await db.warehouse.findUnique({ where: { code: 'WH-RAW-01' } });
    const fgWh = await db.warehouse.findUnique({ where: { code: 'WH-FG-01' } });
    const scrapWh = await db.warehouse.findUnique({ where: { code: 'WH-SCRAP-01' } });

    testRawWarehouseId = rawWh!.id;
    testFgWarehouseId = fgWh!.id;
    testScrapWarehouseId = scrapWh!.id;

    // ۲. ایجاد مشتری تست
    const customer = await db.customer.create({
      data: {
        name: 'شرکت سازه‌های صنعتی پارس متال (تست تولید)',
        email: `pars_metal_${Date.now()}@example.com`,
        phone: '02188991122',
        company: 'پارس متال',
        nationalId: `1400${Date.now().toString().slice(-7)}`,
        economicCode: '411888999000',
        creditLimit: 800_000_000,
        riskRating: 'LOW',
      },
    });
    testCustomerId = customer.id;

    // ۳. ایجاد ماده اولیه تست (تسمه و ورق فولادی ST37)
    let subcat = await db.subcategory.findFirst();
    if (!subcat) {
      const cat = await db.category.findFirst() || await db.category.create({
        data: { title: 'فولاد و مقاطع ساختمانی', slug: `steel-cat-${Date.now()}` },
      });
      subcat = await db.subcategory.create({
        data: { title: 'مقاطع ساختمانی', categoryId: cat.id },
      });
    }

    const rawMat = await db.product.create({
      data: {
        title: 'تسمه فولادی ۵۰×۱۰ ST37 تست تولید',
        slug: `steel-strip-${Date.now()}`,
        imageUrl: '/strip.png',
        subcategoryId: subcat.id,
        description: 'تسمه فولادی نورد گرم',
        isRawMaterial: true,
      },
    });
    testRawMaterialId = rawMat.id;

    // ۴. ایجاد محصول نهایی تست (تیرورق ساخته‌شده H-300)
    const finishedProd = await db.product.create({
      data: {
        title: 'تیرورق H-300 مونتاژ شده تست تولید',
        slug: `built-up-beam-${Date.now()}`,
        imageUrl: '/beam.png',
        subcategoryId: subcat.id,
        description: 'تیرورق سنگین سوله با جوش زیرپودری',
        isRawMaterial: false,
      },
    });
    testFinishedProductId = finishedProd.id;

    // ۵. شارژ اولیه موجودی ماده اولیه در انبار مواد اولیه (WH-RAW-01) با نرخ میانگین موزون مشخص
    // ورود ۵,۰۰۰ کیلوگرم با نرخ ۳۰,۰۰۰ تومان/کیلو = ۱۵۰,۰۰۰,۰۰۰ تومان
    await InventoryService.recordReceipt({
      warehouseId: testRawWarehouseId,
      productId: testRawMaterialId,
      quantity: 5_000,
      purchaseUnitPrice: 30_000,
      referenceNo: 'INIT-PROD-TEST',
    });
  });

  afterAll(async () => {
    try {
      for (const orderId of createdOrderIds) {
        await db.productionOrder.delete({ where: { id: orderId } }).catch(() => {});
      }
      for (const bomId of createdBomIds) {
        await db.bOMItem.deleteMany({ where: { bomId } }).catch(() => {});
        await db.bOM.delete({ where: { id: bomId } }).catch(() => {});
      }
      if (testFinishedProductId) {
        await db.product.delete({ where: { id: testFinishedProductId } }).catch(() => {});
      }
      if (testRawMaterialId) {
        await db.product.delete({ where: { id: testRawMaterialId } }).catch(() => {});
      }
      if (testCustomerId) {
        await db.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
      }
    } catch (err) {
      console.warn('Cleanup error in production tests:', err);
    }
  });

  // =========================================================================
  // ۱. تست فرمول ساخت مهندسی (BOM) و برآورد بهای استاندارد
  // =========================================================================
  describe('۱. Bill of Materials (BOM) & Standard Costing', () => {
    let testBomId: string;

    it('باید فرمول ساخت استاندارد (BOM) با کد یکتای BOM-XXXXXX و ضرایب مصرف و پرت ثبت گردد', async () => {
      // فرمول ساخت ۱ عدد تیرورق: نیاز به ۲۰۰ کیلو تسمه فولادی با ۳٪ ضایعات برش + ۲ ساعت کار
      const bom = await BOMService.createBOM({
        productId: testFinishedProductId,
        title: 'فرمول ساخت تیرورق H-300 سوله',
        laborHours: 2.0,
        overheadRate: 40_000,
        description: 'دستورالعمل برش، مونتاژ شابلونی و جوشکاری زیرپودری',
        items: [
          {
            rawMaterialId: testRawMaterialId,
            quantity: 200, // ۲۰۰ کیلو
            wastePercent: 3.0, // ۳٪ پرت برشکاری
          },
        ],
      });

      expect(bom).toBeDefined();
      expect(bom.code).toMatch(/^BOM-\d{6}$/);
      expect(bom.title).toBe('فرمول ساخت تیرورق H-300 سوله');
      expect(bom.items).toHaveLength(1);
      expect(Number(bom.items[0].quantity)).toBe(200);
      expect(Number(bom.items[0].wastePercent)).toBe(3.0);

      testBomId = bom.id;
      createdBomIds.push(bom.id);
    });

    it('باید بهای تمام‌شده استاندارد فرمول ساخت را از روی آخرین نرخ میانگین موزون انبار محاسبه کند', async () => {
      // مصرف ناخالص = ۲۰۰ * ۱.۰۳ = ۲۰۶ کیلوگرم
      // بهای متریال = ۲۰۶ * ۳۰,۰۰۰ تومان = ۶,۱۸۰,۰۰۰ تومان
      // دستمزد استاندارد = ۲ ساعت * ۱۵۰,۰۰۰ تومان = ۳۰۰,۰۰۰ تومان
      // سربار استاندارد = ۲ ساعت * ۴۰,۰۰۰ تومان = ۸۰,۰۰۰ تومان
      // جمع کل بهای استاندارد هر عدد = ۶,۵۶۰,۰۰۰ تومان
      const costInfo = await BOMService.calculateStandardCost(testBomId, 'WH-RAW-01');

      expect(costInfo).toBeDefined();
      expect(costInfo.bomId).toBe(testBomId);
      expect(Number(costInfo.totalMaterialStandardCost)).toBe(6_180_000);
      expect(Number(costInfo.directLaborStandardCost)).toBe(300_000);
      expect(Number(costInfo.overheadStandardCost)).toBe(80_000);
      expect(Number(costInfo.totalStandardCost)).toBe(6_560_000);
    });
  });

  // =========================================================================
  // ۲. تست صدور دستور کار ساخت و بررسی موجودی مواد (Material Availability)
  // =========================================================================
  describe('۲. Work Order Lifecycle & Stock Check', () => {
    let testOrderId: string;

    it('باید کفایت موجودی مواد اولیه را برای تیراژ درخواستی ارزیابی کند', async () => {
      // تیراژ درخواستی: ۱۰ عدد تیرورق
      // نیاز: ۱۰ * ۲۰۶ کیلو = ۲,۰۶۰ کیلوگرم
      // موجودی انبار: ۵,۰۰۰ کیلوگرم -> بدون کسری (canProduce = true)
      const availability = await WorkOrderService.checkMaterialAvailability(
        createdBomIds[0],
        10,
        'WH-RAW-01'
      );

      expect(availability.canProduce).toBe(true);
      expect(availability.materials[0].isAvailable).toBe(true);
      expect(Number(availability.materials[0].requiredQuantity)).toBe(2_060);
      expect(Number(availability.materials[0].currentStock)).toBe(5_000);
    });

    it('باید دستور کار ساخت جدید را با کد یکتای WO-XXXXXX و وضعیت PLANNED ثبت کند', async () => {
      const order = await WorkOrderService.createWorkOrder({
        customerId: testCustomerId,
        bomId: createdBomIds[0],
        targetQuantity: 10,
        priority: 'HIGH',
        description: 'تیرورق‌های پروژه سوله شادآباد',
      });

      expect(order).toBeDefined();
      expect(order.orderNumber).toMatch(/^WO-\d{6}$/);
      expect(order.status).toBe(OrderStatus.PLANNED);
      expect(order.priority).toBe('HIGH');
      expect(Number(order.targetQuantity)).toBe(10);
      expect(Number(order.actualQuantity)).toBe(0);
      expect(Number(order.actualMaterialCost)).toBe(0);

      testOrderId = order.id;
      createdOrderIds.push(order.id);
    });

    it('باید دستور کار را وارد خط تولید (IN_PRODUCTION) کند', async () => {
      const started = await WorkOrderService.startWorkOrder(testOrderId);
      expect(started.status).toBe(OrderStatus.IN_PRODUCTION);
      expect(started.startDate).toBeDefined();
    });
  });

  // =========================================================================
  // ۳. تست حواله مصرف مواد اولیه و سند حسابداری در جریان ساخت (WIP)
  // =========================================================================
  describe('۳. Material Issuance to WIP & Accounting Voucher', () => {
    it('باید حواله خروج متریال صادر شده، از انبار کسر و سند دوبل (Dr: ۱۱۰۵۰۲ / Cr: ۱۱۰۵۰۱) صادر شود', async () => {
      // صدور حواله خروج ۲,۰۶۰ کیلوگرم تسمه به خط تولید
      // ۲,۰۶۰ کیلو * ۳۰,۰۰۰ تومان = ۶۱,۸۰۰,۰۰۰ تومان
      const result = await JobCostingService.issueMaterialsToProduction({
        productionOrderId: createdOrderIds[0],
        rawMaterialWarehouseCode: 'WH-RAW-01',
        items: [
          {
            rawMaterialId: testRawMaterialId,
            quantity: 2_060,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(Number(result.materialCostAdded)).toBe(61_800_000);
      expect(Number(result.order.actualMaterialCost)).toBe(61_800_000);

      // بررسی سند حسابداری دوبل:
      const voucher = await db.journalVoucher.findUnique({
        where: { id: result.voucherId },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(voucher!.status).toBe('FINALIZED');
      expect(Number(voucher!.totalDebit)).toBe(61_800_000);
      expect(Number(voucher!.totalCredit)).toBe(61_800_000);

      // بدهکار: ۱۱۰۵۰۲ کالای در جریان ساخت
      const wipEntry = voucher!.entries.find((e) => e.account.code === '110502');
      expect(wipEntry).toBeDefined();
      expect(Number(wipEntry!.debit)).toBe(61_800_000);

      // بستانکار: ۱۱۰۵۰۱ مواد اولیه
      const rawEntry = voucher!.entries.find((e) => e.account.code === '110501');
      expect(rawEntry).toBeDefined();
      expect(Number(rawEntry!.credit)).toBe(61_800_000);

      // بررسی موجودی انبار مواد اولیه: ۵,۰۰۰ - ۲,۰۶۰ = ۲,۹۴۰ کیلوگرم باقی‌مانده
      const stock = await InventoryService.getCurrentStockAndAverageCost(testRawWarehouseId, testRawMaterialId);
      expect(Number(stock.currentQuantity)).toBe(2_940);
    });
  });

  // =========================================================================
  // ۴. تست تسهیم دستمزد مستقیم و سربار ساخت
  // =========================================================================
  describe('۴. Direct Labor & Overhead Absorption', () => {
    it('باید دستمزد و سربار خط جذب سفارش کار شده و سند دوبل (Dr: ۱۱۰۵۰۲ / Cr: ۶۱۰۱۰۱) ثبت شود', async () => {
      // تسهیم ۳ میلیون دستمزد + ۱ میلیون سربار = ۴ میلیون تومان
      const result = await JobCostingService.absorbLaborAndOverhead({
        productionOrderId: createdOrderIds[0],
        directLaborCost: 3_000_000,
        allocatedOverheadCost: 1_000_000,
      });

      expect(result).toBeDefined();
      expect(Number(result.totalAbsorbed)).toBe(4_000_000);
      expect(Number(result.order.actualLaborCost)).toBe(3_000_000);
      expect(Number(result.order.actualOverheadCost)).toBe(1_000_000);

      const voucher = await db.journalVoucher.findUnique({
        where: { id: result.voucherId },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(Number(voucher!.totalDebit)).toBe(4_000_000);
      expect(Number(voucher!.totalCredit)).toBe(4_000_000);

      const wipEntry = voucher!.entries.find((e) => e.account.code === '110502');
      expect(wipEntry).toBeDefined();
      expect(Number(wipEntry!.debit)).toBe(4_000_000);

      const laborEntry = voucher!.entries.find((e) => e.account.code === '610101');
      expect(laborEntry).toBeDefined();
      expect(Number(laborEntry!.credit)).toBe(4_000_000);
    });
  });

  // =========================================================================
  // ۵. تست بازیافت قراضه و ضایعات برشکاری (Scrap Recovery)
  // =========================================================================
  describe('۵. Scrap Metal Recovery & Net WIP Costing', () => {
    it('باید قراضه به انبار ضایعات منتقل و بهای متریال سفارش کار کسر گردد (Dr: ۱۱۰۵۰۴ / Cr: ۱۱۰۵۰۲)', async () => {
      // ایجاد ۶۰ کیلوگرم قراضه برش با نرخ بازیافتی ۲۰,۰۰۰ تومان/کیلو = ۱,۲۰۰,۰۰۰ تومان
      const result = await JobCostingService.recordScrapGeneration({
        productionOrderId: createdOrderIds[0],
        scrapProductId: testRawMaterialId,
        scrapWarehouseCode: 'WH-SCRAP-01',
        scrapQuantity: 60,
        scrapUnitRecoveryPrice: 20_000,
      });

      expect(result).toBeDefined();
      expect(Number(result.scrapValueRecovered)).toBe(1_200_000);
      // بهای متریال خالص: ۶۱,۸۰۰,۰۰۰ - ۱,۲۰۰,۰۰۰ = ۶۰,۶۰۰,۰۰۰ تومان
      expect(Number(result.order.actualMaterialCost)).toBe(60_600_000);

      const voucher = await db.journalVoucher.findUnique({
        where: { id: result.voucherId },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(Number(voucher!.totalDebit)).toBe(1_200_000);
      expect(Number(voucher!.totalCredit)).toBe(1_200_000);

      // بدهکار: انبار ضایعات و قراضه (۱۱۰۵۰۴)
      const scrapEntry = voucher!.entries.find((e) => e.account.code === '110504');
      expect(scrapEntry).toBeDefined();
      expect(Number(scrapEntry!.debit)).toBe(1_200_000);

      // بستانکار: کالای در جریان ساخت (۱۱۰۵۰۲)
      const wipEntry = voucher!.entries.find((e) => e.account.code === '110502');
      expect(wipEntry).toBeDefined();
      expect(Number(wipEntry!.credit)).toBe(1_200_000);
    });
  });

  // =========================================================================
  // ۶. تست تکمیل نهایی دستور کار، محاسبه COGM و رسید به انبار محصول نهایی
  // =========================================================================
  describe('۶. Job Order Completion & Finished Goods Receipt (COGM)', () => {
    it('باید بهای تمام‌شده کل (COGM) محاسبه، محصول نهایی وارد انبار و سند دوبل (Dr: ۱۱۰۵۰۳ / Cr: ۱۱۰۵۰۲) صادر شود', async () => {
      // کل بهای تمام‌شده ساخت (COGM):
      // متریال خالص: ۶۰,۶۰۰,۰۰۰ تومان
      // دستمزد مستقیم: ۳,۰۰۰,۰۰۰ تومان
      // سربار ساخت: ۱,۰۰۰,۰۰۰ تومان
      // جمع COGM = ۶۴,۶۰۰,۰۰۰ تومان
      // تیراژ تکمیل شده: ۱۰ عدد
      // بهای واحد هر تیرورق = ۶,۴۶۰,۰۰۰ تومان
      const result = await JobCostingService.completeJobOrder({
        productionOrderId: createdOrderIds[0],
        finishedGoodsWarehouseCode: 'WH-FG-01',
        completedQuantity: 10,
      });

      expect(result).toBeDefined();
      expect(Number(result.totalCOGM)).toBe(64_600_000);
      expect(Number(result.unitCost)).toBe(6_460_000);
      expect(result.order.status).toBe(OrderStatus.COMPLETED);
      expect(Number(result.order.actualQuantity)).toBe(10);
      expect(Number(result.order.finalCostPerUnit)).toBe(6_460_000);
      expect(result.order.completionDate).toBeDefined();

      // بررسی سند حسابداری دوبل محصول ساخته شده:
      const voucher = await db.journalVoucher.findUnique({
        where: { id: result.voucherId },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(voucher!.status).toBe('FINALIZED');
      expect(Number(voucher!.totalDebit)).toBe(64_600_000);
      expect(Number(voucher!.totalCredit)).toBe(64_600_000);

      // بدهکار: موجودی کالای ساخته‌شده آماده بارگیری (۱۱۰۵۰۳)
      const fgEntry = voucher!.entries.find((e) => e.account.code === '110503');
      expect(fgEntry).toBeDefined();
      expect(Number(fgEntry!.debit)).toBe(64_600_000);

      // بستانکار: کالای در جریان ساخت (۱۱۰۵۰۲)
      const wipEntry = voucher!.entries.find((e) => e.account.code === '110502');
      expect(wipEntry).toBeDefined();
      expect(Number(wipEntry!.credit)).toBe(64_600_000);

      // بررسی ورود به کاردکس انبار کالای ساخته‌شده (WH-FG-01):
      const fgStock = await InventoryService.getCurrentStockAndAverageCost(testFgWarehouseId, testFinishedProductId);
      expect(Number(fgStock.currentQuantity)).toBe(10);
      expect(Number(fgStock.averageCost)).toBe(6_460_000);
      expect(Number(fgStock.currentTotalCost)).toBe(64_600_000);
    });
  });
});
