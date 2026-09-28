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
    const body = await request.json().catch(() => ({}));
    const result = await PayrollRunService.disbursePayrollRun({
      runId: id,
      bankAccountId: body.bankAccountId,
      paymentDate: body.paymentDate,
      description: body.description,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error disbursing payroll run:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت پرداخت بانکی و تسویه حقوق' }, { status: 400 });
  }
}
