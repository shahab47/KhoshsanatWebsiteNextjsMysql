import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const articles = await db.article.findMany({ orderBy: { id: 'desc' } });
    // اطمینان از اینکه media همیشه آرایه است
    const articlesWithMedia = articles.map(article => ({
      ...article,
      media: article.media || []
    }));
    return NextResponse.json(articlesWithMedia);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در دریافت: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, excerpt, content, category, author, readTime, imageUrl, media, isActive } = body;
    
    if (!title || !slug || !content || !imageUrl) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند' }, { status: 400 });
    }
    
    const parsedReadTime = readTime ? parseInt(readTime.toString()) : null;

    // ایجاد یا به‌روزرسانی دسته‌بندی در جدول ArticleCategory
    if (category) {
      await db.articleCategory.upsert({
        where: { title: category },
        update: {},
        create: { title: category }
      });
    }

    const article = await db.article.create({
      data: { 
        title, 
        slug, 
        excerpt: excerpt || null, 
        content, 
        category: category || null, 
        author: author || null, 
        readTime: parsedReadTime, 
        imageUrl, 
        media: media || [],   // ذخیره گالری (آرایه‌ای از اشیاء)
        isActive: isActive ?? true 
      }
    });
    
    // برگرداندن مقاله با media به صورت آرایه
    return NextResponse.json({ ...article, media: article.media || [] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ثبت پایگاه داده: ${error.message}` }, { status: 500 });
  }
}