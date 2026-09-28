import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PayrollRunService } from '@/lib/payroll/payroll-run-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const runs = await PayrollRunService.getPayrollRuns();
    return NextResponse.json(runs);
  } catch (error: any) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست دوره‌های حقوق' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const result = await PayrollRunService.createPayrollRun(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payroll run:', error);
    return NextResponse.json({ error: error.message || 'خطا در محاسبه و ایجاد دوره حقوق' }, { status: 400 });
  }
}
