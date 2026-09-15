// مسیر فایل: src/app/api/projects/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const projects = await db.project.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت پروژه‌ها' }, { status: 500 });
  }
}

import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  try {
    const body = await request.json();
    const { title, slug, category, location, content, imageUrl, gallery, size, isActive } = body;
    
    if (!title || !slug || !imageUrl) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند' }, { status: 400 });
    }
    
    const project = await db.project.create({
      data: { title, slug, category, location, content, imageUrl, gallery: gallery || null, size: size || 'normal', isActive: isActive ?? true }
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'نامک تکراری است یا خطایی رخ داد' }, { status: 500 });
  }
}