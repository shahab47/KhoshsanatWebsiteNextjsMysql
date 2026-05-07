import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { SlideType } from '@prisma/client'; // ایمپورت enum از Prisma

// GET: دریافت اسلایدها با قابلیت فیلتر بر اساس type (query parameter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as SlideType | null;

    const whereClause = type ? { type } : {};

    const slides = await db.slide.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(slides);
  } catch (error) {
    console.error('خطا در GET اسلایدها:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت اطلاعات از پایگاه داده' },
      { status: 500 }
    );
  }
}

// POST: ایجاد اسلاید جدید (دریافت imageUrl، size، type و سایر فیلدهای اختیاری)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, size, type } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'آدرس تصویر الزامی است' }, { status: 400 });
    }

    // اعتبارسنجی type (اگر ارسال شده باشد باید یکی از مقادیر enum باشد)
    let validType: SlideType = SlideType.MAIN;
    if (type && Object.values(SlideType).includes(type as SlideType)) {
      validType = type as SlideType;
    }

    const newSlide = await db.slide.create({
      data: {
        imageUrl,
        size: size || null,
        title: null,
        subtitle: null,
        titleColor: '#ffffff',
        titleFontSize: '3rem',
        subtitleColor: '#d1d5db',
        subtitleFontSize: '1.25rem',
        order: 0,
        isActive: true,
        type: validType,
      },
    });

    return NextResponse.json({ success: true, slide: newSlide });
  } catch (error) {
    console.error('خطا در POST اسلاید:', error);
    return NextResponse.json({ error: 'خطا در ذخیره اسلاید' }, { status: 500 });
  }
}

// PUT: ویرایش کامل یا جزئی یک اسلاید (امکان تغییر type نیز وجود دارد)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      subtitle,
      titleColor,
      titleFontSize,
      subtitleColor,
      subtitleFontSize,
      order,
      isActive,
      type,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه اسلاید الزامی است' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (titleColor !== undefined) updateData.titleColor = titleColor;
    if (titleFontSize !== undefined) updateData.titleFontSize = titleFontSize;
    if (subtitleColor !== undefined) updateData.subtitleColor = subtitleColor;
    if (subtitleFontSize !== undefined) updateData.subtitleFontSize = subtitleFontSize;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (type !== undefined && Object.values(SlideType).includes(type as SlideType)) {
      updateData.type = type as SlideType;
    }

    const updatedSlide = await db.slide.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(updatedSlide);
  } catch (error) {
    console.error('خطا در PUT اسلاید:', error);
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی اسلاید' },
      { status: 500 }
    );
  }
}