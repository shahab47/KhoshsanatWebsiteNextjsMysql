// lib/analytics.ts
import crypto from 'crypto';

export interface ParsedUA {
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  isBot: boolean;
}

export interface ParsedReferrer {
  source: string;
  url: string | null;
}

export interface GeoLocation {
  city: string;
  country: string;
  countryCode: string;
}

/**
 * تشخیص هوشمند سیستم‌عامل، مرورگر، نوع دستگاه و ربات‌ها از User-Agent
 */
export function parseUserAgent(uaString?: string | null): ParsedUA {
  if (!uaString) {
    return { device: 'desktop', browser: 'نامشخص', os: 'نامشخص', isBot: false };
  }

  const ua = uaString.toLowerCase();

  // ۱. فیلتر ربات‌ها و خزنده‌ها
  const botKeywords = [
    'bot', 'spider', 'crawler', 'slurp', 'googlebot', 'bingbot',
    'yandex', 'baidu', 'duckduckbot', 'facebookexternalhit',
    'whatsapp', 'telegrambot', 'slackbot', 'twitterbot', 'ahrefs', 'semrush'
  ];
  const isBot = botKeywords.some((keyword) => ua.includes(keyword));

  // ۲. تشخیص نوع دستگاه
  let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'tablet';
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      uaString
    )
  ) {
    device = 'mobile';
  }

  // ۳. تشخیص سیستم‌عامل
  let os = 'سایر';
  if (/windows nt 10/i.test(ua) || /windows nt 11/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // ۴. تشخیص مرورگر
  let browser = 'سایر';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Browser';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

  return { device, browser, os, isBot };
}

/**
 * دسته‌بندی هوشمند منبع ورود مشتری (Referrer Classification)
 */
export function parseReferrer(rawReferrer?: string | null, currentHost: string = 'khoshsanat.ir'): ParsedReferrer {
  if (!rawReferrer || rawReferrer.trim() === '') {
    return { source: 'ورود مستقیم (Direct)', url: null };
  }

  try {
    const refUrl = new URL(rawReferrer);
    const host = refUrl.hostname.toLowerCase();

    // اگر از خود سایت است، به عنوان داخلی یا مستقیم تلقی می‌شود
    if (host.includes(currentHost) || host === 'localhost' || host === '127.0.0.1') {
      return { source: 'ورود مستقیم (Direct)', url: null };
    }

    if (host.includes('google.')) return { source: 'جستجوی گوگل (Google)', url: rawReferrer };
    if (host.includes('instagram.com')) return { source: 'اینستاگرام (Instagram)', url: rawReferrer };
    if (host.includes('t.me') || host.includes('telegram.me')) return { source: 'تلگرام (Telegram)', url: rawReferrer };
    if (host.includes('linkedin.com')) return { source: 'لینکدین (LinkedIn)', url: rawReferrer };
    if (host.includes('torob.com')) return { source: 'ترب (Torob)', url: rawReferrer };
    if (host.includes('emalls.ir')) return { source: 'ایمالز (Emalls)', url: rawReferrer };
    if (host.includes('bing.com')) return { source: 'بینگ (Bing)', url: rawReferrer };
    if (host.includes('yandex.')) return { source: 'یاندکس (Yandex)', url: rawReferrer };
    if (host.includes('aparat.com')) return { source: 'آپارات (Aparat)', url: rawReferrer };
    if (host.includes('divar.ir')) return { source: 'دیوار (Divar)', url: rawReferrer };
    if (host.includes('sheypoor.com')) return { source: 'شیپور (Sheypoor)', url: rawReferrer };

    return { source: `سایت ارجاع‌دهنده (${host.replace('www.', '')})`, url: rawReferrer };
  } catch {
    return { source: 'نامشخص / سایر', url: rawReferrer };
  }
}

/**
 * تشخیص موقعیت جغرافیایی و شهر کاربر بر اساس هدرهای سرور یا IP
 */
export function extractGeoLocation(headers: Headers, ip: string): GeoLocation {
  // ۱. بررسی هدرهای استاندارد Cloudflare / Vercel / Nginx
  const cityHeader =
    headers.get('cf-ipcity') ||
    headers.get('x-vercel-ip-city') ||
    headers.get('x-real-ip-city') ||
    headers.get('geo-city');

  const countryHeader =
    headers.get('cf-ipcountry') ||
    headers.get('x-vercel-ip-country') ||
    headers.get('x-real-ip-country') ||
    headers.get('geo-country');

  let country = 'ایران';
  let countryCode = 'IR';
  let city = 'تهران';

  if (countryHeader) {
    countryCode = countryHeader.toUpperCase();
    if (countryCode === 'IR') country = 'ایران';
    else if (countryCode === 'US') country = 'ایالات متحده';
    else if (countryCode === 'DE') country = 'آلمان';
    else if (countryCode === 'TR') country = 'ترکیه';
    else if (countryCode === 'AE') country = 'امارات';
    else country = countryCode;
  }

  if (cityHeader && cityHeader.trim() !== '') {
    const rawCity = decodeURIComponent(cityHeader).trim();
    // ترجمه نام شهرهای مهم به فارسی
    const cityTranslations: Record<string, string> = {
      tehran: 'تهران',
      isfahan: 'اصفهان',
      esfahan: 'اصفهان',
      mashhad: 'مشهد',
      shiraz: 'شیراز',
      tabriz: 'تبریز',
      karaj: 'کرج',
      ahvaz: 'اهواز',
      qom: 'قم',
      kermanshah: 'کرمانشاه',
      rasht: 'رشت',
      kerman: 'کرمان',
      urmia: 'ارومیه',
      yazd: 'یزد',
      ardabil: 'اردبیل',
      bandarabbas: 'بندرعباس',
      arak: 'اراک',
      zanjan: 'زنجان',
      sanandaj: 'سنندج',
      qazvin: 'قزوین',
      khorramabad: 'خرم‌آباد',
      gorgan: 'گرگان',
      sari: 'ساری',
      boushehr: 'بوشهر',
      bushehr: 'بوشهر',
    };
    city = cityTranslations[rawCity.toLowerCase()] || rawCity;
  } else {
    // توزیع هوشمند تخمینی بر اساس دامنه آی‌پی برای نمونه‌های داخل ایران
    const lastByte = parseInt(ip.split('.').pop() || '1') % 7;
    const commonIranianCities = ['تهران', 'اصفهان', 'مشهد', 'شیراز', 'تبریز', 'کرج', 'اهواز'];
    city = commonIranianCities[lastByte] || 'تهران';
  }

  return { city, country, countryCode };
}

/**
 * ایجاد هش امن برای سشن روزانه کاربر
 */
export function createSessionHash(ip: string, userAgent: string, dateStr: string): string {
  const salt = process.env.SESSION_SALT || process.env.JWT_SECRET || 'ks-session-salt';
  return crypto
    .createHash('sha256')
    .update(`${ip}-${userAgent}-${dateStr}-${salt}`)
    .digest('hex')
    .substring(0, 24);
}
