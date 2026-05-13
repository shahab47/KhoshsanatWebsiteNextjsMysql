// مسیر فایل: src/app/api/education/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromMinio } from '@/lib/minio';

// تابع کمکی برای استخراج لینک تصاویر از داخل کدهای HTML ادیتور
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

// تابع کمکی برای استخراج URL فایل‌های گالری از آرایه media
const extractMediaUrls = (media?: any[] | null): string[] => {
  if (!media || !Array.isArray(media)) return [];
  return media.map(item => item.imageUrl).filter(Boolean);
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();

    const oldArticle = await db.article.findUnique({ where: { id } });
    if (!oldArticle) return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 404 });

    // 1. حذف تصویر کاور قدیمی در صورت تغییر
    if (oldArticle.imageUrl && body.imageUrl && oldArticle.imageUrl !== body.imageUrl) {
      await deleteFromMinio(oldArticle.imageUrl);
    }

    // 2. حذف تصاویر حذف‌شده از داخل ادیتور متن (Diffing)
    const oldContentImages = extractImagesFromHtml(oldArticle.content);
    const newContentImages = extractImagesFromHtml(body.content);
    const removedContentImages = oldContentImages.filter(url => !newContentImages.includes(url));
    for (const url of removedContentImages) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // 3. حذف فایل‌های گالری که در آرایه newMedia وجود ندارند (Diffing برای media)
    const oldMediaUrls = extractMediaUrls(oldArticle.media as any[]);
    const newMediaUrls = extractMediaUrls(body.media);
    const removedMediaUrls = oldMediaUrls.filter(url => !newMediaUrls.includes(url));
    for (const url of removedMediaUrls) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // 4. تبدیل readTime به عدد (در صورت وجود)
    let parsedReadTime = oldArticle.readTime;
    if (body.readTime !== undefined) {
      parsedReadTime = body.readTime ? parseInt(body.readTime.toString()) : null;
    }

    // 5. به‌روزرسانی مقاله در دیتابیس (همراه با فیلد media)
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
        readTime: parsedReadTime,
        media: body.media || []   // ذخیره آرایه گالری
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

    // 1. حذف تصویر کاور
    if (article.imageUrl) {
      await deleteFromMinio(article.imageUrl);
    }

    // 2. حذف تصاویر درون ادیتور
    const inlineImages = extractImagesFromHtml(article.content);
    for (const url of inlineImages) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // 3. حذف فایل‌های گالری (media)
    const mediaUrls = extractMediaUrls(article.media as any[]);
    for (const url of mediaUrls) {
      if (url.includes('khoshsanat-media') || url.includes('45.149.78.107')) {
        await deleteFromMinio(url);
      }
    }

    // 4. حذف رکورد مقاله از دیتابیس
    await db.article.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطا در عملیات حذف' }, { status: 500 });
  }
}