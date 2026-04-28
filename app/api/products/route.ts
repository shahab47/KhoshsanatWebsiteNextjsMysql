import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET – دریافت محصولات (با فیلتر subcategoryId اختیاری)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');
    const where: any = { isActive: true };
    if (subcategoryId) where.subcategoryId = parseInt(subcategoryId);

    const products = await db.product.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت محصولات' }, { status: 500 });
  }
}

// POST – ایجاد محصول جدید
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, description, shortDesc, imageUrl, gallery, subcategoryId, order, isActive } = body;
    if (!title || !slug || !description || !imageUrl || !subcategoryId) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند' }, { status: 400 });
    }
    const product = await db.product.create({
      data: {
        title,
        slug,
        description,
        shortDesc: shortDesc || null,
        imageUrl,
        gallery: gallery || null,
        subcategoryId: parseInt(subcategoryId),
        order: order || 0,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ایجاد محصول' }, { status: 500 });
  }
}