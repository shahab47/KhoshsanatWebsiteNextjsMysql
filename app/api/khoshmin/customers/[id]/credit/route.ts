import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { CreditService } from '@/lib/ar/credit-service';

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

    const status = await CreditService.getCustomerCreditStatus(customerId);

    return NextResponse.json({
      ...status,
      creditLimit: Number(status.creditLimit),
      arLedgerBalance: Number(status.arLedgerBalance),
      pendingChequesAmount: Number(status.pendingChequesAmount),
      openOrdersAmount: Number(status.openOrdersAmount),
      totalExposure: Number(status.totalExposure),
      availableCredit: Number(status.availableCredit),
    });
  } catch (error: any) {
    console.error('Error fetching credit status:', error);
    return NextResponse.json({ error: error?.message || 'خطا در دریافت وضعیت اعتبار' }, { status: 500 });
  }
}

export async function PUT(
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
    const { creditLimit, isCreditBlocked, creditBlockReason, riskRating } = body;

    const updated = await CreditService.updateCreditSettings(customerId, {
      creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
      isCreditBlocked: isCreditBlocked !== undefined ? Boolean(isCreditBlocked) : undefined,
      creditBlockReason,
      riskRating,
    });

    const status = await CreditService.getCustomerCreditStatus(customerId);

    return NextResponse.json({
      message: 'تنظیمات اعتبار مشتری با موفقیت به‌روزرسانی شد.',
      customer: updated,
      creditStatus: {
        ...status,
        creditLimit: Number(status.creditLimit),
        arLedgerBalance: Number(status.arLedgerBalance),
        pendingChequesAmount: Number(status.pendingChequesAmount),
        openOrdersAmount: Number(status.openOrdersAmount),
        totalExposure: Number(status.totalExposure),
        availableCredit: Number(status.availableCredit),
      },
    });
  } catch (error: any) {
    console.error('Error updating credit settings:', error);
    return NextResponse.json({ error: error?.message || 'خطا در تنظیم اعتبار مشتری' }, { status: 500 });
  }
}
