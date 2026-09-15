// مسیر فایل: src/app/api/khoshmin/customers/[id]/mark/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

export async function PATCH(
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

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); 

    switch (type) {
      case 'customer':
        // علامت‌زنی مشتری به عنوان دیده‌شده (حذف از لیست مشتریان جدید)
        await db.customer.update({
          where: { id: customerId },
          data: { isViewedByAdmin: true }
        });
        break;

      case 'messages':
        // علامت‌زنی همه پیام‌های این مشتری به عنوان خوانده شده
        await db.customerMessage.updateMany({
          where: { customerId, isRead: false },
          data: { isRead: true }
        });
        await db.customer.update({
          where: { id: customerId },
          data: { unreadMessagesCount: 0 }
        });
        break;

      case 'notes':
        // علامت‌زنی یادداشت‌ها به عنوان خوانده شده
        await db.customerNote.updateMany({
          where: { customerId, isNew: true },
          data: { isNew: false }
        });
        break;

      default:
        return NextResponse.json({ error: 'نوع عملیات نامعتبر است' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark API:', error);
    return NextResponse.json({ error: 'خطا در بروزرسانی وضعیت' }, { status: 500 });
  }
}