import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SupplierInvoiceService } from '@/lib/procurement/supplier-invoice-service';
import { SupplierInvoiceStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const purchaseOrderId = searchParams.get('purchaseOrderId') || undefined;
    const status = (searchParams.get('status') as SupplierInvoiceStatus) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await SupplierInvoiceService.getSupplierInvoices({
      search,
      supplierId,
      purchaseOrderId,
      status,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching supplier invoices:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت فاکتورهای خرید' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await SupplierInvoiceService.createSupplierInvoice(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier invoice:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت فاکتور خرید' }, { status: 400 });
  }
}
