import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { PettyCashService } from '@/lib/treasury/petty-cash-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const transactions = await db.pettyCashTransaction.findMany({
      where: { fundId: id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching petty cash transactions:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت گردش تنخواه' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // تسویه صورت وضعیت تنخواه
    if (body.action === 'settle') {
      if (!body.transactionIds || !Array.isArray(body.transactionIds) || body.transactionIds.length === 0) {
        return NextResponse.json({ error: 'شناسه تراکنش‌های هزینه جهت تسویه الزامی است.' }, { status: 400 });
      }
      const settlement = await PettyCashService.settlePettyCash(id, body.transactionIds);
      return NextResponse.json(settlement);
    }

    // ثبت ردیف هزینه تنخواه
    if (!body.amount) {
      return NextResponse.json({ error: 'مبلغ هزینه الزامی است.' }, { status: 400 });
    }

    const expense = await PettyCashService.recordExpense(id, body);
    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error('Error in petty cash transaction POST:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت هزینه تنخواه' }, { status: 400 });
  }
}
