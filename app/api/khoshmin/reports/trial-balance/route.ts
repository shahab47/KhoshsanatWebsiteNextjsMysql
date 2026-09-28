import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { FinancialReportService } from '@/lib/accounting/financial-report-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : 3;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const companyId = searchParams.get('companyId') || undefined;

    const result = await FinancialReportService.getTrialBalance(level, {
      startDate,
      endDate,
      companyId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching trial balance:', error);
    return NextResponse.json({ error: error.message || 'خطا در استخراج تراز آزمایشی' }, { status: 500 });
  }
}
