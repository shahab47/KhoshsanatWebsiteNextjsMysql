import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { InventoryService } from '@/lib/warehouse/inventory-service';
import { JobCostingService } from '@/lib/costing/job-costing-service';
import { TransactionType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { actionType, payload, confirmed } = await req.json();

    if (!confirmed) {
      return NextResponse.json({
        success: false,
        message: 'عملیات توسط کاربر لغو شد.',
      });
    }

    if (actionType === 'DELIVERY_CONFIRMATION') {
      const { customerId, productName, grossWeightKg, tareWeightKg, netWeightKg } = payload;

      // یافتن انبار محصولات آماده
      const finishedWarehouse = await db.warehouse.findFirst({
        where: { type: 'FINISHED_GOODS' },
      });

      // یافتن محصول
      const product = await db.product.findFirst({
        where: { title: { contains: productName } },
      });

      if (!finishedWarehouse || !product) {
        return NextResponse.json(
          {
            success: false,
            message: 'انبار کالای ساخته شده یا رکورد کالا در سیستم یافت نشد.',
          },
          { status: 400 }
        );
      }

      // ثبت حواله خروج با اطلاعات باسکول
      const txn = await InventoryService.recordIssue({
        warehouseId: finishedWarehouse.id,
        productId: product.id,
        quantity: 1, // یا تعداد قطعه
        type: TransactionType.DELIVERY_NOTE,
        scaleGrossKg: grossWeightKg,
        scaleTareKg: tareWeightKg,
        referenceNo: `DELIVERY-${Date.now().toString().slice(-6)}`,
      });

      return NextResponse.json({
        success: true,
        message: `حواله بارگیری و قبض باسکول با شماره عطف ${txn.referenceNo} با موفقیت ثبت شد. وزن خالص بار: ${netWeightKg} کیلوگرم.`,
        transactionId: txn.id,
      });
    }

    if (actionType === 'MATERIAL_CONSUMPTION_CONFIRMATION') {
      const { productionOrderId, materialCode, quantity, scrapQuantity } = payload;

      const rawWarehouse = await db.warehouse.findFirst({
        where: { type: 'RAW_MATERIALS' },
      });

      const scrapWarehouse = await db.warehouse.findFirst({
        where: { type: 'SCRAP' },
      });

      const rawMaterial = await db.product.findFirst({
        where: {
          OR: [{ code: materialCode }, { title: { contains: materialCode } }],
        },
      });

      if (!rawWarehouse || !rawMaterial) {
        return NextResponse.json(
          {
            success: false,
            message: 'انبار مواد اولیه یا متریال مورد نظر در سیستم یافت نشد.',
          },
          { status: 400 }
        );
      }

      const updatedOrder = await JobCostingService.recordMaterialConsumption({
        productionOrderId,
        warehouseId: rawWarehouse.id,
        scrapWarehouseId: scrapWarehouse?.id,
        rawMaterialId: rawMaterial.id,
        quantityConsumed: quantity,
        scrapQuantityGenerated: scrapQuantity,
      });

      return NextResponse.json({
        success: true,
        message: `مصرف مواد در سفارش ساخت "${updatedOrder.orderNumber}" با موفقیت ثبت و بهای تمام‌شده به‌روزرسانی شد.`,
        order: updatedOrder,
      });
    }

    return NextResponse.json({ success: false, message: 'نوع عملیات نامعتبر است.' }, { status: 400 });
  } catch (error: any) {
    console.error('Agent confirm error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تایید و ثبت عملیات' },
      { status: 500 }
    );
  }
}
