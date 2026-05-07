// مسیر فایل: src/app/api/products/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromMinio } from '@/lib/minio';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // در Next.js 15 پارامترها باید حتماً await شوند
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    
    const product = await db.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 });
    
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت محصول' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // باز کردن پارامترها با await
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });

    const body = await request.json();
    const { title, slug, description, shortDesc, imageUrl, gallery, subcategoryId, order, isActive } = body;
    
    const product = await db.product.update({
      where: { id },
      data: { 
        title, 
        slug, 
        description, 
        shortDesc, 
        imageUrl, 
        gallery, 
        subcategoryId: parseInt(subcategoryId), // اطمینان از عدد بودن شناسه دسته‌بندی
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

// حذف محصول به همراه تمام عکس‌های آن از سرور MinIO
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // باز کردن پارامترها با await
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });

    // ۱. اول اطلاعات محصول را می‌گیریم تا آدرس عکس‌هایش را داشته باشیم
    const product = await db.product.findUnique({ where: { id } });
    
    if (!product) {
      return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 });
    }

    // ۲. تصویر اصلی را از روی MinIO پاک می‌کنیم
    if (product.imageUrl) {
      await deleteFromMinio(product.imageUrl);
    }

    // ۳. تمام تصاویر گالری را از روی MinIO پاک می‌کنیم
    if (product.gallery) {
      let galleryArray: string[] = [];
      if (typeof product.gallery === 'string') {
        try { galleryArray = JSON.parse(product.gallery); } catch(e){}
      } else if (Array.isArray(product.gallery)) {
        // با اضافه کردن as string[] به تایپ‌اسکریپت می‌گوییم که ما مطمئنیم این یک آرایه از رشته‌هاست
        galleryArray = product.gallery as string[];
      }

      for (const url of galleryArray) {
        await deleteFromMinio(url);
      }
    }

    // ۴. حذف نهایی از دیتابیس
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: 'خطا در حذف محصول و فایل‌ها' }, { status: 500 });
  }
}