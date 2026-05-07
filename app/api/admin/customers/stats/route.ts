// src/app/api/admin/customers/stats/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // تعداد مشتریانی که در 7 روز اخیر ثبت شده‌اند و هنوز توسط ادمین دیده نشده‌اند
    const newCustomers = await db.customer.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        isViewedByAdmin: false,  // فقط مشتریان جدید دیده‌نشده
      }
    });
    
    // تعداد پیام‌های خوانده نشده
    const unreadMessages = await db.customerMessage.count({
      where: { isRead: false }
    });
    
    return NextResponse.json({
      total: await db.customer.count(),
      newCustomers,
      unreadMessages
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت آمار' },
      { status: 500 }
    );
  }
}