import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { PettyCashService } from '@/lib/treasury/petty-cash-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const funds = await db.pettyCashFund.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(funds);
  } catch (error: any) {
    console.error('Error fetching petty cash funds:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست صندوق‌های تنخواه' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();

    // شارژ تنخواه از حساب بانکی
    if (body.action === 'fund') {
      if (!body.fundId || !body.bankAccountId || !body.amount) {
        return NextResponse.json({ error: 'اطلاعات شارژ تنخواه (صندوق، حساب بانکی و مبلغ) الزامی است.' }, { status: 400 });
      }
      const tx = await PettyCashService.fundPettyCash(body.fundId, body.bankAccountId, body.amount);
      return NextResponse.json(tx, { status: 201 });
    }

    // ایجاد صندوق جدید
    if (!body.code || !body.title || !body.holderName || !body.limitAmount) {
      return NextResponse.json({ error: 'کد، عنوان، نام تنخواه‌دار و سقف مجاز الزامی است.' }, { status: 400 });
    }

    const created = await PettyCashService.createFund(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error in petty cash POST:', error);
    return NextResponse.json({ error: error.message || 'خطا در عملیات تنخواه' }, { status: 400 });
  }
}
