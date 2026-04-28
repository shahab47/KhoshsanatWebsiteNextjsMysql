import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  // جدیدترین عکس‌ها را اول می‌آورد
  const slides = await db.slide.findMany({ orderBy: { id: 'desc' } });
  return NextResponse.json(slides);
}