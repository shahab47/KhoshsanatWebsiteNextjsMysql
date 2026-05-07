// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // اعتبارسنجی (بدون تغییر)
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'تمام فیلدها الزامی هستند' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'آدرس ایمیل معتبر نیست' },
        { status: 400 }
      );
    }

    // 1. پیدا کردن یا ایجاد مشتری بر اساس ایمیل
    let customer = await db.customer.findFirst({
      where: { email: email.trim() },
    });

    if (!customer) {
      // مشتری جدید با اطلاعات موجود (نام و ایمیل)
      customer = await db.customer.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          // سایر فیلدها (تلفن، شرکت، ...) خالی می‌مانند – در ادمین بعداً تکمیل می‌شوند
        },
      });
    }

    // 2. ذخیره پیام در مدل CustomerMessage (مرتبط با مشتری)
    const customerMessage = await db.customerMessage.create({
      data: {
        customerId: customer.id,
        subject: subject.trim(),
        message: message.trim(),
        // isRead پیش‌فرض false است
      },
    });

    // (اختیاری) اگر می‌خواهید جدول Contact قدیمی هم برای بایگانی پر شود:
    await db.contact.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'پیام با موفقیت ارسال شد',
        data: { id: customerMessage.id },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving contact:', error);
    return NextResponse.json(
      { error: 'خطا در ارسال پیام. لطفا مجددا تلاش کنید.' },
      { status: 500 }
    );
  }
}

// GET (همان‌طور که بود) – فقط برای پنل ادمین (لیست پیام‌های قدیمی)
export async function GET(request: NextRequest) {
  try {
    const contacts = await db.contact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contacts, { status: 200 });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت پیام‌ها' },
      { status: 500 }
    );
  }
}