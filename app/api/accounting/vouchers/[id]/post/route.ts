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
    const updated = await VoucherService.finalizeVoucher(
      id,
      (user as any).id ? String((user as any).id) : null
    );

    return NextResponse.json({
      success: true,
      message: `سند شماره ${updated.voucherNo} با موفقیت قطعی و قفل شد.`,
      voucher: updated,
    });
  } catch (error: any) {
    console.error('Error finalizing voucher:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در قطعی‌سازی سند' },
      { status: 400 }
    );
  }
}
