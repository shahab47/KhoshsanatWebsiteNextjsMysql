import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { PurchaseOrderService } from '@/lib/procurement/purchase-order-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const po = await PurchaseOrderService.getPurchaseOrderById(id);
    return NextResponse.json(po);
  } catch (error: any) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json({ error: error.message || 'سفارش خرید یافت نشد.' }, { status: 404 });
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
    const { action, reason } = await request.json();

    if (action === 'APPROVE') {
      const approved = await PurchaseOrderService.approvePurchaseOrder(id);
      return NextResponse.json(approved);
    } else if (action === 'CANCEL') {
      const cancelled = await PurchaseOrderService.cancelPurchaseOrder(id, reason);
      return NextResponse.json(cancelled);
    } else {
      return NextResponse.json({ error: 'عملیات نامعتبر است.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error modifying purchase order:', error);
    return NextResponse.json({ error: error.message || 'خطا در تغییر وضعیت سفارش خرید' }, { status: 400 });
  }
}
