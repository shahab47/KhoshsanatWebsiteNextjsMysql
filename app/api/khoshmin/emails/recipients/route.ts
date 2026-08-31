// app/api/khoshmin/emails/recipients/route.ts
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
    const q = searchParams.get('q')?.trim() || '';

    // دریافت مشتریان
    const customers = await db.customer.findMany({
      where: q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
        ],
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      },
      take: 20,
    });

    // دریافت ادمین‌ها
    const users = await db.user.findMany({
      where: q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: 10,
    });

    return NextResponse.json({
      customers,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching email recipients:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست مخاطبین' }, { status: 500 });
  }
}
