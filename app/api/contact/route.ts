// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // اعتبارسنجی
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
      // مشتری جدید با اطلاعات موجود
      customer = await db.customer.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          unreadMessagesCount: 1,
          isViewedByAdmin: false,
        },
      });
    } else {
      // به‌روزرسانی وضعیت اعلان مشتری موجود
      await db.customer.update({
        where: { id: customer.id },
        data: {
          unreadMessagesCount: { increment: 1 },
          isViewedByAdmin: false,
        }
      });
    }

    // 2. ذخیره پیام در مدل CustomerMessage
    const customerMessage = await db.customerMessage.create({
      data: {
        customerId: customer.id,
        subject: subject.trim(),
        message: message.trim(),
        isRead: false,
      },
    });

    // ذخیره در جدول Contact برای آرشیو
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

// GET – فقط برای ادمین لاگین شده
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

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