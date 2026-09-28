import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { SettlementService } from '@/lib/ar/settlement-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const allocations = await db.paymentAllocation.findMany({
      where: {
        payment: { customerId },
      },
      include: {
        payment: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(allocations);
  } catch (error: any) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: 'خطا در دریافت تخصیص‌های پرداخت' }, { status: 500 });
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
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const body = await request.json();
    const { paymentId, allocations } = body;

    if (!paymentId || !Array.isArray(allocations)) {
      return NextResponse.json({ error: 'اطلاعات تخصیص نامعتبر است.' }, { status: 400 });
    }

    const result = await SettlementService.allocatePayment(paymentId, allocations);

    return NextResponse.json({
      success: true,
      message: 'تخصیص تسویه با موفقیت ثبت و وضعیت فاکتورها به‌روز شد.',
      result,
    });
  } catch (error: any) {
    console.error('Error allocating payment:', error);
    return NextResponse.json({ error: error?.message || 'خطا در تخصیص تسویه فاکتور' }, { status: 500 });
  }
}
