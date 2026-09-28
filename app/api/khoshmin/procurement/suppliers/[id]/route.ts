import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { SupplierService } from '@/lib/procurement/supplier-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const supplier = await SupplierService.getSupplierById(id);
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت مشخصات تامین‌کننده' }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const updated = await SupplierService.updateSupplier(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: error.message || 'خطا در ویرایش تامین‌کننده' }, { status: 400 });
  }
}
