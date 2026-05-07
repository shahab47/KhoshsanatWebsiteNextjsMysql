// app/api/projects/categories/route.ts
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 🔴 مشکل اینجا بود که حرف اول بزرگ نوشته شده بود. به projectCategory تغییر یافت
    const categories = await db.projectCategory.findMany({ 
        orderBy: { title: 'asc' } 
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در دریافت دسته‌بندی‌ها: ${error.message}` }, { status: 500 });
  }
}