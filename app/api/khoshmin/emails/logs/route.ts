// app/api/khoshmin/emails/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    const payload: any = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'توکن نامعتبر است.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const where: any = {};
    if (status && (status === 'SENT' || status === 'FAILED')) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { senderEmail: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    const logs = await db.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'خطا در دریافت تاریخچه ایمیل‌ها' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    const payload: any = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'توکن نامعتبر است.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'شناسه لاگ مشخص نشده است.' }, { status: 400 });
    }

    await db.emailLog.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true, message: 'لاگ با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Error deleting email log:', error);
    return NextResponse.json({ error: 'خطا در حذف لاگ ایمیل' }, { status: 500 });
  }
}
