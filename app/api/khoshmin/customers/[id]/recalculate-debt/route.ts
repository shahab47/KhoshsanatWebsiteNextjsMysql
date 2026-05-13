// src/app/api/khoshmin/customers/[id]/recalculate-debt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST - محاسبه مجدد بدهی مشتری
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }
    
    // 🟢 اصلاح مهم محاسباتی: 
    // برای محاسبه درست تراز مالی، باید تمام فاکتورهایی که "لغو نشده‌اند" را جمع بزنیم.
    // چه فاکتور پرداخت شده باشد (PAID) و چه در انتظار (PENDING)، مبلغ آن باید جزو "هزینه‌های مشتری" حساب شود.
    const validInvoices = await db.invoice.aggregate({
      where: {
        customerId: customerId,
        status: { not: 'CANCELLED' } // فقط فاکتورهای لغو شده را از محاسبات خارج می‌کنیم
      },
      _sum: { finalAmount: true }
    });
    
    // محاسبه مجموع همه پرداختی‌های ثبت شده برای این مشتری
    const totalPaid = await db.payment.aggregate({
      where: { customerId: customerId },
      _sum: { amount: true }
    });
    
    // بدهی نهایی = (کل فاکتورهای معتبر) منهای (کل مبالغ پرداختی)
    // اگر این عدد مثبت شود یعنی مشتری بدهکار است
    // اگر منفی شود یعنی مشتری بستانکار (طلبکار / پیش‌پرداخت داشته) است
    const totalDebt = (validInvoices._sum.finalAmount || 0) - (totalPaid._sum.amount || 0);
    
    // بروزرسانی فیلدهای مربوطه در اطلاعات مشتری در دیتابیس
    const updatedCustomer = await db.customer.update({
      where: { id: customerId },
      data: {
        totalDebt: totalDebt,
        totalPaid: totalPaid._sum.amount || 0
      }
    });
    
    return NextResponse.json({
      customerId: updatedCustomer.id,
      totalDebt: updatedCustomer.totalDebt,
      totalPaid: updatedCustomer.totalPaid,
      message: 'بدهی با موفقیت محاسبه و بروزرسانی شد'
    });
    
  } catch (error) {
    console.error('Error recalculating debt:', error);
    return NextResponse.json({ error: 'خطا در محاسبه مجدد بدهی' }, { status: 500 });
  }
}