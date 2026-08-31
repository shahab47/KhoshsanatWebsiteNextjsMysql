// مسیر فایل: src/app/api/education/route.ts
import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const articles = await db.article.findMany({ orderBy: { id: 'desc' } });
    
    const articlesWithMedia = articles.map((article: any) => ({
      ...article,
      media: article.media || []
    }));

    return NextResponse.json(articlesWithMedia);
  } catch (error: any) {
    console.error("Error in GET /api/education:", error.message);
    return NextResponse.json({ error: `خطا در دریافت مقالات: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, excerpt, content, category, author, readTime, imageUrl, media, isActive } = body;
    
    if (!title || !slug || !content || !imageUrl) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند. لطفاً عنوان، نامک، متن اصلی و تصویر کاور را ارسال کنید.' }, { status: 400 });
    }
    
    let parsedReadTime: number | null = null;
    if (readTime !== undefined && readTime !== null && readTime !== '') {
      parsedReadTime = parseInt(readTime.toString());
    }

    if (category && category.trim() !== '') {
      try {
        await db.articleCategory.upsert({
          where: { title: category.trim() },
          update: {},
          create: { title: category.trim() }
        });
      } catch (catError: any) {
        console.error("Error upserting article category:", catError.message);
      }
    }

    const finalMedia = Array.isArray(media) ? media : [];

    const article = await db.article.create({
      data: { 
        title: title.trim(), 
        slug: slug.trim().toLowerCase(), 
        excerpt: excerpt ? excerpt.trim() : null, 
        content, 
        category: category ? category.trim() : null, 
        author: author ? author.trim() : null, 
        readTime: parsedReadTime, 
        imageUrl: imageUrl, 
        media: finalMedia,
        isActive: isActive ?? true 
      }
    });
    
    return NextResponse.json({ ...article, media: article.media || [] }, { status: 201 });

  } catch (error: any) {
    console.error("Error in POST /api/education:", error.message);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'این نامک (Slug) قبلاً ثبت شده است.' }, { status: 400 });
    }
    return NextResponse.json({ 
      error: "خطای داخلی در پایگاه داده در زمان ثبت مقاله.",
      details: error.message 
    }, { status: 500 });
  }
}