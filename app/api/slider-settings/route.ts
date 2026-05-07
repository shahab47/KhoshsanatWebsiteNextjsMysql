import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: دریافت تنظیمات اسلایدر (اگر وجود نداشت، یک رکورد پیش‌فرض ایجاد می‌کند)
export async function GET() {
  try {
    let settings = await db.sliderSettings.findUnique({
      where: { id: 1 },
    });

    // اگر رکوردی وجود نداشت، یک نمونه پیش‌فرض بساز
    if (!settings) {
      settings = await db.sliderSettings.create({
        data: {
          id: 1,
          heightDesktop: '85vh',
          heightMobile: '60vh',
          overlayColor: '#000000',
          overlayOpacity: 0.7,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('خطا در GET تنظیمات اسلایدر:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت تنظیمات از پایگاه داده' },
      { status: 500 }
    );
  }
}

// PUT: به‌روزرسانی تنظیمات اسلایدر
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { heightDesktop, heightMobile, overlayColor, overlayOpacity } = body;

    // اعتبارسنجی ساده
    if (overlayOpacity !== undefined && (overlayOpacity < 0 || overlayOpacity > 1)) {
      return NextResponse.json(
        { error: 'مقدار شدت لایه تیره باید بین 0 و 1 باشد' },
        { status: 400 }
      );
    }

    // ابتدا مطمئن شو رکورد وجود دارد (اگر نه، ایجاد کن)
    let existing = await db.sliderSettings.findUnique({ where: { id: 1 } });
    if (!existing) {
      existing = await db.sliderSettings.create({
        data: {
          id: 1,
          heightDesktop: '85vh',
          heightMobile: '60vh',
          overlayColor: '#000000',
          overlayOpacity: 0.7,
        },
      });
    }

    // به‌روزرسانی با مقادیر جدید (فقط فیلدهایی که ارسال شده‌اند)
    const updated = await db.sliderSettings.update({
      where: { id: 1 },
      data: {
        ...(heightDesktop !== undefined && { heightDesktop }),
        ...(heightMobile !== undefined && { heightMobile }),
        ...(overlayColor !== undefined && { overlayColor }),
        ...(overlayOpacity !== undefined && { overlayOpacity }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('خطا در PUT تنظیمات اسلایدر:', error);
    return NextResponse.json(
      { error: 'خطا در ذخیره تنظیمات' },
      { status: 500 }
    );
  }
}