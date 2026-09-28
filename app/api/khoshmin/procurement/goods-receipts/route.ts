import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { GoodsReceiptService } from '@/lib/procurement/goods-receipt-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const purchaseOrderId = searchParams.get('purchaseOrderId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await GoodsReceiptService.getGoodsReceipts({
      search,
      supplierId,
      warehouseId,
      purchaseOrderId,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching goods receipts:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت قبض‌های رسید انبار' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await GoodsReceiptService.createGoodsReceipt(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating goods receipt:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت قبض رسید انبار' }, { status: 400 });
  }
}
