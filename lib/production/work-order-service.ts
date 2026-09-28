import db from '@/lib/db';
import { Prisma, OrderStatus } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';
import { InventoryService } from '@/lib/warehouse/inventory-service';

export interface CreateWorkOrderInput {
  customerId: number;
  bomId: string;
  targetQuantity: number | Prisma.Decimal;
  targetDate?: Date | string | null;
  priority?: string;
  companyId?: string | null;
  description?: string | null;
}

export class WorkOrderService {
  /**
   * صدور دستور کار ساخت جدید (Work Order / MTO-ETO Job Order) با شماره‌گذاری اتمیک WO-XXXXXX
   */
  static async createWorkOrder(input: CreateWorkOrderInput, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      if (!input.customerId) {
        throw new Error('انتخاب مشتری برای صدور دستور کار ساخت الزامی است.');
      }
      if (!input.bomId) {
        throw new Error('انتخاب فرمول ساخت (BOM) الزامی است.');
      }

      const targetQty = new Prisma.Decimal(input.targetQuantity);
      if (targetQty.lte(0)) {
        throw new Error('تیراژ درخواستی ساخت باید بزرگتر از صفر باشد.');
      }

      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) throw new Error('مشتری مورد نظر یافت نشد.');

      const bom = await tx.bOM.findUnique({
        where: { id: input.bomId },
        include: { product: true, items: true },
      });
      if (!bom) throw new Error('فرمول ساخت (BOM) یافت نشد.');
      if (!bom.isActive) throw new Error('این فرمول ساخت در وضعیت غیرفعال قرار دارد.');

      let companyId = input.companyId;
      if (!companyId) {
        const defaultCompany = await tx.company.findFirst({ where: { isDefault: true } });
        companyId = defaultCompany?.id || null;
      }

      // تولید شماره اتمیک WO-XXXXXX
      const { formattedNumber } = await SequenceService.nextNumber('WORK_ORDER', companyId, tx);

      const order = await tx.productionOrder.create({
        data: {
          orderNumber: formattedNumber,
          customerId: input.customerId,
          bomId: input.bomId,
          companyId,
          targetQuantity: targetQty,
          actualQuantity: new Prisma.Decimal(0),
          status: OrderStatus.PLANNED,
          priority: input.priority || 'NORMAL',
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          actualMaterialCost: new Prisma.Decimal(0),
          actualLaborCost: new Prisma.Decimal(0),
          actualOverheadCost: new Prisma.Decimal(0),
          finalCostPerUnit: new Prisma.Decimal(0),
          description: input.description?.trim() || null,
        },
        include: {
          customer: true,
          bom: {
            include: {
              product: true,
              items: { include: { rawMaterial: true } },
            },
          },
        },
      });

      return order;
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(execute);
    }
  }

  /**
   * بررسی موجودی متریال اولیه در انبار و اعتبارسنجی امکان اجرای دستور کار (Material Availability Check)
   */
  static async checkMaterialAvailability(bomId: string, targetQuantity: number | Prisma.Decimal, warehouseCode: string = 'WH-RAW-01') {
    const bom = await db.bOM.findUnique({
      where: { id: bomId },
      include: {
        items: { include: { rawMaterial: true } },
      },
    });

    if (!bom) throw new Error('فرمول ساخت یافت نشد.');

    const warehouse = await db.warehouse.findUnique({ where: { code: warehouseCode } });
    const warehouseId = warehouse?.id || 'WH-RAW-01';

    const qtyMultiplier = new Prisma.Decimal(targetQuantity);
    let canProduce = true;

    const materials = await Promise.all(
      bom.items.map(async (item) => {
        const grossPerUnit = item.quantity.mul(new Prisma.Decimal(1).add(item.wastePercent.div(100)));
        const totalRequired = grossPerUnit.mul(qtyMultiplier);

        const stock = await InventoryService.getCurrentStockAndAverageCost(
          warehouseId,
          item.rawMaterialId
        );

        const hasDeficit = stock.currentQuantity.lt(totalRequired);
        if (hasDeficit) canProduce = false;

        return {
          rawMaterialId: item.rawMaterialId,
          title: item.rawMaterial.title,
          requiredQuantity: totalRequired,
          currentStock: stock.currentQuantity,
          deficit: hasDeficit ? totalRequired.sub(stock.currentQuantity) : new Prisma.Decimal(0),
          isAvailable: !hasDeficit,
        };
      })
    );

    return {
      canProduce,
      materials,
    };
  }

  /**
   * آغاز رسمی عملیات ساخت و ورود به خط تولید
   */
  static async startWorkOrder(id: string) {
    const order = await db.productionOrder.findUnique({ where: { id } });
    if (!order) throw new Error('دستور کار یافت نشد.');

    if (order.status !== OrderStatus.PLANNED) {
      throw new Error(`دستور کار در وضعیت ${order.status} قابل آغاز مجدد نیست.`);
    }

    return await db.productionOrder.update({
      where: { id },
      data: {
        status: OrderStatus.IN_PRODUCTION,
        startDate: new Date(),
      },
      include: {
        customer: true,
        bom: { include: { product: true } },
      },
    });
  }

  /**
   * دریافت لیست دستور کارهای کارخانه با فیلتر
   */
  static async getWorkOrders(options?: {
    customerId?: number;
    status?: OrderStatus;
    search?: string;
    priority?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.ProductionOrderWhereInput = {};

    if (options?.customerId) where.customerId = options.customerId;
    if (options?.status) where.status = options.status;
    if (options?.priority) where.priority = options.priority;

    if (options?.search) {
      const q = options.search.trim();
      where.OR = [
        { orderNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { bom: { title: { contains: q } } },
        { bom: { product: { title: { contains: q } } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.productionOrder.findMany({
        where,
        include: {
          customer: true,
          bom: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.skip || 0,
      }),
      db.productionOrder.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت جزئیات کامل یک دستور کار
   */
  static async getWorkOrderById(id: string) {
    const order = await db.productionOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        bom: {
          include: {
            product: true,
            items: { include: { rawMaterial: true } },
          },
        },
        deliveries: true,
      },
    });

    if (!order) throw new Error('دستور کار مورد نظر یافت نشد.');
    return order;
  }
}
