import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PayrollRunService } from '@/lib/payroll/payroll-run-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const result = await PayrollRunService.approvePayrollRun(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error approving payroll run:', error);
    return NextResponse.json({ error: error.message || 'خطا در تایید دوره حقوق و صدور سند حسابداری' }, { status: 400 });
  }
}
