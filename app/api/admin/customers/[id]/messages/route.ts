// src/app/api/admin/customers/[id]/messages/route.ts
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
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 });
    }
    const messages = await db.customerMessage.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت پیام‌ها' }, { status: 500 });
  }
}

// متد PUT برای ویرایش پاسخ ادمین
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const messageId = parseInt(url.searchParams.get('messageId') || '');
    const { adminReply } = await request.json();

    if (isNaN(customerId) || isNaN(messageId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.customerMessage.findFirst({
      where: { id: messageId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'پیام یافت نشد' }, { status: 404 });
    }

    const updated = await db.customerMessage.update({
      where: { id: messageId },
      data: { adminReply: adminReply?.trim() || null }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در ویرایش پاسخ' }, { status: 500 });
  }
}

// متد DELETE برای حذف یک پیام خاص
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const messageId = parseInt(url.searchParams.get('messageId') || '');

    if (isNaN(customerId) || isNaN(messageId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    // بررسی تعلق پیام به این مشتری (اختیاری اما امنیتی)
    const existing = await db.customerMessage.findFirst({
      where: { id: messageId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'پیام یافت نشد' }, { status: 404 });
    }

    await db.customerMessage.delete({
      where: { id: messageId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'خطا در حذف پیام' }, { status: 500 });
  }
}