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

    const result = await JobCostingService.recordScrapGeneration({
      productionOrderId: id,
      scrapProductId: body.scrapProductId,
      scrapWarehouseCode: body.scrapWarehouseCode,
      scrapQuantity: body.scrapQuantity,
      scrapUnitRecoveryPrice: body.scrapUnitRecoveryPrice,
      referenceNo: body.referenceNo,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error recording scrap generation:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت ضایعات و قراضه' }, { status: 400 });
  }
}
