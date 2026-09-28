import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { VoucherService } from '@/lib/accounting/voucher-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const companyId = searchParams.get('companyId') || undefined;

    const vouchers = await VoucherService.getJournalBook({
      startDate,
      endDate,
      companyId,
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('Error getting journal book:', error);
    return NextResponse.json({ error: 'خطا در دریافت دفتر روزنامه رسمی' }, { status: 500 });
  }
}
