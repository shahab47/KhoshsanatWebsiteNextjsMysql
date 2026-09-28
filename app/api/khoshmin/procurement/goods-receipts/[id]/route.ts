import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { GoodsReceiptService } from '@/lib/procurement/goods-receipt-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const receipt = await GoodsReceiptService.getGoodsReceiptById(id);
    return NextResponse.json(receipt);
  } catch (error: any) {
    console.error('Error fetching goods receipt:', error);
    return NextResponse.json({ error: error.message || 'قبض رسید انبار یافت نشد.' }, { status: 404 });
  }
}
