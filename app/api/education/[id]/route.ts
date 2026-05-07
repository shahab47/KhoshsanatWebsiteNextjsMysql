// مسیر فایل: src/app/api/education/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromMinio } from '@/lib/minio';

// 🟢 تابع کمکی برای استخراج لینک تصاویر از داخل کدهای HTML ادیتور
const extractImagesFromHtml = (html?: string | null): string[] => {
  if (!html) return [];
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const urls: string[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    
    // دریافت اطلاعات مقاله قدیمی برای مقایسه
    const oldArticle = await db.article.findUnique({ where: { id } });
    if (!oldArticle) return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 404 });

    // ۱. پاکسازی تصویر کاور قبلی در صورت آپلود تصویر کاور جدید
    if (oldArticle.imageUrl && body.imageUrl && oldArticle.imageUrl !== body.imageUrl) {
      await deleteFromMinio(oldArticle.imageUrl);
    }

    // ۲. سیستم هوشمند پاکسازی تصاویرِ ادیتور متن (Diffing)
    const oldContentImages = extractImagesFromHtml(oldArticle.content);
    const newContentImages = extractImagesFromHtml(body.content);
    
    const removedContentImages = oldContentImages.filter(url => !newContentImages.includes(url));
    
    for (const url of removedContentImages) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // ۳. تبدیل زمان مطالعه به عدد (تطبیق با Schema)
    let parsedReadTime = oldArticle.readTime;
    if (body.readTime !== undefined) {
      parsedReadTime = body.readTime ? parseInt(body.readTime.toString()) : null;
    }
    
    // ۴. آپدیت نهایی در دیتابیس
    const article = await db.article.update({
      where: { id },
      data: { 
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        author: body.author,
        imageUrl: body.imageUrl,
        isActive: body.isActive,
        readTime: parsedReadTime
      }
    });
    return NextResponse.json(article);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ویرایش: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    const article = await db.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: 'مقاله‌ای یافت نشد' }, { status: 404 });

    // ۱. پاک کردن تصویر کاور اصلی مقاله از MinIO
    if (article.imageUrl) {
      await deleteFromMinio(article.imageUrl);
    }

    // ۲. استخراج و پاک کردن تمام تصاویر آپلود شده در داخل متن ادیتور از MinIO
    const inlineImages = extractImagesFromHtml(article.content);
    for (const url of inlineImages) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // ۳. در نهایت، پاک کردن کامل مقاله از دیتابیس
    await db.article.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطا در عملیات حذف' }, { status: 500 });
  }
}