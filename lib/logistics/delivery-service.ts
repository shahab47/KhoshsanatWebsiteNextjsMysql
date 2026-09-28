import db from '@/lib/db';
import {
  Prisma,
  DeliveryStatus,
  TransactionType,
  MappingTrigger,
  VoucherType,
  FreightTerm,
} from '@prisma/client';
import { ScaleService } from './scale-service';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { InventoryService } from '@/lib/warehouse/inventory-service';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { AccountingMappingEngine } from '@/lib/accounting/accounting-mapping';

export interface CreateDeliveryData {
  customerId: number;
  productName: string;
  quantity: number;
  unit?: string | null;
  deliveryDate?: string | Date;
  status?: DeliveryStatus;
  description?: string | null;
  signatureUrl?: string | null;
  attachments?: any;

  // لجستیک و بارنامه
  waybillNo?: string | null;
  driverName?: string | null;
  driverNationalId?: string | null;
  driverPhone?: string | null;
  truckPlate?: string | null;
  shippingCompany?: string | null;
  freightCost?: number | Prisma.Decimal;
  freightPaymentTerm?: FreightTerm;

  // باسکول دیجیتال
  scaleGrossKg?: number | Prisma.Decimal | null;
  scaleTareKg?: number | Prisma.Decimal | null;
  nominalWeightKg?: number | Prisma.Decimal | null;
  scaleTicketNo?: string | null;
  scalePhotoUrl?: string | null;

  // پیوندها
  warehouseId?: string | null;
  productId?: number | null;
  invoiceId?: number | null;
  productionOrderId?: string | null;
}

export class DeliveryService {
  /**
   * ایجاد و ثبت تحویل بار با محاسبه خودکار توزین باسکول و ثبت بارنامه
   */
  static async createDelivery(input: CreateDeliveryData) {
    const { formattedNumber: deliveryNo } = await SequenceService.nextNumber('DELIVERY');

    let scaleNetKg: Prisma.Decimal | null = null;
    let nominalWeightKg: Prisma.Decimal | null = null;
    let weightVariancePercent: Prisma.Decimal | null = null;
    let isToleranceExceeded = false;

    if (input.scaleGrossKg && input.scaleTareKg) {
      const scaleCalc = ScaleService.calculateScaleWeights({
        scaleGrossKg: input.scaleGrossKg,
        scaleTareKg: input.scaleTareKg,
        nominalWeightKg: input.nominalWeightKg,
      });

      scaleNetKg = scaleCalc.scaleNetKg;
      nominalWeightKg = scaleCalc.nominalWeightKg;
      weightVariancePercent = scaleCalc.weightVariancePercent;
      isToleranceExceeded = scaleCalc.isToleranceExceeded;
    }

    const delivery = await db.delivery.create({
      data: {
        deliveryNo,
        customerId: input.customerId,
        productName: input.productName,
        quantity: input.quantity,
        unit: input.unit || 'شاخه',
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
        status: input.status || DeliveryStatus.PENDING,
        description: input.description || null,
        signatureUrl: input.signatureUrl || null,
        attachments: input.attachments || null,

        // بارنامه و راننده
        waybillNo: input.waybillNo || null,
        driverName: input.driverName || null,
        driverNationalId: input.driverNationalId || null,
        driverPhone: input.driverPhone || null,
        truckPlate: input.truckPlate || null,
        shippingCompany: input.shippingCompany || null,
        freightCost: input.freightCost ? new Prisma.Decimal(input.freightCost) : new Prisma.Decimal(0),
        freightPaymentTerm: input.freightPaymentTerm || FreightTerm.PAID_BY_CUSTOMER,

        // باسکول
        scaleGrossKg: input.scaleGrossKg ? new Prisma.Decimal(input.scaleGrossKg) : null,
        scaleTareKg: input.scaleTareKg ? new Prisma.Decimal(input.scaleTareKg) : null,
        scaleNetKg,
        nominalWeightKg,
        weightVariancePercent,
        isToleranceExceeded,
        scaleTicketNo: input.scaleTicketNo || null,
        scalePhotoUrl: input.scalePhotoUrl || null,

        // پیوندها
        warehouseId: input.warehouseId || null,
        productId: input.productId || null,
        invoiceId: input.invoiceId || null,
        productionOrderId: input.productionOrderId || null,
      },
    });

    // در صورتی که وضعیت تحویل شده باشد، فرآیند خروج انبار و صدور سند بهای تمام‌شده اجرا شود
    if (delivery.status === DeliveryStatus.DELIVERED) {
      await this.fulfillDelivery(delivery.id);
    }

    return await db.delivery.findUnique({
      where: { id: delivery.id },
      include: {
        customer: true,
        warehouse: true,
        product: true,
        invoice: true,
      },
    });
  }

  /**
   * تکمیل فرآیند تحویل بار (تایید خروج از کارخانه):
   * ۱. صدور حواله خروج انبار محصول نهایی (StockTransaction: DELIVERY_NOTE)
   * ۲. صدور سند دوبل بهای تمام‌شده کالای فروش‌رفته (COGS) و کسر از موجودی محصول نهایی
   */
  static async fulfillDelivery(deliveryId: number, externalTx?: Prisma.TransactionClient) {
    const client = externalTx || db;

    const delivery = await client.delivery.findUnique({
      where: { id: deliveryId },
      include: { customer: true, product: true },
    });

    if (!delivery) {
      throw new Error(`تحویل بار با شناسه ${deliveryId} یافت نشد.`);
    }

    // ۱. یافتن انبار محصول نهایی پیش‌فرض کارخانه
    let warehouseId = delivery.warehouseId;
    if (!warehouseId) {
      const fgWarehouse = await client.warehouse.findFirst({
        where: { type: 'FINISHED_GOODS' },
      });
      warehouseId = fgWarehouse?.id || null;
    }

    // ۲. یافتن کالا در انبار
    let productId = delivery.productId;
    if (!productId) {
      const prod = await client.product.findFirst({
        where: { title: delivery.productName },
      });
      if (prod) {
        productId = prod.id;
      } else {
        const anyProd = await client.product.findFirst();
        productId = anyProd?.id || null;
      }
    }

    let stockTransactionId = delivery.stockTransactionId;

    // ۳. صدور حواله خروج از انبار در صورت داشتن انبار و کالا
    if (warehouseId && productId && !stockTransactionId) {
      const outQuantity = delivery.scaleNetKg
        ? delivery.scaleNetKg
        : new Prisma.Decimal(delivery.quantity);

      // استخراج آخرین بهای میانگین موزون محصول نهایی
      let unitCost = new Prisma.Decimal(50000); // بهای اسمی پیش‌فرض در صورت عدم گردش قبلی
      try {
        const stockInfo = await InventoryService.getCurrentStockAndAverageCost(
          warehouseId,
          productId
        );
        if (stockInfo.averageCost.gt(0)) {
          unitCost = stockInfo.averageCost;
        }
      } catch {
        // در صورت عدم موجودی، از بهای واحد استاندارد استفاده می‌شود
      }

      const totalCost = outQuantity.mul(unitCost);

      const stockTxn = await client.stockTransaction.create({
        data: {
          warehouseId,
          productId,
          type: TransactionType.DELIVERY_NOTE,
          quantity: outQuantity,
          unitCost,
          totalCost,
          scaleGrossKg: delivery.scaleGrossKg,
          scaleTareKg: delivery.scaleTareKg,
          scaleNetKg: delivery.scaleNetKg,
          referenceNo: delivery.deliveryNo,
        },
      });

      stockTransactionId = stockTxn.id;
    }

    // ۴. صدور سند حسابداری دوبل بهای تمام‌شده کالای فروش‌رفته (COGS)
    let journalVoucherId = delivery.journalVoucherId;
    if (!journalVoucherId) {
      try {
        const defaultCompany = await client.company.findFirst({
          where: { isDefault: true },
        });
        const companyId = defaultCompany?.id || null;

        const mapping = await AccountingMappingEngine.getAccountsForTrigger(
          MappingTrigger.SALES_SHIPMENT_COGS,
          companyId
        );

        // محاسبه بهای سند COGS: بر مبنای وزن باسکول یا تعداد
        const costAmount = delivery.scaleNetKg
          ? delivery.scaleNetKg.mul(new Prisma.Decimal(35000)) // نرخ میانگین فولاد/کیلو
          : new Prisma.Decimal(delivery.quantity).mul(new Prisma.Decimal(100000));

        const entries: CreateJournalEntryInput[] = [
          // بدهکار: بهای تمام‌شده کالای فروش‌رفته (۵۱۰۱۰۱)
          {
            accountId: mapping.debitAccountId,
            detail1Type: 'CUSTOMER',
            detail1Id: delivery.customerId.toString(),
            debit: costAmount,
            credit: new Prisma.Decimal(0),
            description: `بهای تمام‌شده محصول نهایی حواله خروج شماره ${delivery.deliveryNo} - ${delivery.productName}`,
          },
          // بستانکار: موجودی کالای ساخته‌شده آماده بارگیری (۱۱۰۵۰۳)
          {
            accountId: mapping.creditAccountId,
            debit: new Prisma.Decimal(0),
            credit: costAmount,
            description: `خروج فیزیکی کالا از انبار بابت بارگیری حواله ${delivery.deliveryNo}`,
          },
        ];

        const voucher = await VoucherService.createVoucher(
          {
            voucherDate: delivery.deliveryDate || new Date(),
            description: `سند بهای تمام‌شده کالای فروش‌رفته (COGS) حواله بارگیری شماره ${delivery.deliveryNo} - ${delivery.customer.name}`,
            type: VoucherType.SALES,
            referenceModule: 'DELIVERY_SHIPMENT',
            referenceId: delivery.id.toString(),
            idempotencyKey: `DEL-COGS-${delivery.id}`,
            companyId,
            entries,
          },
          client
        );

        const finalized = await VoucherService.finalizeVoucher(voucher.id);
        journalVoucherId = finalized.id;
      } catch (cogsErr) {
        console.error('Error posting COGS voucher:', cogsErr);
      }
    }

    // به‌روزرسانی نهایی رکورد تحویل
    const updated = await client.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DELIVERED,
        warehouseId,
        productId,
        stockTransactionId,
        journalVoucherId,
      },
      include: {
        customer: true,
        warehouse: true,
        product: true,
      },
    });

    return updated;
  }

  /**
   * برگشت یا ابطال تحویل بار و صدور سند معکوس COGS
   */
  static async reverseDelivery(deliveryId: number, reason: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) throw new Error('رکورد تحویل یافت نشد.');

    // صدور سند معکوس بهای تمام‌شده در صورت وجود
    if (delivery.journalVoucherId) {
      await VoucherService.reverseVoucher({
        voucherId: delivery.journalVoucherId,
        reason: `برگشت کالای تحویلی حواله ${delivery.deliveryNo} - ${reason}`,
      });
    }

    // به‌روزرسانی وضعیت تحویل به برگشت‌خورده
    return await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.RETURNED,
      },
    });
  }
}
