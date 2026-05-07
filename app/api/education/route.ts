import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const articles = await db.article.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json(articles);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در دریافت: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, excerpt, content, category, author, readTime, imageUrl, isActive } = body;
    
    if (!title || !slug || !content || !imageUrl) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند' }, { status: 400 });
    }
    
    const parsedReadTime = readTime ? parseInt(readTime.toString()) : null;

    // 🟢 منطق جدید: اگر دسته‌بندی وارد شده بود، آن را در جدول مستقل دسته‌ها هم بررسی و ثبت کن
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
        isActive: isActive ?? true 
      }
    });
    
    return NextResponse.json(article, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ثبت پایگاه داده: ${error.message}` }, { status: 500 });
  }
}