import db from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { InventoryService } from '@/lib/warehouse/inventory-service';

export interface CreateBOMItemInput {
  rawMaterialId: number;
  quantity: number | Prisma.Decimal;
  wastePercent?: number | Prisma.Decimal;
}

export interface CreateBOMInput {
  productId: number;
  title: string;
  code?: string;
  description?: string | null;
  laborHours?: number | Prisma.Decimal;
  overheadRate?: number | Prisma.Decimal;
  version?: number;
  items: CreateBOMItemInput[];
}

export class BOMService {
  /**
   * ایجاد فرمول ساخت استاندارد (BOM / درخت محصول صنعتی) با شماره‌گذاری اتمیک BOM-XXXXXX
   */
  static async createBOM(input: CreateBOMInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      if (!input.productId) {
        throw new Error('انتخاب محصول نهایی برای فرمول ساخت الزامی است.');
      }
      if (!input.title || !input.title.trim()) {
        throw new Error('عنوان فرمول ساخت الزامی است.');
      }
      if (!input.items || input.items.length === 0) {
        throw new Error('ثبت حداقل یک قلم ماده اولیه در فرمول ساخت الزامی است.');
      }

      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) throw new Error('محصول نهایی در سیستم یافت نشد.');

      // تولید کد یکتا BOM-XXXXXX
      const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
      const { formattedNumber } = await SequenceService.nextNumber('BOM', defaultCompany?.id || null, tx);

      const laborHours = input.laborHours ? new Prisma.Decimal(input.laborHours) : new Prisma.Decimal(0);
      const overheadRate = input.overheadRate ? new Prisma.Decimal(input.overheadRate) : new Prisma.Decimal(0);

      const bom = await tx.bOM.create({
        data: {
          code: input.code?.trim() || formattedNumber,
          title: input.title.trim(),
          productId: input.productId,
          version: input.version || 1,
          description: input.description?.trim() || null,
          laborHours,
          overheadRate,
          isActive: true,
          items: {
            create: input.items.map((it) => {
              const qty = new Prisma.Decimal(it.quantity);
              const waste = it.wastePercent !== undefined ? new Prisma.Decimal(it.wastePercent) : new Prisma.Decimal(0);
              if (qty.lte(0)) {
                throw new Error('مقدار مصرف ماده اولیه در فرمول ساخت باید بزرگتر از صفر باشد.');
              }
              return {
                rawMaterialId: it.rawMaterialId,
                quantity: qty,
                wastePercent: waste,
              };
            }),
          },
        },
        include: {
          product: true,
          items: {
            include: { rawMaterial: true },
          },
        },
      });

      return bom;
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * محاسبه بهای تمام‌شده استاندارد فرمول ساخت بر مبنای آخرین نرخ میانگین موزون کاردکس انبار مواد اولیه
   */
  static async calculateStandardCost(bomId: string, warehouseCode: string = 'WH-RAW-01') {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        product: true,
        items: {
          include: { rawMaterial: true },
        },
      },
    });

    if (!bom) throw new Error('فرمول ساخت مورد نظر یافت نشد.');

    const warehouse = await db.warehouse.findUnique({ where: { code: warehouseCode } });
    const warehouseId = warehouse?.id || 'WH-RAW-01';

    let totalMaterialStandardCost = new Prisma.Decimal(0);

    const calculatedItems = await Promise.all(
      bom.items.map(async (item) => {
        // دریافت آخرین بهای میانگین موزون متحرک متریال از کاردکس انبار
        const stockInfo = await InventoryService.getCurrentStockAndAverageCost(
          warehouseId,
          item.rawMaterialId
        );

        const unitCost = stockInfo.averageCost;
        // ضریب پرت مصالح: Q * (1 + waste% / 100)
        const grossQty = item.quantity.mul(new Prisma.Decimal(1).add(item.wastePercent.div(100)));
        const itemTotalCost = grossQty.mul(unitCost);

        totalMaterialStandardCost = totalMaterialStandardCost.add(itemTotalCost);

        return {
          rawMaterialId: item.rawMaterialId,
          rawMaterialTitle: item.rawMaterial.title,
          netQuantity: item.quantity,
          wastePercent: item.wastePercent,
          grossQuantity: grossQty,
          currentAverageUnitCost: unitCost,
          currentWarehouseStock: stockInfo.currentQuantity,
          totalStandardCost: itemTotalCost,
        };
      })
    );

    // دستمزد مستقیم استاندارد تخمینی (با فرض دستمزد ساعتی پیش‌فرض یا نرخ سربار)
    const directLaborStandardCost = bom.laborHours.mul(150_000); // مبنای ساعتی ۱۵۰ هزار تومان
    const overheadStandardCost = bom.laborHours.mul(bom.overheadRate);

    const totalStandardCost = totalMaterialStandardCost.add(directLaborStandardCost).add(overheadStandardCost);

    return {
      bomId: bom.id,
      bomCode: bom.code,
      bomTitle: bom.title,
      productTitle: bom.product.title,
      items: calculatedItems,
      totalMaterialStandardCost,
      directLaborStandardCost,
      overheadStandardCost,
      totalStandardCost,
    };
  }

  /**
   * دریافت لیست فرمول‌های ساخت با امکان فیلتر
   */
  static async getBOMs(options?: {
    productId?: number;
    search?: string;
    isActive?: boolean;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.BOMWhereInput = {};

    if (options?.productId) where.productId = options.productId;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { code: { contains: term } },
        { title: { contains: term } },
        { product: { title: { contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.bOM.findMany({
        where,
        include: {
          product: true,
          items: {
            include: { rawMaterial: true },
          },
          _count: {
            select: { productionOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.skip || 0,
      }),
      db.bOM.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت جزئیات کامل یک فرمول ساخت
   */
  static async getBOMById(id: string) {
    const bom = await db.bOM.findUnique({
      where: { id },
      include: {
        product: true,
        items: {
          include: { rawMaterial: true },
        },
        productionOrders: {
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!bom) throw new Error('فرمول ساخت یافت نشد.');
    return bom;
  }
}
