import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PurchaseOrderService } from '@/lib/procurement/purchase-order-service';
import { PurchaseOrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const status = (searchParams.get('status') as PurchaseOrderStatus) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await PurchaseOrderService.getPurchaseOrders({
      search,
      supplierId,
      status,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت سفارشات خرید' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await PurchaseOrderService.createPurchaseOrder(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت سفارش خرید' }, { status: 400 });
  }
}
