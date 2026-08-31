// app/api/khoshmin/emails/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getSmtpConfig, saveSmtpConfig, testSmtpConnection } from '@/lib/mail';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    const payload: any = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'توکن نامعتبر است.' }, { status: 401 });
    }

    const config = await getSmtpConfig();
    return NextResponse.json({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      hasPass: Boolean(config.pass),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    });
  } catch (error: any) {
    console.error('Error fetching SMTP settings:', error);
    return NextResponse.json({ error: 'خطا در دریافت تنظیمات ایمیل' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    const payload: any = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'توکن نامعتبر است.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, testRecipient, ...configData } = body;

    // اقدام به تست اتصال
    if (action === 'test') {
      const recipient = testRecipient?.trim() || payload.email || configData.fromEmail;
      if (!recipient) {
        return NextResponse.json(
          { error: 'آدرس ایمیل جهت دریافت پیام تست وارد نشده است.' },
          { status: 400 }
        );
      }

      const testResult = await testSmtpConnection(recipient, {
        host: configData.host,
        port: configData.port ? parseInt(configData.port, 10) : undefined,
        secure: configData.secure,
        user: configData.user,
        pass: configData.pass || undefined,
        fromEmail: configData.fromEmail,
        fromName: configData.fromName,
      });

      if (!testResult.success) {
        return NextResponse.json(
          { error: testResult.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: testResult.message,
      });
    }

    // ذخیره تنظیمات در دیتابیس
    await saveSmtpConfig({
      host: configData.host,
      port: configData.port ? parseInt(configData.port, 10) : undefined,
      secure: configData.secure !== undefined ? Boolean(configData.secure) : undefined,
      user: configData.user,
      pass: configData.pass || undefined, // اگر خالی بود قبلی دست‌نخورده می‌ماند
      fromEmail: configData.fromEmail,
      fromName: configData.fromName,
    });

    return NextResponse.json({
      success: true,
      message: 'تنظیمات سرور ایمیل با موفقیت ذخیره شد.',
    });
  } catch (error: any) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(
      { error: error?.message || 'خطا در ذخیره تنظیمات ایمیل' },
      { status: 500 }
    );
  }
}
