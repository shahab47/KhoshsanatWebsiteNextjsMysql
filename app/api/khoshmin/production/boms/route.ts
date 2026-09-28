import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { BOMService } from '@/lib/production/bom-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') ? parseInt(searchParams.get('productId')!) : undefined;
    const search = searchParams.get('search') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;

    const result = await BOMService.getBOMs({
      productId,
      search,
      isActive,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching BOMs:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست فرمول‌های ساخت' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const created = await BOMService.createBOM(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating BOM:', error);
    return NextResponse.json({ error: error.message || 'خطا در تعریف فرمول ساخت' }, { status: 400 });
  }
}
