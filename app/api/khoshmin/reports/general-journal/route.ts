import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { FinancialReportService } from '@/lib/accounting/financial-report-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const companyId = searchParams.get('companyId') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 100;

    const result = await FinancialReportService.getGeneralJournal({
      startDate,
      endDate,
      companyId,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching general journal:', error);
    return NextResponse.json({ error: error.message || 'خطا در استخراج دفتر روزنامه' }, { status: 500 });
  }
}
