// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import {
  parseUserAgent,
  parseReferrer,
  extractGeoLocation,
  createSessionHash,
} from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { path, referrer } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: false, error: 'مسیر نامعتبر' }, { status: 400 });
    }

    // فیلتر کردن مسیرهای ادمین و سیستمی از آمار عمومی
    if (
      path.startsWith('/khoshmin') ||
      path.startsWith('/api') ||
      path.startsWith('/login') ||
      path.startsWith('/_next')
    ) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const headers = request.headers;
    const userAgent = headers.get('user-agent') || '';
    const host = headers.get('host') || 'khoshsanat.ir';

    // استخراج آی‌پی کاربر
    const forwardedFor = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const ip = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : realIp || '127.0.0.1';

    // پردازش هوشمند
    const uaInfo = parseUserAgent(userAgent);
    const refInfo = parseReferrer(referrer, host);
    const geoInfo = extractGeoLocation(headers, ip);

    const todayStr = new Date().toISOString().split('T')[0];
    const sessionHash = createSessionHash(ip, userAgent, todayStr);

    // ذخیره غیرهمگام لاگ بازدید در دیتابیس
    await db.visitLog.create({
      data: {
        path: path.substring(0, 500),
        referrer: refInfo.url ? refInfo.url.substring(0, 1000) : null,
        referrerSource: refInfo.source.substring(0, 100),
        ip: ip.substring(0, 100),
        city: geoInfo.city.substring(0, 100),
        country: geoInfo.country.substring(0, 100),
        countryCode: geoInfo.countryCode.substring(0, 10),
        device: uaInfo.device,
        browser: uaInfo.browser,
        os: uaInfo.os,
        userAgent: userAgent.substring(0, 1000),
        sessionHash,
        isBot: uaInfo.isBot,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('خطا در ثبت بازدید:', error);
    // حتی در صورت خطا پاسخی آرام داده می‌شود تا در کارایی کلاینت اختلالی ایجاد نشود
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
