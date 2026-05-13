import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی نامعتبر' }, { status: 400 });
    }
    await db.customerMessage.updateMany({
      where: { customerId, isRead: false },
      data: { isRead: true }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در بروزرسانی' }, { status: 500 });
  }
}