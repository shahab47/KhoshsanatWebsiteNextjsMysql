import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { ChequeService } from '@/lib/treasury/cheque-service';
import { ChequeStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ChequeStatus | null;
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search');
    const dueFrom = searchParams.get('dueFrom');
    const dueTo = searchParams.get('dueTo');

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = parseInt(customerId);
    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) where.dueDate.gte = new Date(dueFrom);
      if (dueTo) where.dueDate.lte = new Date(dueTo);
    }
    if (search) {
      where.OR = [
        { sayadId: { contains: search } },
        { chequeNumber: { contains: search } },
        { drawerName: { contains: search } },
        { bankName: { contains: search } },
      ];
    }

    const cheques = await db.cheque.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, company: true } },
        bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(cheques);
  } catch (error: any) {
    console.error('Error fetching cheques:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست چک‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await ChequeService.receiveCheque(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error registering cheque:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت چک صیادی' }, { status: 400 });
  }
}
