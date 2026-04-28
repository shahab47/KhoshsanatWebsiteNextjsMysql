// src/app/api/texts/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

// خواندن متن‌ها از دیتابیس
export async function GET() {
  const settings = await db.setting.findMany({
    where: {
      // فقط کلیدهایی که مربوط به متن هستند را بگیر
      key: { in: ['HERO_TITLE', 'HERO_SUBTITLE'] }
    }
  });
  
  // تبدیل اطلاعات به یک آبجکت ساده برای استفاده راحت‌تر در فرانت‌اند
  const texts = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(texts);
}

// ذخیره یا آپدیت متن‌های جدید
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // حلقه برای ذخیره کردن تک‌تک متن‌های ارسال شده
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        await db.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value: value }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'خطا در ذخیره اطلاعات' }, { status: 500 });
  }
}