import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const accounts = await db.account.findMany({
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
      include: {
        parent: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'خطا در دریافت درخت حساب‌ها' }, { status: 500 });
  }
}
