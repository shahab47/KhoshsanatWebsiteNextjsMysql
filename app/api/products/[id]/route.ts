// مسیر فایل: src/app/api/products/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { 
  extractUrlsFromJson, 
  extractImagesFromHtml, 
  cleanupRemovedFiles, 
  deleteFilesFromMinio 
} from '@/lib/minio';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<any> }
) {
  try {
    const resolvedParams = await params;
    // استخراج هوشمند پارامتر (چه نام پوشه [id] باشد چه [slug])
    const identifier = resolvedParams.id || resolvedParams.slug || Object.values(resolvedParams)[0] as string;
    
    if (!identifier) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    
    // ۱. ابتدا سعی می‌کنیم محصول را از روی اسلاگ (متن) پیدا کنیم
    let product = await db.product.findUnique({ where: { slug: identifier } });
    
    // ۲. اگر با اسلاگ پیدا نشد، آن را به عنوان آیدی (عدد) جستجو می‌کنیم
    if (!product) {
      const numericId = parseInt(identifier);
      if (!isNaN(numericId)) {
        product = await db.product.findUnique({ where: { id: numericId } });
      }
    }
    
    if (!product) return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: 'خطا در دریافت محصول' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<any> }
) {
  try {
    const resolvedParams = await params;
    const identifier = resolvedParams.id || resolvedParams.slug || Object.values(resolvedParams)[0] as string;
    const id = parseInt(identifier);
    
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });

    const body = await request.json();
    const { title, slug, description, shortDesc, imageUrl, catalogUrl, gallery, subcategoryId, order, isActive } = body;
    
    // ۱. بررسی محصول قبلی و پاکسازی تفاضلی فایل‌های حذف/تعویض شده (کاور، کاتالوگ، گالری و تصاویر ادیتور)
    const oldProduct = await db.product.findUnique({ where: { id } });
    if (oldProduct) {
      const oldFiles = [
        oldProduct.imageUrl,
        oldProduct.catalogUrl,
        ...extractUrlsFromJson(oldProduct.gallery),
        ...extractImagesFromHtml(oldProduct.description)
      ];
      const newFiles = [
        imageUrl,
        catalogUrl,
        ...extractUrlsFromJson(gallery),
        ...extractImagesFromHtml(description)
      ];
      await cleanupRemovedFiles(oldFiles, newFiles);
    }

    const product = await db.product.update({
      where: { id },
      data: { 
        title, 
        slug, 
        description, 
        shortDesc, 
        imageUrl, 
        catalogUrl: catalogUrl !== undefined ? (catalogUrl || null) : undefined,
        gallery, 
        subcategoryId: subcategoryId ? parseInt(subcategoryId) : undefined,
        order, 
        isActive 
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: 'خطا در ویرایش محصول' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<any> }
) {
  try {
    const resolvedParams = await params;
    const identifier = resolvedParams.id || resolvedParams.slug || Object.values(resolvedParams)[0] as string;
    const id = parseInt(identifier);
    
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });

    const product = await db.product.findUnique({ where: { id } });
    
    if (!product) {
      return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 });
    }

    // جمع‌آوری تمام فایل‌های محصول شامل کاور، کاتالوگ، گالری و عکس‌های داخل متن توضیحات
    const allFilesToDelete = [
      product.imageUrl,
      product.catalogUrl,
      ...extractUrlsFromJson(product.gallery),
      ...extractImagesFromHtml(product.description)
    ];

    await deleteFilesFromMinio(allFilesToDelete);

    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: 'خطا در حذف محصول و فایل‌ها' }, { status: 500 });
  }
}