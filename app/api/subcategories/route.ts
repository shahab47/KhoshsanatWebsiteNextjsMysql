import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { 
  extractUrlsFromJson, 
  extractImagesFromHtml, 
  deleteFilesFromMinio 
} from '@/lib/minio';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId الزامی است' }, { status: 400 });
    }
    const subcategories = await db.subcategory.findMany({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(subcategories);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت زیرمجموعه‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const { title, description, categoryId, order, isActive } = body;
    if (!title || !categoryId) {
      return NextResponse.json({ error: 'عنوان و categoryId الزامی است' }, { status: 400 });
    }
    const subcategory = await db.subcategory.create({
      data: {
        title,
        description: description || null,
        categoryId: parseInt(categoryId),
        order: order || 0,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json({ error: 'خطا در ایجاد زیرمجموعه' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const { id, title, description, order, isActive } = body;
    const subId = parseInt(id);
    if (isNaN(subId)) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    const subcategory = await db.subcategory.update({
      where: { id: subId },
      data: { title, description, order, isActive },
    });
    return NextResponse.json(subcategory);
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return NextResponse.json({ error: 'خطا در ویرایش زیرمجموعه' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const subId = parseInt(id || '');
    if (isNaN(subId)) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    const subcategory = await db.subcategory.findUnique({
      where: { id: subId },
      include: { products: true }
    });

    if (!subcategory) {
      return NextResponse.json({ error: 'زیرمجموعه یافت نشد' }, { status: 404 });
    }

    // پاکسازی فایل‌های تمام محصولات وابسته به این زیرمجموعه از MinIO
    const filesToDelete: string[] = [];
    if (subcategory.products && Array.isArray(subcategory.products)) {
      for (const product of subcategory.products) {
        if (product.imageUrl) filesToDelete.push(product.imageUrl);
        if (product.catalogUrl) filesToDelete.push(product.catalogUrl);
        filesToDelete.push(...extractUrlsFromJson(product.gallery));
        filesToDelete.push(...extractImagesFromHtml(product.description));
      }
    }

    await deleteFilesFromMinio(filesToDelete);

    await db.subcategory.delete({ where: { id: subId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json({ error: 'خطا در حذف زیرمجموعه' }, { status: 500 });
  }
}