import db from '@/lib/db';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface CreatePurchaseOrderItemInput {
  productId: number;
  orderedQty: number | Prisma.Decimal;
  unitPrice: number | Prisma.Decimal;
  taxRate?: number | Prisma.Decimal; // پیش‌فرض ۱۰٪
  uom?: string;
  steelGrade?: string | null;
  heatNumber?: string | null;
  batchNumber?: string | null;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  companyId?: string | null;
  expectedDate?: Date | string | null;
  freightCost?: number | Prisma.Decimal;
  description?: string | null;
  items: CreatePurchaseOrderItemInput[];
}

export class PurchaseOrderService {
  /**
   * ثبت سفارش خرید مقاطع فلزی جدید (Industrial PO)
   */
  static async createPurchaseOrder(input: CreatePurchaseOrderInput, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    if (!input.supplierId) {
      throw new Error('انتخاب تامین‌کننده الزامی است.');
    }
    if (!input.items || input.items.length === 0) {
      throw new Error('ثبت حداقل یک قلم کالا در سفارش خرید الزامی است.');
    }

    const supplier = await client.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new Error('تامین‌کننده یافت نشد.');

    // محاسبه مبالغ اقلام
    let subtotal = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const calculatedItems = input.items.map((item) => {
      const qty = new Prisma.Decimal(item.orderedQty);
      const price = new Prisma.Decimal(item.unitPrice);
      const taxRate = item.taxRate !== undefined ? new Prisma.Decimal(item.taxRate) : new Prisma.Decimal(10.0);

      if (qty.lte(0) || price.lte(0)) {
        throw new Error('مقدار و قیمت واحد کالا باید بزرگتر از صفر باشند.');
      }

      const totalPrice = qty.mul(price);
      const taxAmount = totalPrice.mul(taxRate).div(100);
      const finalAmount = totalPrice.add(taxAmount);

      subtotal = subtotal.add(totalPrice);
      totalTax = totalTax.add(taxAmount);

      return {
        productId: item.productId,
        orderedQty: qty,
        unitPrice: price,
        totalPrice,
        taxRate,
        taxAmount,
        finalAmount,
        uom: item.uom || 'KG',
        steelGrade: item.steelGrade || null,
        heatNumber: item.heatNumber || null,
        batchNumber: item.batchNumber || null,
      };
    });

    const freight = input.freightCost ? new Prisma.Decimal(input.freightCost) : new Prisma.Decimal(0);
    const grandTotal = subtotal.add(totalTax).add(freight);

    let companyId = input.companyId;
    if (!companyId) {
      const defaultCompany = await client.company.findFirst({ where: { isDefault: true } });
      companyId = defaultCompany?.id || null;
    }

    const { formattedNumber } = await SequenceService.nextNumber('PURCHASE_ORDER', companyId, client);

    return await client.purchaseOrder.create({
      data: {
        orderNo: formattedNumber,
        supplierId: input.supplierId,
        companyId,
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        status: PurchaseOrderStatus.DRAFT,
        subtotal,
        taxAmount: totalTax,
        freightCost: freight,
        totalAmount: grandTotal,
        description: input.description?.trim() || null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  /**
   * تایید سفارش خرید جهت ارسال به تامین‌کننده
   */
  static async approvePurchaseOrder(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    const po = await client.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new Error('سفارش خرید یافت نشد.');
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error(`سفارش خرید در وضعیت ${po.status} قابل تایید نیست.`);
    }

    return await client.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.APPROVED },
      include: { supplier: true, items: { include: { product: true } } },
    });
  }

  /**
   * ابطال سفارش خرید
   */
  static async cancelPurchaseOrder(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    const po = await client.purchaseOrder.findUnique({
      where: { id },
      include: { goodsReceipts: true },
    });
    if (!po) throw new Error('سفارش خرید یافت نشد.');
    if (po.goodsReceipts && po.goodsReceipts.length > 0) {
      throw new Error('برای این سفارش رسید ورود بار صادر شده است و امکان ابطال مستقیم وجود ندارد.');
    }

    return await client.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
    });
  }

  /**
   * دریافت لیست سفارش‌های خرید با فیلتر
   */
  static async getPurchaseOrders(params?: {
    supplierId?: string;
    status?: PurchaseOrderStatus;
    search?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (params?.supplierId) where.supplierId = params.supplierId;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { orderNo: { contains: q } },
        { supplier: { name: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: { include: { product: true } },
          _count: { select: { goodsReceipts: true, invoices: true } },
        },
        orderBy: { orderDate: 'desc' },
        take: params?.limit || 50,
        skip: params?.skip || 0,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت سفارش خرید با تمام جزئیات
   */
  static async getPurchaseOrderById(id: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        goodsReceipts: {
          include: { warehouse: true, items: { include: { product: true } } },
          orderBy: { receiptDate: 'desc' },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
        },
      },
    });

    if (!po) throw new Error('سفارش خرید یافت نشد.');
    return po;
  }
}
