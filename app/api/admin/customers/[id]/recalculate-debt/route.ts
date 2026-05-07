// src/app/api/admin/customers/[id]/recalculate-debt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST - محاسبه مجدد بدهی مشتری
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // تغییر اول: تعریف params به عنوان Promise
) {
  try {
    // تغییر دوم: استفاده از await برای باز کردن مقادیر params
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'آیدی مشتری نامعتبر است' },
        { status: 400 }
      );
    }
    
    // محاسبه مجموع فاکتورهای پرداخت نشده
    const unpaidInvoices = await db.invoice.aggregate({
      where: {
        customerId: customerId,
        status: { notIn: ['PAID', 'CANCELLED'] }
      },
      _sum: {
        finalAmount: true
      }
    });
    
    // محاسبه مجموع پرداختی‌ها
    const totalPaid = await db.payment.aggregate({
      where: { customerId: customerId },
      _sum: {
        amount: true
      }
    });
    
    const totalDebt = (unpaidInvoices._sum.finalAmount || 0) - (totalPaid._sum.amount || 0);
    
    // بروزرسانی اطلاعات مشتری
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
    return NextResponse.json(
      { error: 'خطا در محاسبه مجدد بدهی' },
      { status: 500 }
    );
  }
}