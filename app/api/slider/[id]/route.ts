import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { deleteFromMinio } from '@/lib/minio';
import { requireAuth } from '@/lib/auth-middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const slideId = parseInt(id);

    if (isNaN(slideId)) {
      return NextResponse.json(
        { error: 'شناسه نامعتبر است' },
        { status: 400 }
      );
    }

    const slide = await db.slide.findUnique({
      where: { id: slideId },
    });

    if (slide?.imageUrl) {
      try { await deleteFromMinio(slide.imageUrl); } catch (e) {}
    }

    await db.slide.delete({
      where: { id: slideId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطا در DELETE اسلاید:', error);
    return NextResponse.json(
      { error: 'خطا در حذف اسلاید از دیتابیس' },
      { status: 500 }
    );
  }
}