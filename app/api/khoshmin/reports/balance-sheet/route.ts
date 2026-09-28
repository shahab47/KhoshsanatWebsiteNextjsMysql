import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { FinancialReportService } from '@/lib/accounting/financial-report-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') ? new Date(searchParams.get('asOfDate')!) : undefined;
    const companyId = searchParams.get('companyId') || undefined;

    const result = await FinancialReportService.getBalanceSheet(asOfDate, companyId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching balance sheet:', error);
    return NextResponse.json({ error: error.message || 'خطا در استخراج ترازنامه' }, { status: 500 });
  }
}
