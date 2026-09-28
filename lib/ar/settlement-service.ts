import db from '@/lib/db';
import { Prisma, InvoiceStatus } from '@prisma/client';

export interface AllocationItem {
  invoiceId: number;
  amount: number | Prisma.Decimal;
  notes?: string;
}

export class SettlementService {
  /**
   * تخصیص دستی یا اختصاصی مبالغ یک پرداخت به فاکتورهای مشخص
   */
  static async allocatePayment(
    paymentId: number,
    allocations: AllocationItem[],
    externalTx?: Prisma.TransactionClient
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { customer: true },
      });

      if (!payment) {
        throw new Error(`پرداخت شماره ${paymentId} یافت نشد.`);
      }

      const paymentAmount = new Prisma.Decimal(payment.amount);
      let totalAllocated = new Prisma.Decimal(0);

      for (const item of allocations) {
        const itemAmount = new Prisma.Decimal(item.amount);
        if (itemAmount.lte(0)) {
          throw new Error('مبلغ تخصیص باید بزرگتر از صفر باشد.');
        }
        totalAllocated = totalAllocated.add(itemAmount);
      }

      if (totalAllocated.gt(paymentAmount)) {
        throw new Error(
          `مجموع مبالغ تخصیص‌یافته (${totalAllocated.toNumber().toLocaleString('fa-IR')}) نمی‌تواند از کل مبلغ پرداخت (${paymentAmount.toNumber().toLocaleString('fa-IR')}) بیشتر باشد.`
        );
      }

      // حذف تخصیص‌های قبلی این پرداخت
      await tx.paymentAllocation.deleteMany({
        where: { paymentId },
      });

      // ثبت تخصیص‌های جدید
      for (const item of allocations) {
        const itemAmount = new Prisma.Decimal(item.amount);
        await tx.paymentAllocation.create({
          data: {
            paymentId,
            invoiceId: item.invoiceId,
            amount: itemAmount,
            notes: item.notes || null,
          },
        });
      }

      // به‌روزرسانی وضعیت و مبالغ پرداختی فاکتورهای تحت تاثیر
      const affectedInvoiceIds = Array.from(new Set(allocations.map((a) => a.invoiceId)));
      if (payment.invoiceId && !affectedInvoiceIds.includes(payment.invoiceId)) {
        affectedInvoiceIds.push(payment.invoiceId);
      }

      for (const invId of affectedInvoiceIds) {
        await this.syncInvoiceSettlementStatus(invId, tx);
      }

      return {
        paymentId,
        paymentAmount,
        totalAllocated,
        unallocatedAmount: paymentAmount.sub(totalAllocated),
        allocatedCount: allocations.length,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(async (tx) => {
        return await execute(tx);
      });
    }
  }

  /**
   * تخصیص خودکار وجه دریافتی بر اساس الگوی FIFO (قدیمی‌ترین فاکتورهای پرداخت‌نشده)
   */
  static async autoAllocatePayment(paymentId: number, externalTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error(`پرداخت شماره ${paymentId} یافت نشد.`);
      }

      // اگر پرداخت مستقیماً به یک فاکتور وصل شده باشد، اول آن را تسویه می‌کنیم
      if (payment.invoiceId) {
        const targetInvoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
        });

        if (targetInvoice) {
          const allocationAmt = Math.min(payment.amount, targetInvoice.finalAmount);
          return await this.allocatePayment(
            paymentId,
            [{ invoiceId: targetInvoice.id, amount: allocationAmt, notes: 'تخصیص مستقیم فاکتور' }],
            tx
          );
        }
      }

      // در غیر این صورت، استخراج فاکتورهای باز مشتری به ترتیب تاریخ صدور (FIFO)
      const openInvoices = await tx.invoice.findMany({
        where: {
          customerId: payment.customerId,
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
        include: {
          allocations: true,
        },
        orderBy: { issueDate: 'asc' },
      });

      let remainingPayment = new Prisma.Decimal(payment.amount);
      const allocationsToCreate: AllocationItem[] = [];

      for (const inv of openInvoices) {
        if (remainingPayment.lte(0)) break;

        const currentSettled = inv.allocations.reduce(
          (sum, a) => sum.add(a.amount),
          new Prisma.Decimal(0)
        );
        const invTotal = new Prisma.Decimal(inv.finalAmount);
        const invRemaining = invTotal.sub(currentSettled);

        if (invRemaining.gt(0)) {
          const allocAmount = Prisma.Decimal.min(remainingPayment, invRemaining);
          allocationsToCreate.push({
            invoiceId: inv.id,
            amount: allocAmount,
            notes: 'تخصیص خودکار سیستم (FIFO)',
          });
          remainingPayment = remainingPayment.sub(allocAmount);
        }
      }

      if (allocationsToCreate.length > 0) {
        return await this.allocatePayment(paymentId, allocationsToCreate, tx);
      }

      return {
        paymentId,
        paymentAmount: new Prisma.Decimal(payment.amount),
        totalAllocated: new Prisma.Decimal(0),
        unallocatedAmount: new Prisma.Decimal(payment.amount),
        allocatedCount: 0,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await db.$transaction(async (tx) => {
        return await execute(tx);
      });
    }
  }

  /**
   * محاسبه دقیق مبلغ تسویه شده و به‌روزرسانی وضعیت فاکتور
   */
  static async syncInvoiceSettlementStatus(invoiceId: number, tx: Prisma.TransactionClient) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        allocations: true,
        payments: true,
      },
    });

    if (!invoice) return;

    // مجموع تخصیص‌های رسمی جدول واسط
    const allocationSum = invoice.allocations.reduce(
      (sum, a) => sum.add(a.amount),
      new Prisma.Decimal(0)
    );

    // مجموع پرداخت‌های مستقیم (جهت سازگاری کامل با رکوردهای بدون allocation)
    let directPaymentsSum = new Prisma.Decimal(0);
    for (const p of invoice.payments) {
      // اگر پرداخت قبلاً در allocation محاسبه نشده باشد
      const hasAllocation = invoice.allocations.some((a) => a.paymentId === p.id);
      if (!hasAllocation) {
        directPaymentsSum = directPaymentsSum.add(new Prisma.Decimal(p.amount));
      }
    }

    const totalPaid = allocationSum.add(directPaymentsSum);
    const invoiceFinal = new Prisma.Decimal(invoice.finalAmount);

    let status = invoice.status;
    if (status !== InvoiceStatus.CANCELLED) {
      if (totalPaid.gte(invoiceFinal) && invoiceFinal.gt(0)) {
        status = InvoiceStatus.PAID;
      } else if (totalPaid.gt(0)) {
        status = InvoiceStatus.PARTIAL;
      } else {
        if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
          status = InvoiceStatus.OVERDUE;
        } else {
          status = InvoiceStatus.PENDING;
        }
      }
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid.toNumber(),
        status,
      },
    });
  }

  /**
   * استخراج جزییات تسویه یک فاکتور
   */
  static async getInvoiceSettlements(invoiceId: number) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        allocations: {
          include: {
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: true,
      },
    });

    if (!invoice) throw new Error(`فاکتور ${invoiceId} یافت نشد.`);

    const settledAmount = invoice.allocations.reduce(
      (sum, a) => sum.add(a.amount),
      new Prisma.Decimal(0)
    );

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      finalAmount: invoice.finalAmount,
      paidAmount: invoice.paidAmount,
      remainingAmount: Math.max(0, invoice.finalAmount - invoice.paidAmount),
      status: invoice.status,
      allocations: invoice.allocations,
      directPayments: invoice.payments,
    };
  }
}
