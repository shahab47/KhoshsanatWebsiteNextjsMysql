// src/app/api/khoshmin/customers/[id]/recalculate-debt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// POST - محاسبه مجدد و موازنه کامل حسابداری مشتری و فاکتورها
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }

    // ۱. بازسازی و همگام‌سازی وضعیت تسویه تک‌تک فاکتورهای مشتری
    const customerInvoices = await db.invoice.findMany({
      where: { customerId },
      include: { payments: true }
    });

    const now = new Date();
    for (const invoice of customerInvoices) {
      const paidSum = invoice.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      let status = invoice.status;
      if (status !== 'CANCELLED') {
        if (paidSum >= invoice.finalAmount && invoice.finalAmount > 0) {
          status = 'PAID';
        } else if (paidSum > 0) {
          status = 'PARTIAL';
        } else {
          if (invoice.dueDate && new Date(invoice.dueDate) < now) {
            status = 'OVERDUE';
          } else {
            status = 'PENDING';
          }
        }
      }
      await db.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: paidSum, status }
      });
    }
    
    // ۲. محاسبه مجموع تمام فاکتورهای لغو نشده
    const validInvoices = await db.invoice.aggregate({
      where: {
        customerId,
        status: { not: 'CANCELLED' }
      },
      _sum: { finalAmount: true }
    });
    
    // ۳. محاسبه مجموع تمام پرداختی‌های ثبت شده برای این مشتری
    const totalPaid = await db.payment.aggregate({
      where: { customerId },
      _sum: { amount: true }
    });
    
    // ۴. تراز نهایی بدهی/بستانکاری
    const totalInv = validInvoices._sum.finalAmount || 0;
    const totalPay = totalPaid._sum.amount || 0;
    const totalDebt = totalInv - totalPay;
    
    // ۵. بروزرسانی در دیتابیس
    const updatedCustomer = await db.customer.update({
      where: { id: customerId },
      data: {
        totalDebt: totalDebt,
        totalPaid: totalPay
      }
    });
    
    return NextResponse.json({
      customerId: updatedCustomer.id,
      totalInvoices: totalInv,
      totalPaid: updatedCustomer.totalPaid,
      totalDebt: updatedCustomer.totalDebt,
      syncedInvoicesCount: customerInvoices.length,
      message: 'تراز مالی مشتری و وضعیت تمام فاکتورها با موفقیت موازنه شد'
    });
    
  } catch (error) {
    console.error('Error recalculating debt:', error);
    return NextResponse.json({ error: 'خطا در محاسبه مجدد بدهی' }, { status: 500 });
  }
}