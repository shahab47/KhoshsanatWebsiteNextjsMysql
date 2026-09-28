import db from '@/lib/db';
import { Prisma, OrderStatus, TransactionType, VoucherType } from '@prisma/client';
import { InventoryService } from '@/lib/warehouse/inventory-service';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';

export interface IssueMaterialsInput {
  productionOrderId: string;
  rawMaterialWarehouseCode?: string; // پیش‌فرض: WH-RAW-01
  items: Array<{
    rawMaterialId: number;
    quantity: number | Prisma.Decimal;
  }>;
}

export interface AbsorbLaborAndOverheadInput {
  productionOrderId: string;
  directLaborCost: number | Prisma.Decimal;
  allocatedOverheadCost: number | Prisma.Decimal;
  description?: string;
}

export interface RecordScrapInput {
  productionOrderId: string;
  scrapProductId: number;
  scrapWarehouseCode?: string; // پیش‌فرض: WH-SCRAP-01
  scrapQuantity: number | Prisma.Decimal;
  scrapUnitRecoveryPrice: number | Prisma.Decimal;
  referenceNo?: string;
}

export interface FinalizeJobOrderInput {
  productionOrderId: string;
  finishedGoodsWarehouseCode?: string; // پیش‌فرض: WH-FG-01
  completedQuantity: number | Prisma.Decimal;
  directLaborCost?: number | Prisma.Decimal;
  allocatedOverheadCost?: number | Prisma.Decimal;
}

/**
 * سرویس بهای تمام‌شده صنعتی سفارش کار (Job Order Costing) و گردش کالای در جریان ساخت (WIP)
 */
export class JobCostingService {
  /**
   * ۱. صدور حواله مصرف مواد اولیه به خط تولید (Issue Materials to WIP)
   * ثبت خروج از انبار مواد اولیه و صدور سند دوبل مالی:
   * Dr: کالای در جریان ساخت (۱۱۰۵۰۲)
   * Cr: موجودی مواد اولیه و مصالح فولادی (۱۱۰۵۰۱)
   */
  static async issueMaterialsToProduction(input: IssueMaterialsInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: input.productionOrderId },
        include: { bom: { include: { product: true } } },
      });

      if (!order) throw new Error('دستور کار مورد نظر یافت نشد.');
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        throw new Error('این دستور کار قبلاً خاتمه یافته یا لغو شده است.');
      }

      const rawWhCode = input.rawMaterialWarehouseCode || 'WH-RAW-01';
      const rawWh = await tx.warehouse.findUnique({ where: { code: rawWhCode } });
      if (!rawWh) throw new Error(`انبار مواد اولیه (${rawWhCode}) یافت نشد.`);

      let totalGrossMaterialCost = new Prisma.Decimal(0);

      // ثبت تراکنش‌های خروج انبار به نرخ میانگین موزون متحرک
      for (const item of input.items) {
        const qty = new Prisma.Decimal(item.quantity);
        if (qty.lte(0)) continue;

        // استعلام نرخ میانگین فعلی
        const stockInfo = await InventoryService.getCurrentStockAndAverageCost(
          rawWh.id,
          item.rawMaterialId
        );

        if (stockInfo.currentQuantity.lt(qty)) {
          throw new Error(
            `کسری موجودی ماده اولیه (کد ${item.rawMaterialId}) در انبار مواد اولیه! موجودی: ${stockInfo.currentQuantity}، مقدار درخواستی: ${qty}`
          );
        }

        const itemTotalCost = qty.mul(stockInfo.averageCost);
        totalGrossMaterialCost = totalGrossMaterialCost.add(itemTotalCost);

        await tx.stockTransaction.create({
          data: {
            warehouseId: rawWh.id,
            productId: item.rawMaterialId,
            type: TransactionType.ISSUE_TO_PRODUCTION,
            quantity: qty,
            unitCost: stockInfo.averageCost,
            totalCost: itemTotalCost,
            referenceNo: order.orderNumber,
          },
        });
      }

      // صدور سند حسابداری دوبل انتقال مواد به کالای در جریان ساخت
      const wipAccount = await tx.account.findUnique({ where: { code: '110502' } });
      const rawMatAccount = await tx.account.findUnique({ where: { code: '110501' } });

      if (!wipAccount || !rawMatAccount) {
        throw new Error('حساب‌های معین ۱۱۰۵۰۲ یا ۱۱۰۵۰۱ در درخت حساب‌ها تعریف نشده‌اند.');
      }

      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: کالای در جریان ساخت (WIP)
        {
          accountId: wipAccount.id,
          detail1Type: 'WORK_ORDER',
          detail1Id: order.orderNumber,
          debit: totalGrossMaterialCost,
          credit: new Prisma.Decimal(0),
          description: `حواله مصرف متریال به خط تولید دستور کار ${order.orderNumber} (${order.bom.product.title})`,
        },
        // بستانکار: انبار مواد اولیه و مقاطع فولادی
        {
          accountId: rawMatAccount.id,
          detail1Type: 'WAREHOUSE',
          detail1Id: rawWh.id,
          debit: new Prisma.Decimal(0),
          credit: totalGrossMaterialCost,
          description: `خروج مواد اولیه از ${rawWh.name} بابت دستور کار ${order.orderNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند حواله مصرف مواد اولیه به خط تولید دستور کار ${order.orderNumber}`,
          type: VoucherType.GENERAL,
          referenceModule: 'ISSUE_TO_PRODUCTION',
          referenceId: order.id,
          idempotencyKey: `ISSUE-${order.id}-${Date.now()}`,
          companyId,
          entries,
        },
        tx
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

      // به‌روزرسانی دستور کار
      const updatedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          actualMaterialCost: {
            increment: totalGrossMaterialCost,
          },
          status: OrderStatus.IN_PRODUCTION,
          issueVoucherId: finalized.id,
          startDate: order.startDate || new Date(),
        },
        include: {
          customer: true,
          bom: { include: { product: true } },
        },
      });

      return {
        order: updatedOrder,
        materialCostAdded: totalGrossMaterialCost,
        voucherId: finalized.id,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * ۲. تسهیم دستمزد مستقیم و سربار جذب شده ساخت (Direct Labor & Overhead Absorption)
   * Dr: کالای در جریان ساخت (۱۱۰۵۰۲)
   * Cr: هزینه دستمزد تولیدی جذب شده (۶۱۰۱۰۱)
   */
  static async absorbLaborAndOverhead(input: AbsorbLaborAndOverheadInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: input.productionOrderId },
        include: { bom: { include: { product: true } } },
      });

      if (!order) throw new Error('دستور کار مورد نظر یافت نشد.');

      const labor = new Prisma.Decimal(input.directLaborCost || 0);
      const overhead = new Prisma.Decimal(input.allocatedOverheadCost || 0);
      const totalAbsorption = labor.add(overhead);

      if (totalAbsorption.lte(0)) {
        throw new Error('مبلغ دستمزد یا سربار جذب شده باید بزرگتر از صفر باشد.');
      }

      const wipAccount = await tx.account.findUnique({ where: { code: '110502' } });
      const laborAccount = await tx.account.findUnique({ where: { code: '610101' } });

      if (!wipAccount || !laborAccount) {
        throw new Error('حساب‌های معین ۱۱۰۵۰۲ یا ۶۱۰۱۰۱ یافت نشدند.');
      }

      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: کالای در جریان ساخت (WIP)
        {
          accountId: wipAccount.id,
          detail1Type: 'WORK_ORDER',
          detail1Id: order.orderNumber,
          debit: totalAbsorption,
          credit: new Prisma.Decimal(0),
          description: `تسهیم دستمزد مستقیم و سربار جذب شده دستور کار ${order.orderNumber}`,
        },
        // بستانکار: حساب دستمزد / سربار جذب شده ساخت
        {
          accountId: laborAccount.id,
          debit: new Prisma.Decimal(0),
          credit: totalAbsorption,
          description: `جذب دستمزد و سربار ساخت در سفارش کار ${order.orderNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند تسهیم دستمزد و سربار ساخت دستور کار شماره ${order.orderNumber}`,
          type: VoucherType.GENERAL,
          referenceModule: 'LABOR_OVERHEAD_ABSORPTION',
          referenceId: order.id,
          idempotencyKey: `ABSORB-${order.id}-${Date.now()}`,
          companyId,
          entries,
        },
        tx
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

      const updated = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          actualLaborCost: { increment: labor },
          actualOverheadCost: { increment: overhead },
        },
      });

      return {
        order: updated,
        totalAbsorbed: totalAbsorption,
        voucherId: finalized.id,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * ۳. ثبت ضایعات و قراضه برشکاری با بازیافت ارزش (Scrap & Normal Spoilage Recovery)
   * انتقال به انبار قراضه و کسر از بهای تمام‌شده سفارش کار:
   * Dr: انبار ضایعات و قراضه (۱۱۰۵۰۴)
   * Cr: کالای در جریان ساخت (۱۱۰۵۰۲)
   */
  static async recordScrapGeneration(input: RecordScrapInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: input.productionOrderId },
      });
      if (!order) throw new Error('دستور کار یافت نشد.');

      const scrapQty = new Prisma.Decimal(input.scrapQuantity);
      const scrapPrice = new Prisma.Decimal(input.scrapUnitRecoveryPrice);
      const scrapValue = scrapQty.mul(scrapPrice);

      if (scrapQty.lte(0) || scrapValue.lte(0)) {
        throw new Error('مقدار و ارزش قراضه بازیافتی باید بزرگتر از صفر باشد.');
      }

      const scrapWhCode = input.scrapWarehouseCode || 'WH-SCRAP-01';
      const scrapWh = await tx.warehouse.findUnique({ where: { code: scrapWhCode } });
      if (!scrapWh) throw new Error(`انبار ضایعات (${scrapWhCode}) یافت نشد.`);

      // ۱. ثبت در کاردکس انبار ضایعات
      await tx.stockTransaction.create({
        data: {
          warehouseId: scrapWh.id,
          productId: input.scrapProductId,
          type: TransactionType.SCRAP_TRANSFER,
          quantity: scrapQty,
          unitCost: scrapPrice,
          totalCost: scrapValue,
          referenceNo: `SCRAP-${order.orderNumber}`,
        },
      });

      // ۲. صدور سند دوبل کسر از در جریان ساخت و افزایش انبار ضایعات
      const scrapAccount = await tx.account.findUnique({ where: { code: '110504' } });
      const wipAccount = await tx.account.findUnique({ where: { code: '110502' } });

      if (!scrapAccount || !wipAccount) {
        throw new Error('حساب‌های معین ۱۱۰۵۰۴ یا ۱۱۰۵۰۲ یافت نشدند.');
      }

      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: انبار ضایعات و قراضه
        {
          accountId: scrapAccount.id,
          detail1Type: 'WAREHOUSE',
          detail1Id: scrapWh.id,
          debit: scrapValue,
          credit: new Prisma.Decimal(0),
          description: `ورود ضایعات برشکاری سفارش ${order.orderNumber} به انبار قراضه`,
        },
        // بستانکار: کالای در جریان ساخت (کاهش بهای تمام‌شده)
        {
          accountId: wipAccount.id,
          detail1Type: 'WORK_ORDER',
          detail1Id: order.orderNumber,
          debit: new Prisma.Decimal(0),
          credit: scrapValue,
          description: `بازیافت ارزش قراضه برش از سفارش کار ${order.orderNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند بازیافت ضایعات و قراضه آهن برشکاری دستور کار ${order.orderNumber}`,
          type: VoucherType.GENERAL,
          referenceModule: 'SCRAP_RECOVERY',
          referenceId: order.id,
          idempotencyKey: `SCRAP-${order.id}-${Date.now()}`,
          companyId,
          entries,
        },
        tx
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

      // ۳. کسر ارزش قراضه از هزینه متریال سفارش کار
      const updated = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          actualMaterialCost: {
            decrement: scrapValue,
          },
          scrapVoucherId: finalized.id,
        },
      });

      return {
        order: updated,
        scrapValueRecovered: scrapValue,
        voucherId: finalized.id,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * ۴. تکمیل نهایی دستور کار، محاسبه بهای تمام‌شده کالای ساخته‌شده (COGM) و ورود محصول به انبار (Finished Goods Receipt)
   * COGM = Net Direct Materials + Direct Labor + Allocated Overhead
   * Unit Cost = COGM / Completed Quantity
   * Dr: موجودی کالای ساخته‌شده آماده بارگیری (۱۱۰۵۰۳)
   * Cr: کالای در جریان ساخت (۱۱۰۵۰۲)
   */
  static async completeJobOrder(input: FinalizeJobOrderInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: input.productionOrderId },
        include: {
          bom: { include: { product: true } },
          customer: true,
        },
      });

      if (!order) throw new Error('دستور کار مورد نظر یافت نشد.');
      if (order.status === OrderStatus.COMPLETED) {
        throw new Error('این دستور کار قبلاً تکمیل شده است.');
      }

      const completedQty = new Prisma.Decimal(input.completedQuantity);
      if (completedQty.lte(0)) {
        throw new Error('مقدار تولید شده باید بزرگتر از صفر باشد.');
      }

      const extraLabor = new Prisma.Decimal(input.directLaborCost || 0);
      const extraOverhead = new Prisma.Decimal(input.allocatedOverheadCost || 0);

      // در صورت ثبت همزمان دستمزد و سربار در گام نهایی:
      let totalLabor = order.actualLaborCost.add(extraLabor);
      let totalOverhead = order.actualOverheadCost.add(extraOverhead);

      const totalCOGM = order.actualMaterialCost.add(totalLabor).add(totalOverhead);
      if (totalCOGM.lte(0)) {
        throw new Error('بهای تمام‌شده کالای ساخته‌شده (COGM) باید بزرگتر از صفر باشد.');
      }

      const unitCost = totalCOGM.div(completedQty);

      const fgWhCode = input.finishedGoodsWarehouseCode || 'WH-FG-01';
      const fgWh = await tx.warehouse.findUnique({ where: { code: fgWhCode } });
      if (!fgWh) throw new Error(`انبار کالای ساخته‌شده (${fgWhCode}) یافت نشد.`);

      // ۱. ثبت ورود محصول نهایی به انبار محصولات آماده بارگیری (کاردکس)
      await tx.stockTransaction.create({
        data: {
          warehouseId: fgWh.id,
          productId: order.bom.productId,
          type: TransactionType.PRODUCTION_RECEIPT,
          quantity: completedQty,
          unitCost,
          totalCost: totalCOGM,
          referenceNo: order.orderNumber,
        },
      });

      // ۲. صدور سند حسابداری انتقال از در جریان ساخت (WIP) به کالای ساخته‌شده (FG)
      const fgAccount = await tx.account.findUnique({ where: { code: '110503' } });
      const wipAccount = await tx.account.findUnique({ where: { code: '110502' } });

      if (!fgAccount || !wipAccount) {
        throw new Error('حساب‌های معین ۱۱۰۵۰۳ یا ۱۱۰۵۰۲ یافت نشدند.');
      }

      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const companyId = defaultCompany?.id || null;

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: موجودی کالای ساخته‌شده آماده بارگیری
        {
          accountId: fgAccount.id,
          detail1Type: 'WAREHOUSE',
          detail1Id: fgWh.id,
          debit: totalCOGM,
          credit: new Prisma.Decimal(0),
          description: `رسید انبار محصولات ساخته‌شده دستور کار ${order.orderNumber} (${order.bom.product.title}) - ${completedQty} عدد/تن به نرخ واحد ${unitCost.toFixed(0)} ت`,
        },
        // بستانکار: کالای در جریان ساخت (تسویه مانده سفارش کار)
        {
          accountId: wipAccount.id,
          detail1Type: 'WORK_ORDER',
          detail1Id: order.orderNumber,
          debit: new Prisma.Decimal(0),
          credit: totalCOGM,
          description: `خروج از جریان ساخت با تکمیل قطعی سفارش کار ${order.orderNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند تکمیل نهایی و بهای تمام‌شده کالای ساخته‌شده (COGM) دستور کار ${order.orderNumber}`,
          type: VoucherType.GENERAL,
          referenceModule: 'COMPLETION_COGM',
          referenceId: order.id,
          idempotencyKey: `COGM-${order.id}`,
          companyId,
          entries,
        },
        tx
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id, null, tx);

      // ۳. به‌روزرسانی دستور کار به وضعیت تکمیل شده
      const completedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          actualQuantity: completedQty,
          actualLaborCost: totalLabor,
          actualOverheadCost: totalOverhead,
          finalCostPerUnit: unitCost,
          status: OrderStatus.COMPLETED,
          completionDate: new Date(),
          completionVoucherId: finalized.id,
        },
        include: {
          customer: true,
          bom: { include: { product: true } },
        },
      });

      return {
        order: completedOrder,
        totalCOGM,
        unitCost,
        voucherId: finalized.id,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * سازگاری به عقب: ثبت مصرف مواد در سفارش ساخت (Agent API compatibility)
   */
  static async recordMaterialConsumption(input: {
    productionOrderId: string;
    warehouseId: string;
    scrapWarehouseId?: string;
    rawMaterialId: number;
    quantityConsumed: number | Prisma.Decimal;
    scrapQuantityGenerated?: number | Prisma.Decimal;
    scrapUnitRecoveryPrice?: number | Prisma.Decimal;
  }) {
    const rawWh = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    const result = await this.issueMaterialsToProduction({
      productionOrderId: input.productionOrderId,
      rawMaterialWarehouseCode: rawWh?.code || 'WH-RAW-01',
      items: [
        {
          rawMaterialId: input.rawMaterialId,
          quantity: input.quantityConsumed,
        },
      ],
    });

    if (input.scrapQuantityGenerated && new Prisma.Decimal(input.scrapQuantityGenerated).gt(0)) {
      const scrapWh = input.scrapWarehouseId
        ? await db.warehouse.findUnique({ where: { id: input.scrapWarehouseId } })
        : null;
      await this.recordScrapGeneration({
        productionOrderId: input.productionOrderId,
        scrapProductId: input.rawMaterialId,
        scrapWarehouseCode: scrapWh?.code || 'WH-SCRAP-01',
        scrapQuantity: input.scrapQuantityGenerated,
        scrapUnitRecoveryPrice: input.scrapUnitRecoveryPrice || 18000,
      });
    }

    return result.order;
  }

  /**
   * سازگاری به عقب: خاتمه دستور کار (Agent API compatibility)
   */
  static async finalizeJobOrder(input: {
    productionOrderId: string;
    finishedGoodsWarehouseId: string;
    completedQuantity: number | Prisma.Decimal;
    directLaborCost: number | Prisma.Decimal;
    allocatedOverheadCost: number | Prisma.Decimal;
  }) {
    const fgWh = await db.warehouse.findUnique({ where: { id: input.finishedGoodsWarehouseId } });
    const result = await this.completeJobOrder({
      productionOrderId: input.productionOrderId,
      finishedGoodsWarehouseCode: fgWh?.code || 'WH-FG-01',
      completedQuantity: input.completedQuantity,
      directLaborCost: input.directLaborCost,
      allocatedOverheadCost: input.allocatedOverheadCost,
    });
    return result.order;
  }
}
