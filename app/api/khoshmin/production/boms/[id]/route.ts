import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { BOMService } from '@/lib/production/bom-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const [bom, standardCost] = await Promise.all([
      BOMService.getBOMById(id),
      BOMService.calculateStandardCost(id).catch(() => null),
    ]);

    return NextResponse.json({ bom, standardCost });
  } catch (error: any) {
    console.error('Error fetching BOM:', error);
    return NextResponse.json({ error: error.message || 'فرمول ساخت یافت نشد.' }, { status: 404 });
  }
}
