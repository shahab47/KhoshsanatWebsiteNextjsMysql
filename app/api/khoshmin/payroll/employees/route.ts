import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { EmployeeService } from '@/lib/payroll/employee-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const department = searchParams.get('department') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 100;

    const result = await EmployeeService.getEmployees({
      search,
      department,
      isActive,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست پرسنل' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await EmployeeService.createEmployee(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت پرسنل جدید' }, { status: 400 });
  }
}
