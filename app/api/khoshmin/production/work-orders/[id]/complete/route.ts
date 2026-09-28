import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { JobCostingService } from '@/lib/costing/job-costing-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const result = await JobCostingService.completeJobOrder({
      productionOrderId: id,
      finishedGoodsWarehouseCode: body.finishedGoodsWarehouseCode,
      completedQuantity: body.completedQuantity,
      directLaborCost: body.directLaborCost,
      allocatedOverheadCost: body.allocatedOverheadCost,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error completing work order:', error);
    return NextResponse.json({ error: error.message || 'خطا در تکمیل سفارش کار و ثبت رسید محصول' }, { status: 400 });
  }
}
