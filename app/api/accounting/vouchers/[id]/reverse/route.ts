import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { VoucherService } from '@/lib/accounting/voucher-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'ذکر دلیل موجه و معتبر جهت ابطال و برگشت سند الزامی است' },
        { status: 400 }
      );
    }

    const reversal = await VoucherService.reverseVoucher({
      voucherId: id,
      reason,
      createdById: (user as any).id ? String((user as any).id) : null,
    });

    return NextResponse.json({
      success: true,
      message: `سند معکوس شماره ${reversal.voucherNo} صادر و ثبت شد.`,
      reversalVoucher: reversal,
    });
  } catch (error: any) {
    console.error('Error reversing voucher:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در صدور سند برگشت' },
      { status: 400 }
    );
  }
}
