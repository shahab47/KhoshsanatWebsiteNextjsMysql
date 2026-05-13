// مسیر فایل: src/app/api/khoshmin/customers/[id]/counts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی نامعتبر' }, { status: 400 });
    }

    // 🟢 اجرای تمام شمارش‌ها به صورت همزمان (موازی) برای بالاترین سرعت ممکن
    const [unreadMessages, newNotes, totalInvoices, totalPayments, totalDeliveries] = await Promise.all([
      db.customerMessage.count({ where: { customerId, isRead: false } }),
      db.customerNote.count({ where: { customerId, isNew: true } }),
      db.invoice.count({ where: { customerId } }),
      db.payment.count({ where: { customerId } }),
      db.delivery.count({ where: { customerId } })
    ]);

    return NextResponse.json({
      messages: unreadMessages,  // فقط پیام‌های خوانده نشده
      notes: newNotes,           // فقط یادداشت‌های جدید
      invoices: totalInvoices,   // کل فاکتورها
      payments: totalPayments,   // کل پرداختی‌ها
      deliveries: totalDeliveries// کل تحویل بارها
    });

  } catch (error) {
    console.error('Error fetching customer counts:', error);
    return NextResponse.json({ error: 'خطا در دریافت آمار' }, { status: 500 });
  }
}