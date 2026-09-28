import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { WorkOrderService } from '@/lib/production/work-order-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const order = await WorkOrderService.getWorkOrderById(id);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error fetching work order:', error);
    return NextResponse.json({ error: error.message || 'دستور کار یافت نشد.' }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const { action } = await request.json();

    if (action === 'START') {
      const started = await WorkOrderService.startWorkOrder(id);
      return NextResponse.json(started);
    } else {
      return NextResponse.json({ error: 'عملیات نامعتبر است.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: error.message || 'خطا در به‌روزرسانی دستور کار' }, { status: 400 });
  }
}
