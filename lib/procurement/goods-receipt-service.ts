import db from '@/lib/db';
import { Prisma, GoodsReceiptStatus, PurchaseOrderStatus, TransactionType } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface CreateGoodsReceiptItemInput {
  purchaseOrderItemId?: string | null;
  productId: number;
  receivedQty: number | Prisma.Decimal;
  unitCost: number | Prisma.Decimal;
  steelGrade?: string | null;
  heatNumber?: string | null;
  batchNumber?: string | null;
}

export interface CreateGoodsReceiptInput {
  supplierId: string;
  purchaseOrderId?: string | null;
  warehouseId?: string; // پیش‌فرض: انبار مواد اولیه WH-RAW-01
  receiptDate?: Date | string | null;
  status?: GoodsReceiptStatus;
  
  // باسکول ورود بار (مبنای حقیقت توزین مقاطع فولادی)
  scaleGrossKg?: number | Prisma.Decimal | null;
  scaleTareKg?: number | Prisma.Decimal | null;
  scaleNetKg?: number | Prisma.Decimal | null;
  scaleTicketNo?: string | null;
  scalePhotoUrl?: string | null;
  
  // بارنامه و راننده
  waybillNo?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverNationalId?: string | null;
  truckPlate?: string | null;
  
  // کنترل کیفیت و متالورژی
  qcPassed?: boolean;
  qcNotes?: string | null;
  heatNumber?: string | null;
  millTestCertUrl?: string | null;
  
  description?: string | null;
  items: CreateGoodsReceiptItemInput[];
}

export class GoodsReceiptService {
  /**
   * ثبت قبض رسید انبار ورود مقاطع فلزی و مصالح فولادی (GRN) همراه با توزین باسکول و ثبت در کاردکس
   */
  static async createGoodsReceipt(input: CreateGoodsReceiptInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      if (!input.supplierId) {
        throw new Error('انتخاب تامین‌کننده برای رسید انبار الزامی است.');
      }
      if (!input.items || input.items.length === 0) {
        throw new Error('حداقل یک قلم کالا برای ثبت رسید انبار الزامی است.');
      }

      // ۱. اعتبارسنجی تامین‌کننده
      const supplier = await tx.supplier.findUnique({
        where: { id: input.supplierId },
      });
      if (!supplier) throw new Error('تامین‌کننده یافت نشد.');

      // ۲. تعیین انبار مقصد (پیش‌فرض WH-RAW-01)
      let targetWarehouseId = input.warehouseId;
      if (!targetWarehouseId) {
        const rawWarehouse = await tx.warehouse.findUnique({
          where: { code: 'WH-RAW-01' },
        });
        if (!rawWarehouse) {
          throw new Error('انبار پیش‌فرض مواد اولیه (WH-RAW-01) در سیستم تعریف نشده است.');
        }
        targetWarehouseId = rawWarehouse.id;
      } else {
        const wh = await tx.warehouse.findUnique({ where: { id: targetWarehouseId } });
        if (!wh) throw new Error('انبار انتخاب‌شده یافت نشد.');
      }

      // ۳. محاسبه و اعتبارسنجی اوزان باسکول
      let netKg: Prisma.Decimal;
      if (input.scaleGrossKg !== undefined && input.scaleGrossKg !== null &&
          input.scaleTareKg !== undefined && input.scaleTareKg !== null) {
        const gross = new Prisma.Decimal(input.scaleGrossKg);
        const tare = new Prisma.Decimal(input.scaleTareKg);
        if (gross.lt(tare)) {
          throw new Error('وزن ناخالص (پر) باسکول نمی‌تواند کمتر از وزن تار (خالی) کامیون باشد.');
        }
        netKg = gross.sub(tare);
      } else if (input.scaleNetKg !== undefined && input.scaleNetKg !== null) {
        netKg = new Prisma.Decimal(input.scaleNetKg);
      } else {
        // جمع مقادیر اقلام
        netKg = input.items.reduce((sum, it) => sum.add(new Prisma.Decimal(it.receivedQty)), new Prisma.Decimal(0));
      }

      if (netKg.isNegative()) {
        throw new Error('وزن خالص بار باسکول نمی‌تواند منفی باشد.');
      }

      // ۴. تولید کد عطف یکتا برای قبض رسید انبار (GRN-XXXXXX)
      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const { formattedNumber } = await SequenceService.nextNumber('GOODS_RECEIPT', defaultCompany?.id || null, tx);

      // ۵. ایجاد سند رسید انبار و اقلام آن
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          receiptNo: formattedNumber,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId || null,
          warehouseId: targetWarehouseId,
          status: input.status || GoodsReceiptStatus.COMPLETED,
          receiptDate: input.receiptDate ? new Date(input.receiptDate) : new Date(),
          scaleGrossKg: input.scaleGrossKg ? new Prisma.Decimal(input.scaleGrossKg) : null,
          scaleTareKg: input.scaleTareKg ? new Prisma.Decimal(input.scaleTareKg) : null,
          scaleNetKg: netKg,
          scaleTicketNo: input.scaleTicketNo?.trim() || null,
          scalePhotoUrl: input.scalePhotoUrl?.trim() || null,
          waybillNo: input.waybillNo?.trim() || null,
          driverName: input.driverName?.trim() || null,
          driverPhone: input.driverPhone?.trim() || null,
          driverNationalId: input.driverNationalId?.trim() || null,
          truckPlate: input.truckPlate?.trim() || null,
          qcPassed: input.qcPassed !== undefined ? input.qcPassed : true,
          qcNotes: input.qcNotes?.trim() || null,
          heatNumber: input.heatNumber?.trim() || null,
          millTestCertUrl: input.millTestCertUrl?.trim() || null,
          description: input.description?.trim() || null,
          items: {
            create: input.items.map((it) => {
              const qty = new Prisma.Decimal(it.receivedQty);
              const cost = new Prisma.Decimal(it.unitCost);
              return {
                purchaseOrderItemId: it.purchaseOrderItemId || null,
                productId: it.productId,
                receivedQty: qty,
                unitCost: cost,
                totalCost: qty.mul(cost),
                steelGrade: it.steelGrade?.trim() || null,
                heatNumber: it.heatNumber?.trim() || null,
                batchNumber: it.batchNumber?.trim() || null,
              };
            }),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          supplier: true,
          warehouse: true,
          purchaseOrder: true,
        },
      });

      // ۶. به‌روزرسانی سفارش خرید (در صورت ارتباط رسید با سفارش)
      if (input.purchaseOrderId) {
        for (const item of input.items) {
          if (item.purchaseOrderItemId) {
            await tx.purchaseOrderItem.update({
              where: { id: item.purchaseOrderItemId },
              data: {
                receivedQty: {
                  increment: new Prisma.Decimal(item.receivedQty),
                },
              },
            });
          }
        }

        // بررسی وضعیت سفارش خرید: آیا کل اقلام تحویل شده‌اند؟
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: input.purchaseOrderId },
        });

        const allCompleted = poItems.every((poi) => poi.receivedQty.gte(poi.orderedQty));
        const anyReceived = poItems.some((poi) => poi.receivedQty.gt(0));

        await tx.purchaseOrder.update({
          where: { id: input.purchaseOrderId },
          data: {
            status: allCompleted
              ? PurchaseOrderStatus.COMPLETED
              : anyReceived
              ? PurchaseOrderStatus.PARTIALLY_RECEIVED
              : PurchaseOrderStatus.APPROVED,
          },
        });
      }

      // ۷. ثبت تراکنش‌های کاردکس انبارداری صنعتی (StockTransaction: PURCHASE_RECEIPT)
      for (const item of goodsReceipt.items) {
        await tx.stockTransaction.create({
          data: {
            warehouseId: targetWarehouseId,
            productId: item.productId,
            type: TransactionType.PURCHASE_RECEIPT,
            quantity: item.receivedQty,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            scaleGrossKg: goodsReceipt.scaleGrossKg,
            scaleTareKg: goodsReceipt.scaleTareKg,
            scaleNetKg: item.receivedQty, // وزن اختصاصی این ردیف
            referenceNo: goodsReceipt.receiptNo,
          },
        });
      }

      return goodsReceipt;
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * دریافت لیست قبض‌های رسید انبار با امکان فیلتر
   */
  static async getGoodsReceipts(options?: {
    supplierId?: string;
    warehouseId?: string;
    purchaseOrderId?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.GoodsReceiptWhereInput = {};

    if (options?.supplierId) where.supplierId = options.supplierId;
    if (options?.warehouseId) where.warehouseId = options.warehouseId;
    if (options?.purchaseOrderId) where.purchaseOrderId = options.purchaseOrderId;

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { receiptNo: { contains: term } },
        { waybillNo: { contains: term } },
        { truckPlate: { contains: term } },
        { driverName: { contains: term } },
        { supplier: { name: { contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.goodsReceipt.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          purchaseOrder: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { receiptDate: 'desc' },
        take: options?.limit || 50,
        skip: options?.skip || 0,
      }),
      db.goodsReceipt.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت جزئیات یک قبض رسید انبار
   */
  static async getGoodsReceiptById(id: string) {
    const receipt = await db.goodsReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        purchaseOrder: {
          include: { items: { include: { product: true } } },
        },
        items: {
          include: { product: true },
        },
      },
    });

    if (!receipt) throw new Error('قبض رسید انبار یافت نشد.');
    return receipt;
  }
}
