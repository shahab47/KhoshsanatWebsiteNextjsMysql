import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: { subcategories: true },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت دسته‌بندی‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, icon, order, isActive } = body;
    if (!title || !slug) {
      return NextResponse.json({ error: 'عنوان و slug الزامی است' }, { status: 400 });
    }
    const category = await db.category.create({
      data: { title, slug, icon: icon || null, order: order || 0, isActive: isActive ?? true },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ایجاد دسته‌بندی' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, slug, icon, order, isActive } = body;
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    const category = await db.category.update({
      where: { id: parseInt(id) },
      data: { title, slug, icon, order, isActive },
    });
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ویرایش دسته‌بندی' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    await db.category.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف دسته‌بندی' }, { status: 500 });
  }
}