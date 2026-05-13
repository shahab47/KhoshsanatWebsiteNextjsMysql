import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { SlideType } from '@prisma/client';

// تابع کمکی برای دریافت حجم تصویر از URL
async function getImageSizeFromUrl(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength);
    }
    
    // اگر HEAD جواب نداد، GET می‌کنیم (فقط برای تصاویر کوچک)
    const fullResponse = await fetch(url, { method: 'GET' });
    const buffer = await fullResponse.arrayBuffer();
    return buffer.byteLength;
  } catch (error) {
    console.error('Error getting image size:', error);
    return null;
  }
}

// GET: دریافت اسلایدها
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as SlideType | null;

    const whereClause = type ? { type } : {};

    const slides = await db.slide.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });
    
    // اضافه کردن حجم به صورت مجازی (اختیاری)
    const slidesWithSize = await Promise.all(slides.map(async (slide) => {
      if (slide.size) {
        return slide;
      }
      // اگر size در دیتابیس نیست، از URL محاسبه کن
      const size = await getImageSizeFromUrl(slide.imageUrl);
      return { ...slide, calculatedSize: size };
    }));
    
    return NextResponse.json(slidesWithSize);
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
    const body = await request.json();
    const { imageUrl, size, type } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'آدرس تصویر الزامی است' }, { status: 400 });
    }

    // محاسبه خودکار حجم اگر ارسال نشده باشد
    let finalSize = size;
    if (!finalSize) {
      finalSize = await getImageSizeFromUrl(imageUrl);
      console.log(`Auto-calculated size for ${imageUrl}: ${finalSize ? (finalSize / 1024).toFixed(1) + 'KB' : 'unknown'}`);
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
      imageUrl, // اضافه شد
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
    
    // اگر imageUrl تغییر کرد، حجم رو دوباره محاسبه کن
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
      const newSize = await getImageSizeFromUrl(imageUrl);
      if (newSize) {
        updateData.size = newSize;
        console.log(`Updated size for slide ${id}: ${(newSize / 1024).toFixed(1)}KB`);
      }
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