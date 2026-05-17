import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: { subcategories: true },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت دسته‌بندی‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, icon, imageUrl, imageSize, order, isActive, gallery, catalogUrl } = body;
    if (!title || !slug) {
      return NextResponse.json({ error: 'عنوان و slug الزامی است' }, { status: 400 });
    }
    const category = await db.category.create({
      data: {
        title,
        slug,
        icon: icon || null,
        imageUrl: imageUrl || null,
        imageSize: imageSize ? parseInt(imageSize) : null,
        order: order || 0,
        isActive: isActive ?? true,
        catalogUrl: catalogUrl || null,
        gallery: gallery || [],
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در ایجاد دسته‌بندی' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, icon, imageUrl, imageSize, order, isActive, gallery, catalogUrl } = body;
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    const category = await db.category.update({
      where: { id: parseInt(id) },
      data: {
        title,
        slug,
        icon: icon || null,
        imageUrl: imageUrl || null,
        imageSize: imageSize ? parseInt(imageSize) : null,
        order,
        isActive,
        catalogUrl: catalogUrl || null,
        gallery: gallery || [],
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در ویرایش دسته‌بندی' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    const category = await db.category.findUnique({
      where: { id: parseInt(id) },
    });
    
    const deleteFile = async (url?: string | null) => {
      if (url) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload?url=${encodeURIComponent(url)}`, {
            method: 'DELETE',
          });
        } catch (err) {}
      }
    };
    
    await deleteFile(category?.imageUrl);
    await deleteFile(category?.catalogUrl);
    if (category?.gallery && Array.isArray(category.gallery)) {
      for (const url of category.gallery) {
        if (typeof url === 'string') {        // ← اضافه کردن این خط
      await deleteFile(url);
    }
      }
    }
    
    await db.category.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در حذف دسته‌بندی' }, { status: 500 });
  }
}