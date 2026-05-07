import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await db.articleCategory.findMany({ 
        orderBy: { title: 'asc' } 
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در دریافت دسته‌بندی‌ها: ${error.message}` }, { status: 500 });
  }
}