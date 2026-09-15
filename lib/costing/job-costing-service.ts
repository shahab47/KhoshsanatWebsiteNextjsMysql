import db from '@/lib/db';
import { Prisma, OrderStatus, TransactionType, WarehouseType } from '@prisma/client';
import { InventoryService } from '@/lib/warehouse/inventory-service';

export interface RecordMaterialConsumptionInput {
  productionOrderId: string;
  warehouseId: string; // انبار مواد اولیه
  scrapWarehouseId?: string; // انبار قراضه
  rawMaterialId: number;
  quantityConsumed: number | Prisma.Decimal;
  scrapQuantityGenerated?: number | Prisma.Decimal;
  scrapUnitRecoveryPrice?: number | Prisma.Decimal;
}

export interface FinalizeProductionOrderInput {
  productionOrderId: string;
  finishedGoodsWarehouseId: string;
  completedQuantity: number | Prisma.Decimal;
  directLaborCost: number | Prisma.Decimal;
  allocatedOverheadCost: number | Prisma.Decimal;
}

/**
 * سرویس بهای تمام‌شده صنعتی و هزینه سفارش کار (Job Order Costing)
 */
export class JobCostingService {
  /**
   * ثبت مصرف مواد اولیه در دستور کار همراه با کسر ارزش قراضه بازیافتی (Normal Spoilage)
   * Net Material Cost = (Q_consumed * C_avg) - (Q_scrap * P_scrap)
   */
  static async recordMaterialConsumption(input: RecordMaterialConsumptionInput) {
    const consumedQty = new Prisma.Decimal(input.quantityConsumed);
    const scrapQty = new Prisma.Decimal(input.scrapQuantityGenerated || 0);
    const scrapPrice = new Prisma.Decimal(input.scrapUnitRecoveryPrice || 0);

    const order = await db.productionOrder.findUnique({
      where: { id: input.productionOrderId },
    });

    if (!order) {
      throw new Error('دستور کار مورد نظر یافت نشد.');
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new Error('این دستور کار قبلاً خاتمه یافته یا لغو شده است.');
    }

    // ۱. ثبت حواله خروج مواد اولیه از انبار مواد اولیه به خط تولید
    const issueTxn = await InventoryService.recordIssue({
      warehouseId: input.warehouseId,
      productId: input.rawMaterialId,
      quantity: consumedQty,
      referenceNo: order.orderNumber,
      type: TransactionType.ISSUE_TO_PRODUCTION,
    });

    const grossMaterialCost = issueTxn.totalCost;
    const scrapValue = scrapQty.mul(scrapPrice);
    const netMaterialCost = grossMaterialCost.sub(scrapValue);

    // ۲. در صورت ایجاد قراضه، انتقال آن به انبار ضایعات
    if (scrapQty.gt(0) && input.scrapWarehouseId) {
      await db.stockTransaction.create({
        data: {
          warehouseId: input.scrapWarehouseId,
          productId: input.rawMaterialId,
          type: TransactionType.SCRAP_TRANSFER,
          quantity: scrapQty,
          unitCost: scrapPrice,
          totalCost: scrapValue,
          referenceNo: `SCRAP-${order.orderNumber}`,
        },
      });
    }

    // ۳. به‌روزرسانی بهای متریال سفارش کار
    return await db.productionOrder.update({
      where: { id: input.productionOrderId },
      data: {
        actualMaterialCost: {
          increment: netMaterialCost,
        },
        status: OrderStatus.IN_PRODUCTION,
      },
    });
  }

  /**
   * تکمیل نهایی دستور کار، محاسبه بهای تمام‌شده کالای ساخته‌شده (COGM) و ورود محصول به انبار
   * COGM = Direct Materials + Direct Labor + Manufacturing Overhead
   */
  static async finalizeJobOrder(input: FinalizeProductionOrderInput) {
    const completedQty = new Prisma.Decimal(input.completedQuantity);
    const laborCost = new Prisma.Decimal(input.directLaborCost);
    const overheadCost = new Prisma.Decimal(input.allocatedOverheadCost);

    if (completedQty.lte(0)) {
      throw new Error('تعداد تولید شده باید بزرگتر از صفر باشد.');
    }

    const order = await db.productionOrder.findUnique({
      where: { id: input.productionOrderId },
      include: {
        bom: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('دستور کار مورد نظر یافت نشد.');
    }

    // محاسبه COGM
    const totalCOGM = order.actualMaterialCost.add(laborCost).add(overheadCost);
    const costPerUnit = totalCOGM.div(completedQty);

    return await db.$transaction(async (tx) => {
      // ۱. ثبت رسید قطعه ساخته‌شده در انبار محصولات آماده
      await tx.stockTransaction.create({
        data: {
          warehouseId: input.finishedGoodsWarehouseId,
          productId: order.bom.productId,
          type: TransactionType.PRODUCTION_RECEIPT,
          quantity: completedQty,
          unitCost: costPerUnit,
          totalCost: totalCOGM,
          referenceNo: order.orderNumber,
        },
      });

      // ۲. به‌روزرسانی سفارش تولید
      return await tx.productionOrder.update({
        where: { id: input.productionOrderId },
        data: {
          actualQuantity: completedQty,
          actualLaborCost: laborCost,
          actualOverheadCost: overheadCost,
          finalCostPerUnit: costPerUnit,
          status: OrderStatus.COMPLETED,
          completionDate: new Date(),
        },
      });
    });
  }
}
