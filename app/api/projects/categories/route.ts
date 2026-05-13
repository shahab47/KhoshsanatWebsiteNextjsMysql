import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: دریافت تمام دسته‌بندی‌ها
export async function GET() {
  try {
    const categories = await db.projectCategory.findMany({
      orderBy: { title: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در دریافت دسته‌بندی‌ها: ${error.message}` }, { status: 500 });
  }
}

// POST: ایجاد دسته‌بندی جدید
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'عنوان دسته‌بندی الزامی است' }, { status: 400 });
    }
    const exists = await db.projectCategory.findUnique({ where: { title } });
    if (exists) {
      return NextResponse.json({ error: 'این دسته‌بندی قبلاً وجود دارد' }, { status: 400 });
    }
    const category = await db.projectCategory.create({ data: { title } });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ایجاد دسته‌بندی: ${error.message}` }, { status: 500 });
  }
}

// PUT: ویرایش عنوان دسته‌بندی
export async function PUT(request: NextRequest) {
  try {
    const { oldTitle, newTitle } = await request.json();
    if (!oldTitle || !newTitle || newTitle.trim() === '') {
      return NextResponse.json({ error: 'عنوان قدیم و جدید الزامی است' }, { status: 400 });
    }
    const existing = await db.projectCategory.findUnique({ where: { title: oldTitle } });
    if (!existing) {
      return NextResponse.json({ error: 'دسته‌بندی مورد نظر یافت نشد' }, { status: 404 });
    }
    const duplicate = await db.projectCategory.findUnique({ where: { title: newTitle } });
    if (duplicate && duplicate.title !== oldTitle) {
      return NextResponse.json({ error: 'عنوان جدید تکراری است' }, { status: 400 });
    }
    const updated = await db.projectCategory.update({
      where: { title: oldTitle },
      data: { title: newTitle }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ویرایش دسته‌بندی: ${error.message}` }, { status: 500 });
  }
}

// DELETE: حذف دسته‌بندی
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    if (!title) {
      return NextResponse.json({ error: 'عنوان دسته‌بندی الزامی است' }, { status: 400 });
    }
    const category = await db.projectCategory.findUnique({ where: { title } });
    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
    }
    await db.projectCategory.delete({ where: { title } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در حذف دسته‌بندی: ${error.message}` }, { status: 500 });
  }
}