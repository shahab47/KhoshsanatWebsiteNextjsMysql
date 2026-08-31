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
  return media.map(item => item.imageUrl || item.url || item).filter((u): u is string => typeof u === 'string');
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const identifier = decodeURIComponent(resolvedParams.id);
    const parsedId = parseInt(identifier);

    let article = null;
    if (!isNaN(parsedId)) {
      article = await db.article.findFirst({
        where: {
          OR: [
            { id: parsedId },
            { slug: identifier }
          ]
        }
      });
    } else {
      article = await db.article.findFirst({
        where: { slug: identifier }
      });
    }

    if (!article) {
      return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({
      ...article,
      media: article.media || []
    });
  } catch (error: any) {
    console.error('Error fetching single article:', error);
    return NextResponse.json({ error: 'خطا در دریافت مقاله' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });

    const body = await request.json();

    const oldArticle = await db.article.findUnique({ where: { id } });
    if (!oldArticle) return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 404 });

    // 1. حذف تصویر کاور قدیمی در صورت تغییر
    if (oldArticle.imageUrl && body.imageUrl && oldArticle.imageUrl !== body.imageUrl) {
      try { await deleteFromMinio(oldArticle.imageUrl); } catch (e) {}
    }

    // 2. حذف تصاویر حذف‌شده از داخل ادیتور متن
    const oldContentImages = extractImagesFromHtml(oldArticle.content);
    const newContentImages = extractImagesFromHtml(body.content);
    const removedContentImages = oldContentImages.filter(url => !newContentImages.includes(url));
    for (const url of removedContentImages) {
      try { await deleteFromMinio(url); } catch (e) {}
    }

    // 3. حذف فایل‌های گالری که در آرایه newMedia وجود ندارند
    const oldMediaUrls = extractMediaUrls(oldArticle.media as any[]);
    const newMediaUrls = extractMediaUrls(body.media);
    const removedMediaUrls = oldMediaUrls.filter(url => !newMediaUrls.includes(url));
    for (const url of removedMediaUrls) {
      try { await deleteFromMinio(url); } catch (e) {}
    }

    // 4. تبدیل readTime به عدد
    let parsedReadTime = oldArticle.readTime;
    if (body.readTime !== undefined) {
      parsedReadTime = body.readTime ? parseInt(body.readTime.toString()) : null;
    }

    // 5. به‌روزرسانی مقاله در دیتابیس
    const article = await db.article.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug ? body.slug.trim().toLowerCase() : oldArticle.slug,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        author: body.author,
        imageUrl: body.imageUrl,
        isActive: body.isActive,
        readTime: parsedReadTime,
        media: body.media || []
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
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });

    const article = await db.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: 'مقاله‌ای یافت نشد' }, { status: 404 });

    // 1. حذف تصویر کاور
    if (article.imageUrl) {
      try { await deleteFromMinio(article.imageUrl); } catch (e) {}
    }

    // 2. حذف تصاویر درون ادیتور
    const inlineImages = extractImagesFromHtml(article.content);
    for (const url of inlineImages) {
      try { await deleteFromMinio(url); } catch (e) {}
    }

    // 3. حذف فایل‌های گالری (media)
    const mediaUrls = extractMediaUrls(article.media as any[]);
    for (const url of mediaUrls) {
      try { await deleteFromMinio(url); } catch (e) {}
    }

    // 4. حذف رکورد مقاله از دیتابیس
    await db.article.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطا در عملیات حذف' }, { status: 500 });
  }
}