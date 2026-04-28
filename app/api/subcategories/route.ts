import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId الزامی است' }, { status: 400 });
    }
    const subcategories = await db.subcategory.findMany({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(subcategories);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت زیرمجموعه‌ها' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, categoryId, order, isActive } = body;
    if (!title || !categoryId) {
      return NextResponse.json({ error: 'عنوان و categoryId الزامی است' }, { status: 400 });
    }
    const subcategory = await db.subcategory.create({
      data: {
        title,
        description: description || null,
        categoryId: parseInt(categoryId),
        order: order || 0,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ایجاد زیرمجموعه' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, order, isActive } = body;
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    const subcategory = await db.subcategory.update({
      where: { id: parseInt(id) },
      data: { title, description, order, isActive },
    });
    return NextResponse.json(subcategory);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ویرایش زیرمجموعه' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    await db.subcategory.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف زیرمجموعه' }, { status: 500 });
  }
}