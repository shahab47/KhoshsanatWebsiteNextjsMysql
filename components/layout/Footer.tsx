// src/components/layout/Footer.tsx
import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import db from '@/lib/db';
import { SocialIcon } from '@/components/icons/SocialIcons';
import ImageWithFallback from '@/components/ui/ImageWithFallback'; // اضافه شد

// لیست پلتفرم‌های پشتیبانی شده
const SOCIAL_PLATFORMS = [
  { key: 'linkedin', label: 'لینکدین' },
  { key: 'instagram', label: 'اینستاگرام' },
  { key: 'telegram', label: 'تلگرام' },
  { key: 'whatsapp', label: 'واتساپ' },
  { key: 'twitter', label: 'توییتر' },
  { key: 'facebook', label: 'فیسبوک' },
  { key: 'youtube', label: 'یوتیوب' },
  { key: 'tiktok', label: 'تیکتاک' },
  { key: 'soundcloud', label: 'ساندکلاود' },
] as const;

// تابع کمکی برای تبدیل آرایه تنظیمات به آبجکت
const settingsToObject = (settings: Array<{ key: string; value: string }>) =>
  settings.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {} as Record<string, string>);

// تابع کمکی برای پارس کردن JSON لینک‌ها
const parseLinks = (rawJson?: string, fallback: any[] = []) => {
  if (!rawJson) return fallback;
  try {
    return JSON.parse(rawJson);
  } catch {
    return fallback;
  }
};

export default async function Footer() {
  // دریافت همزمان تنظیمات فوتر و شبکه‌های اجتماعی
  const [footerSettings, socialSettings] = await Promise.all([
    db.setting.findMany({ where: { key: { startsWith: 'FOOTER_' } } }),
    db.setting.findMany({ where: { key: { startsWith: 'SOCIAL_' } } }),
  ]);

  const dbTexts = settingsToObject(footerSettings);
  const socialLinks = settingsToObject(socialSettings);

  // دریافت لوگو از جدول logo با اولویت main-svg
  let logoUrl = '/Logo.svg'; // پیش‌فرض
  try {
    const svgLogo = await db.logo.findUnique({ where: { type: 'main-svg' } });
    if (svgLogo?.url) {
      logoUrl = svgLogo.url;
    }
  } catch (err) {
    console.error('خطا در دریافت لوگو:', err);
  }

  // مقادیر پیش‌فرض
  const defaults = {
    aboutText: dbTexts.FOOTER_ABOUT || 'شرکت مهندسی و معماری خوش صنعت پایدار...',
    address: dbTexts.FOOTER_ADDRESS || 'تهران، شهرک صنعتی، خیابان مهندسان، پلاک ۱۲',
    phone: dbTexts.FOOTER_PHONE || '+98 935 18 77 305',
    email: dbTexts.FOOTER_EMAIL || 'info@ks-engineering.com',
    col1Title: dbTexts.FOOTER_COL1_TITLE || 'دسترسی سریع',
    col2Title: dbTexts.FOOTER_COL2_TITLE || 'خدمات مهندسی',
  };

  const col1Links = parseLinks(dbTexts.FOOTER_COL1_LINKS, [
    { id: 1, text: 'صفحه اصلی', url: '/' },
    { id: 2, text: 'محصولات ما', url: '/products' },
    { id: 3, text: 'گالری پروژه‌ها', url: '/projects' },
    { id: 4, text: 'ثبت سفارش و استعلام', url: '/contact' },
  ]);

  const col2Links = parseLinks(dbTexts.FOOTER_COL2_LINKS, [
    { id: 1, text: 'مشاوره معماری و سازه', url: '#' },
    { id: 2, text: 'ساخت اسکلت فلزی (سوله و برج)', url: '#' },
    { id: 3, text: 'شاپ دراوینگ تخصصی', url: '#' },
    { id: 4, text: 'کنترل کیفیت و تست جوش', url: '#' },
  ]);

  // فیلتر کردن شبکه‌هایی که لینک معتبر دارند
  const activeSocials = SOCIAL_PLATFORMS.filter(
    (platform) => socialLinks[`SOCIAL_${platform.key.toUpperCase()}`]
  );

  return (
    <footer className="bg-[rgb(39,39,39)] pt-20 pb-8 px-6 border-t border-[rgb(233,233,233)] text-gray-400" dir="rtl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 text-right">
        
        {/* ستون اول: لوگو + درباره + شبکه‌های اجتماعی */}
        <div className="lg:col-span-1">
          <ImageWithFallback
            src={logoUrl}
            fallbackSrc="/Logo.svg"
            alt="KS Logo"
            className="h-12 mb-6 transition-all object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div 
            className="text-sm leading-relaxed mb-6 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: defaults.aboutText }}
          />
          {activeSocials.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {activeSocials.map(({ key, label }) => {
                const url = socialLinks[`SOCIAL_${key.toUpperCase()}`];
                return (
                  <Link
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full p-1.5 text-white transition-colors hover:bg-[rgb(58,58,58)]"
                    aria-label={label}
                  >
                    <SocialIcon type={key} className="w-5 h-5" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ستون دوم */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6" dangerouslySetInnerHTML={{ __html: defaults.col1Title }} />
          <ul className="space-y-3 text-sm">
            {col1Links.map((link: any) => (
              <li key={link.id}>
                <Link href={link.url || '#'} className="hover:text-blue-500 transition-colors">
                  <span dangerouslySetInnerHTML={{ __html: link.text }} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ستون سوم */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6" dangerouslySetInnerHTML={{ __html: defaults.col2Title }} />
          <ul className="space-y-3 text-sm">
            {col2Links.map((link: any) => (
              <li key={link.id}>
                <Link href={link.url || '#'} className="hover:text-blue-500 transition-colors">
                  <span dangerouslySetInnerHTML={{ __html: link.text }} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ستون چهارم: اطلاعات تماس */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6">ارتباط با ما</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: defaults.address }} />
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-blue-500 shrink-0" />
              <span dir="ltr" dangerouslySetInnerHTML={{ __html: defaults.phone }} />
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-blue-500 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: defaults.email }} />
            </li>
          </ul>
        </div>
      </div>

      {/* فوتر پایین */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-[rgb(233,233,233)] text-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <p>تمامی حقوق مادی و معنوی این سایت متعلق به شرکت خوش صنعت پایدار می‌باشد.</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-white transition-colors">قوانین و مقررات</Link>
          <Link href="#" className="hover:text-white transition-colors">حریم خصوصی</Link>
        </div>
      </div>
    </footer>
  );
}