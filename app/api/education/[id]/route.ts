// مسیر فایل: src/app/api/education/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { 
  extractUrlsFromJson, 
  extractImagesFromHtml, 
  cleanupRemovedFiles, 
  deleteFilesFromMinio 
} from '@/lib/minio';

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

import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });

    const body = await request.json();

    const oldArticle = await db.article.findUnique({ where: { id } });
    if (!oldArticle) return NextResponse.json({ error: 'مقاله یافت نشد' }, { status: 404 });

    // ۱. پاکسازی تفاضلی تمام فایل‌های کاور، ادیتور متن و گالری با ماژول متمرکز
    const oldFiles = [
      oldArticle.imageUrl,
      ...extractUrlsFromJson(oldArticle.media),
      ...extractImagesFromHtml(oldArticle.content)
    ];
    const newFiles = [
      body.imageUrl,
      ...extractUrlsFromJson(body.media),
      ...extractImagesFromHtml(body.content)
    ];
    await cleanupRemovedFiles(oldFiles, newFiles);

    // ۲. تبدیل readTime به عدد
    let parsedReadTime = oldArticle.readTime;
    if (body.readTime !== undefined) {
      parsedReadTime = body.readTime ? parseInt(body.readTime.toString()) : null;
    }

    // ۳. به‌روزرسانی مقاله در دیتابیس
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
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });

    const article = await db.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: 'مقاله‌ای یافت نشد' }, { status: 404 });

    // جمع‌آوری و حذف تمام فایل‌های مقاله (کاور، تصاویر داخل متن، فایل‌های گالری)
    const allFilesToDelete = [
      article.imageUrl,
      ...extractUrlsFromJson(article.media),
      ...extractImagesFromHtml(article.content)
    ];

    await deleteFilesFromMinio(allFilesToDelete);

    // حذف رکورد مقاله از دیتابیس
    await db.article.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطا در عملیات حذف' }, { status: 500 });
  }
}