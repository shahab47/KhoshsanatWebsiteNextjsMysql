import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { 
  extractUrlsFromJson, 
  extractImagesFromHtml, 
  cleanupRemovedFiles, 
  deleteFilesFromMinio 
} from '@/lib/minio';

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
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'خطا در ایجاد دسته‌بندی' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, icon, imageUrl, imageSize, order, isActive, gallery, catalogUrl } = body;
    const catId = parseInt(id);
    if (isNaN(catId)) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    // ۱. بررسی دسته‌بندی قدیمی و پاکسازی تفاضلی فایل‌های حذف/تعویض شده
    const oldCategory = await db.category.findUnique({ where: { id: catId } });
    if (oldCategory) {
      const oldFiles = [
        oldCategory.imageUrl,
        oldCategory.catalogUrl,
        ...extractUrlsFromJson(oldCategory.gallery)
      ];
      const newFiles = [
        imageUrl,
        catalogUrl,
        ...extractUrlsFromJson(gallery)
      ];
      await cleanupRemovedFiles(oldFiles, newFiles);
    }

    const category = await db.category.update({
      where: { id: catId },
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
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'خطا در ویرایش دسته‌بندی' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const catId = parseInt(id || '');
    if (isNaN(catId)) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    
    const category = await db.category.findUnique({
      where: { id: catId },
      include: {
        subcategories: {
          include: {
            products: true
          }
        }
      }
    });
    
    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
    }

    // جمع‌آوری تمام فایل‌های دسته‌بندی و تمام محصولات وابسته به زیرمجموعه‌های آن
    const allFilesToDelete: string[] = [];

    if (category.imageUrl) allFilesToDelete.push(category.imageUrl);
    if (category.catalogUrl) allFilesToDelete.push(category.catalogUrl);
    allFilesToDelete.push(...extractUrlsFromJson(category.gallery));

    if (category.subcategories && Array.isArray(category.subcategories)) {
      for (const sub of category.subcategories) {
        if (sub.products && Array.isArray(sub.products)) {
          for (const product of sub.products) {
            if (product.imageUrl) allFilesToDelete.push(product.imageUrl);
            if (product.catalogUrl) allFilesToDelete.push(product.catalogUrl);
            allFilesToDelete.push(...extractUrlsFromJson(product.gallery));
            allFilesToDelete.push(...extractImagesFromHtml(product.description));
          }
        }
      }
    }

    // حذف فیزیکی تمام فایل‌ها از باکت MinIO
    await deleteFilesFromMinio(allFilesToDelete);
    
    // حذف رکورد از دیتابیس
    await db.category.delete({ where: { id: catId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'خطا در حذف دسته‌بندی' }, { status: 500 });
  }
}