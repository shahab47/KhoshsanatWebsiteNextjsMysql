import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SupplierPaymentService } from '@/lib/procurement/supplier-payment-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const supplierInvoiceId = searchParams.get('supplierInvoiceId') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await SupplierPaymentService.getSupplierPayments({
      search,
      supplierId,
      supplierInvoiceId,
      paymentMethod,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching supplier payments:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست پرداخت‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await SupplierPaymentService.createSupplierPayment(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier payment:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت سند پرداخت' }, { status: 400 });
  }
}
