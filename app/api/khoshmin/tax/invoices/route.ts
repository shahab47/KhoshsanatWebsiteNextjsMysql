import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { ModyanService } from '@/lib/tax/modyan-service';
import { TaxSendStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as TaxSendStatus) || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 50;

    const result = await ModyanService.getTaxInvoices({
      status,
      search,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching tax invoices:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت وضعیت مالیاتی صورتحساب‌ها' }, { status: 500 });
  }
}
