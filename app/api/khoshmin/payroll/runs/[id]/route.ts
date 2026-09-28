import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PayrollRunService } from '@/lib/payroll/payroll-run-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const run = await PayrollRunService.getPayrollRunById(id);
    if (!run) {
      return NextResponse.json({ error: 'دوره حقوق یافت نشد' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error: any) {
    console.error('Error fetching payroll run:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت مشخصات دوره حقوق' }, { status: 500 });
  }
}
