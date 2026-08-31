// app/api/khoshmin/emails/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
    }

    const payload: any = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'توکن نامعتبر است.' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, html, text, fromEmail, fromName, customerId } = body;

    if (!to || (typeof to === 'string' && !to.trim())) {
      return NextResponse.json({ error: 'آدرس ایمیل گیرنده الزامی است.' }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'موضوع ایمیل الزامی است.' }, { status: 400 });
    }

    if (!html && !text) {
      return NextResponse.json({ error: 'متن پیام الزامی است.' }, { status: 400 });
    }

    // ارسال ایمیل از طریق ماژول مرکزی
    const result = await sendEmail({
      to: typeof to === 'string' ? to.trim() : to,
      subject: subject.trim(),
      html: html ? html.trim() : undefined,
      text: text ? text.trim() : undefined,
      fromEmail: fromEmail?.trim() || undefined,
      fromName: fromName?.trim() || undefined,
      senderId: payload.id,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `خطا در ارسال ایمیل: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ایمیل با موفقیت ارسال شد.',
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Error in send email API:', error);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در ارسال ایمیل' },
      { status: 500 }
    );
  }
}
