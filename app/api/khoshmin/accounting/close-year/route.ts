import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { YearEndClosingService } from '@/lib/accounting/year-end-closing-service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    if (!body.fiscalYearId) {
      return NextResponse.json({ error: 'شناسه سال مالی (fiscalYearId) الزامی است.' }, { status: 400 });
    }

    const result = await YearEndClosingService.closeFiscalYear(body.fiscalYearId, body.companyId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error closing fiscal year:', error);
    return NextResponse.json({ error: error.message || 'خطا در بستن سال مالی' }, { status: 400 });
  }
}
