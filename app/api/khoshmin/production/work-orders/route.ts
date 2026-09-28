import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { WorkOrderService } from '@/lib/production/work-order-service';
import { OrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : undefined;
    const status = (searchParams.get('status') as OrderStatus) || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await WorkOrderService.getWorkOrders({
      customerId,
      status,
      priority,
      search,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت دستور کارهای تولید' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await WorkOrderService.createWorkOrder(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: error.message || 'خطا در صدور دستور کار ساخت' }, { status: 400 });
  }
}
