import db from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SequenceService } from '@/lib/accounting/sequence-service';

export interface CreateSupplierInput {
  name: string;
  companyName?: string | null;
  nationalId?: string | null;
  economicCode?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIban?: string | null;
  creditLimit?: number | Prisma.Decimal;
  rating?: string;
}

export class SupplierService {
  /**
   * ایجاد تامین‌کننده جدید با تولید کد یکتا و اتمیک
   */
  static async createSupplier(input: CreateSupplierInput, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    if (!input.name || !input.name.trim()) {
      throw new Error('نام تامین‌کننده الزامی است.');
    }

    if (input.nationalId) {
      const existing = await client.supplier.findUnique({
        where: { nationalId: input.nationalId.trim() },
      });
      if (existing) {
        throw new Error(`تامین‌کننده‌ای با شناسه ملی ${input.nationalId} قبلاً ثبت شده است.`);
      }
    }

    const { formattedNumber } = await SequenceService.nextNumber('SUPPLIER', null, client);

    return await client.supplier.create({
      data: {
        code: formattedNumber,
        name: input.name.trim(),
        companyName: input.companyName?.trim() || null,
        nationalId: input.nationalId?.trim() || null,
        economicCode: input.economicCode?.trim() || null,
        phone: input.phone?.trim() || null,
        mobile: input.mobile?.trim() || null,
        address: input.address?.trim() || null,
        contactPerson: input.contactPerson?.trim() || null,
        bankName: input.bankName?.trim() || null,
        bankAccount: input.bankAccount?.trim() || null,
        bankIban: input.bankIban?.trim() || null,
        creditLimit: input.creditLimit ? new Prisma.Decimal(input.creditLimit) : new Prisma.Decimal(0),
        rating: input.rating || 'A',
        isActive: true,
      },
    });
  }

  /**
   * ویرایش مشخصات تامین‌کننده
   */
  static async updateSupplier(id: string, input: Partial<CreateSupplierInput>, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    const existing = await client.supplier.findUnique({ where: { id } });
    if (!existing) throw new Error('تامین‌کننده یافت نشد.');

    return await client.supplier.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name.trim() : existing.name,
        companyName: input.companyName !== undefined ? (input.companyName ? input.companyName.trim() : null) : existing.companyName,
        nationalId: input.nationalId !== undefined ? (input.nationalId ? input.nationalId.trim() : null) : existing.nationalId,
        economicCode: input.economicCode !== undefined ? (input.economicCode ? input.economicCode.trim() : null) : existing.economicCode,
        phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : existing.phone,
        mobile: input.mobile !== undefined ? (input.mobile ? input.mobile.trim() : null) : existing.mobile,
        address: input.address !== undefined ? (input.address ? input.address.trim() : null) : existing.address,
        contactPerson: input.contactPerson !== undefined ? (input.contactPerson ? input.contactPerson.trim() : null) : existing.contactPerson,
        bankName: input.bankName !== undefined ? (input.bankName ? input.bankName.trim() : null) : existing.bankName,
        bankAccount: input.bankAccount !== undefined ? (input.bankAccount ? input.bankAccount.trim() : null) : existing.bankAccount,
        bankIban: input.bankIban !== undefined ? (input.bankIban ? input.bankIban.trim() : null) : existing.bankIban,
        creditLimit: input.creditLimit !== undefined ? new Prisma.Decimal(input.creditLimit) : existing.creditLimit,
        rating: input.rating || existing.rating,
      },
    });
  }

  /**
   * محاسبه مجدد مانده بستانکاری دفتری تامین‌کننده (AP Balance)
   */
  static async recalculatePayable(supplierId: string, tx?: Prisma.TransactionClient) {
    const client = tx || db;

    // مجموع فاکتورهای معتبر خرید
    const invoices = await client.supplierInvoice.aggregate({
      where: { supplierId, status: { not: 'CANCELLED' } },
      _sum: { finalAmount: true },
    });

    // مجموع پرداخت‌ها به تامین‌کننده
    const payments = await client.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    });

    const totalInvoiced = invoices._sum.finalAmount || new Prisma.Decimal(0);
    const totalPaid = payments._sum.amount || new Prisma.Decimal(0);
    const balance = totalInvoiced.sub(totalPaid);

    await client.supplier.update({
      where: { id: supplierId },
      data: { totalPayable: balance },
    });

    return balance;
  }

  /**
   * دریافت لیست تامین‌کنندگان همراه با شمارنده‌ها
   */
  static async getSuppliers(params?: {
    search?: string;
    rating?: string;
    isActive?: boolean;
    limit?: number;
    skip?: number;
  }) {
    const where: Prisma.SupplierWhereInput = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params?.rating) {
      where.rating = params.rating;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q } },
        { companyName: { contains: q } },
        { code: { contains: q } },
        { nationalId: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      db.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              purchaseOrders: true,
              goodsReceipts: true,
              invoices: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params?.limit || 50,
        skip: params?.skip || 0,
      }),
      db.supplier.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * دریافت پروفایل ۳۶۰ درجه تامین‌کننده
   */
  static async getSupplierById(id: string) {
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          include: { items: { include: { product: true } } },
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        goodsReceipts: {
          include: { warehouse: true, items: { include: { product: true } } },
          orderBy: { receiptDate: 'desc' },
          take: 10,
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 10,
        },
        payments: {
          include: { bankAccount: true, cheque: true },
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) throw new Error('تامین‌کننده یافت نشد.');
    return supplier;
  }
}
