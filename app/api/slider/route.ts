import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { SlideType } from '@prisma/client';
import { deleteFromMinio } from '@/lib/minio';
import { requireAuth } from '@/lib/auth-middleware';

// تابع کمکی برای دریافت حجم تصویر از URL (فقط در زمان آپلود یا ویرایش)
async function getImageSizeFromUrl(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength);
    }
    return null;
  } catch (error) {
    return null;
  }
}

// GET: دریافت اسلایدها با بالاترین سرعت بدون ریکوئست‌های شبکه اضافه
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

// POST: ایجاد اسلاید جدید با محاسبه خودکار حجم
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const { imageUrl, size, type } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'آدرس تصویر الزامی است' }, { status: 400 });
    }

    // محاسبه خودکار حجم اگر ارسال نشده باشد
    let finalSize = size;
    if (!finalSize) {
      finalSize = await getImageSizeFromUrl(imageUrl);
    }

    let validType: SlideType = SlideType.MAIN;
    if (type && Object.values(SlideType).includes(type as SlideType)) {
      validType = type as SlideType;
    }

    const newSlide = await db.slide.create({
      data: {
        imageUrl,
        size: finalSize,
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

    return NextResponse.json({ 
      success: true, 
      slide: newSlide,
      sizeInfo: finalSize ? {
        bytes: finalSize,
        kb: (finalSize / 1024).toFixed(1),
        mb: (finalSize / 1024 / 1024).toFixed(2)
      } : null
    });
  } catch (error) {
    console.error('خطا در POST اسلاید:', error);
    return NextResponse.json({ error: 'خطا در ذخیره اسلاید' }, { status: 500 });
  }
}

// PUT: ویرایش اسلاید
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

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
      imageUrl,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه اسلاید الزامی است' },
        { status: 400 }
      );
    }

    const slideId = Number(id);
    const existingSlide = await db.slide.findUnique({ where: { id: slideId } });

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
    
    // اگر imageUrl تغییر کرد، فایل قبلی را از MinIO حذف و حجم رو دوباره محاسبه کن
    if (imageUrl !== undefined) {
      if (existingSlide?.imageUrl && existingSlide.imageUrl !== imageUrl) {
        await deleteFromMinio(existingSlide.imageUrl);
      }
      updateData.imageUrl = imageUrl;
      const newSize = await getImageSizeFromUrl(imageUrl);
      if (newSize) {
        updateData.size = newSize;
      }
    }

    const updatedSlide = await db.slide.update({
      where: { id: slideId },
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