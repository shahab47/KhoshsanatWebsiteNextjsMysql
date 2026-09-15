import db from '@/lib/db';
import { Prisma, TransactionType, WarehouseType } from '@prisma/client';

export interface RecordStockReceiptInput {
  warehouseId: string;
  productId: number;
  quantity: number | Prisma.Decimal;
  purchaseUnitPrice: number | Prisma.Decimal;
  referenceNo?: string;
  scaleGrossKg?: number | Prisma.Decimal;
  scaleTareKg?: number | Prisma.Decimal;
}

export interface RecordStockIssueInput {
  warehouseId: string;
  productId: number;
  quantity: number | Prisma.Decimal;
  referenceNo?: string;
  type?: TransactionType; // ISSUE_TO_PRODUCTION, DELIVERY_NOTE, SCRAP_TRANSFER
  scaleGrossKg?: number | Prisma.Decimal;
  scaleTareKg?: number | Prisma.Decimal;
}

/**
 * سرویس مدیریت انبارداری صنعتی، توزین باسکول و کاردکس میانگین موزون
 */
export class InventoryService {
  /**
   * محاسبه موجودی مقداری و بهای واحد میانگین موزون فعلی کالا در یک انبار
   * Ct = (V_prev * C_prev + Q_new * P_new) / (V_prev + Q_new)
   */
  static async getCurrentStockAndAverageCost(warehouseId: string, productId: number) {
    const transactions = await db.stockTransaction.findMany({
      where: { warehouseId, productId },
      orderBy: { createdAt: 'asc' },
    });

    let currentQty = new Prisma.Decimal(0);
    let currentTotalCost = new Prisma.Decimal(0);

    for (const txn of transactions) {
      if (
        txn.type === TransactionType.PURCHASE_RECEIPT ||
        txn.type === TransactionType.PRODUCTION_RECEIPT ||
        txn.type === TransactionType.SCRAP_TRANSFER
      ) {
        // ورود به انبار
        currentQty = currentQty.add(txn.quantity);
        currentTotalCost = currentTotalCost.add(txn.totalCost);
      } else {
        // خروج از انبار
        currentQty = currentQty.sub(txn.quantity);
        currentTotalCost = currentTotalCost.sub(txn.totalCost);
      }
    }

    const averageCost = currentQty.gt(0)
      ? currentTotalCost.div(currentQty)
      : new Prisma.Decimal(0);

    return {
      currentQuantity: currentQty,
      currentTotalCost,
      averageCost,
    };
  }

  /**
   * ثبت رسید ورود به انبار (خرید یا تولید) با توزین باسکول و بازتعریف نرخ میانگین موزون
   */
  static async recordReceipt(input: RecordStockReceiptInput) {
    const qty = new Prisma.Decimal(input.quantity);
    const unitPrice = new Prisma.Decimal(input.purchaseUnitPrice);

    if (qty.lte(0)) {
      throw new Error('مقدار رسید انبار باید بزرگتر از صفر باشد.');
    }

    const totalCost = qty.mul(unitPrice);

    let scaleNetKg: Prisma.Decimal | null = null;
    if (input.scaleGrossKg && input.scaleTareKg) {
      const gross = new Prisma.Decimal(input.scaleGrossKg);
      const tare = new Prisma.Decimal(input.scaleTareKg);
      scaleNetKg = gross.sub(tare);
    }

    return await db.$transaction(async (tx) => {
      return await tx.stockTransaction.create({
        data: {
          warehouseId: input.warehouseId,
          productId: input.productId,
          type: TransactionType.PURCHASE_RECEIPT,
          quantity: qty,
          unitCost: unitPrice,
          totalCost,
          scaleGrossKg: input.scaleGrossKg ? new Prisma.Decimal(input.scaleGrossKg) : null,
          scaleTareKg: input.scaleTareKg ? new Prisma.Decimal(input.scaleTareKg) : null,
          scaleNetKg,
          referenceNo: input.referenceNo,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });
  }

  /**
   * ثبت حواله خروج از انبار (به خط تولید، ضایعات یا مشتری) بر مبنای آخرین بهای میانگین موزون
   */
  static async recordIssue(input: RecordStockIssueInput) {
    const qty = new Prisma.Decimal(input.quantity);

    if (qty.lte(0)) {
      throw new Error('مقدار حواله خروج باید بزرگتر از صفر باشد.');
    }

    const { currentQuantity, averageCost } = await this.getCurrentStockAndAverageCost(
      input.warehouseId,
      input.productId
    );

    if (currentQuantity.lt(qty)) {
      throw new Error(
        `کسری موجودی در انبار! موجودی فعلی: ${currentQuantity.toString()}، مقدار درخواستی: ${qty.toString()}`
      );
    }

    const totalCost = qty.mul(averageCost);

    let scaleNetKg: Prisma.Decimal | null = null;
    if (input.scaleGrossKg && input.scaleTareKg) {
      const gross = new Prisma.Decimal(input.scaleGrossKg);
      const tare = new Prisma.Decimal(input.scaleTareKg);
      scaleNetKg = gross.sub(tare);
    }

    return await db.$transaction(async (tx) => {
      return await tx.stockTransaction.create({
        data: {
          warehouseId: input.warehouseId,
          productId: input.productId,
          type: input.type || TransactionType.ISSUE_TO_PRODUCTION,
          quantity: qty,
          unitCost: averageCost,
          totalCost,
          scaleGrossKg: input.scaleGrossKg ? new Prisma.Decimal(input.scaleGrossKg) : null,
          scaleTareKg: input.scaleTareKg ? new Prisma.Decimal(input.scaleTareKg) : null,
          scaleNetKg,
          referenceNo: input.referenceNo,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });
  }

  /**
   * گزارش کامل کاردکس مقداری و ریالی کالا در انبار
   */
  static async getKardex(warehouseId: string, productId: number) {
    const transactions = await db.stockTransaction.findMany({
      where: { warehouseId, productId },
      orderBy: { createdAt: 'asc' },
      include: { product: true, warehouse: true },
    });

    let runningQty = new Prisma.Decimal(0);
    let runningTotalCost = new Prisma.Decimal(0);

    const rows = transactions.map((txn) => {
      const isIncoming =
        txn.type === TransactionType.PURCHASE_RECEIPT ||
        txn.type === TransactionType.PRODUCTION_RECEIPT ||
        txn.type === TransactionType.SCRAP_TRANSFER;

      if (isIncoming) {
        runningQty = runningQty.add(txn.quantity);
        runningTotalCost = runningTotalCost.add(txn.totalCost);
      } else {
        runningQty = runningQty.sub(txn.quantity);
        runningTotalCost = runningTotalCost.sub(txn.totalCost);
      }

      const runningAverageRate = runningQty.gt(0)
        ? runningTotalCost.div(runningQty)
        : new Prisma.Decimal(0);

      return {
        id: txn.id,
        date: txn.createdAt,
        type: txn.type,
        referenceNo: txn.referenceNo,
        scaleGrossKg: txn.scaleGrossKg,
        scaleTareKg: txn.scaleTareKg,
        scaleNetKg: txn.scaleNetKg,
        // ورودی
        inQuantity: isIncoming ? txn.quantity : new Prisma.Decimal(0),
        inUnitCost: isIncoming ? txn.unitCost : new Prisma.Decimal(0),
        inTotalCost: isIncoming ? txn.totalCost : new Prisma.Decimal(0),
        // خروجی
        outQuantity: !isIncoming ? txn.quantity : new Prisma.Decimal(0),
        outUnitCost: !isIncoming ? txn.unitCost : new Prisma.Decimal(0),
        outTotalCost: !isIncoming ? txn.totalCost : new Prisma.Decimal(0),
        // مانده
        balanceQuantity: runningQty,
        balanceAverageRate: runningAverageRate,
        balanceTotalCost: runningTotalCost,
      };
    });

    return {
      warehouseId,
      productId,
      rows,
      finalStock: runningQty,
      finalTotalCost: runningTotalCost,
      finalAverageRate: runningQty.gt(0) ? runningTotalCost.div(runningQty) : new Prisma.Decimal(0),
    };
  }
}
