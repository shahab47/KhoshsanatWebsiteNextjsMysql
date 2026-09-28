import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, ArrowLeft } from 'lucide-react';
import db from '@/lib/db';
import { SocialIcon } from '@/components/icons/SocialIcons';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { sanitizeHtml } from '@/lib/seo';

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
  let dbTexts: Record<string, string> = {};
  let socialLinks: Record<string, string> = {};
  try {
    const allSettings = await db.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'FOOTER_' } },
          { key: { startsWith: 'SOCIAL_' } },
        ],
      },
    });
    const footerSettings = allSettings.filter(s => s.key.startsWith('FOOTER_'));
    const socialSettings = allSettings.filter(s => s.key.startsWith('SOCIAL_'));
    dbTexts = settingsToObject(footerSettings);
    socialLinks = settingsToObject(socialSettings);
  } catch (err) {
    console.warn('پایگاه داده در دسترس نیست؛ استفاده از متون پیش‌فرض در Footer:', err);
  }

  // دریافت لوگو از جدول logo با اولویت main-svg
  let logoUrl = '/Logo.svg';
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
    aboutText: dbTexts.FOOTER_ABOUT || 'شرکت مهندسی و ساخت خوش‌صنعت پایدار؛ متخصص در طراحی و ساخت اتصالات صنعتی، براکت‌های کرتین‌وال، قطعات CNC و سازه‌های فلزی ساختمانی.',
    address: dbTexts.FOOTER_ADDRESS || 'تهران، شهرک صنعتی، خیابان مهندسان، پلاک ۱۲',
    phone: dbTexts.FOOTER_PHONE || '+98 935 18 77 305',
    email: dbTexts.FOOTER_EMAIL || 'info@ks-engineering.com',
    col1Title: dbTexts.FOOTER_COL1_TITLE || 'دسترسی سریع',
    col2Title: dbTexts.FOOTER_COL2_TITLE || 'خدمات و تولیدات',
  };

  const col1Links = parseLinks(dbTexts.FOOTER_COL1_LINKS, [
    { id: 1, text: 'صفحه اصلی', url: '/' },
    { id: 2, text: 'کاتالوگ محصولات', url: '/products' },
    { id: 3, text: 'گالری پروژه‌ها', url: '/projects' },
    { id: 4, text: 'آموزش و مقالات', url: '/education' },
    { id: 5, text: 'درخواست استعلام', url: '/contact' },
  ]);

  const col2Links = parseLinks(dbTexts.FOOTER_COL2_LINKS, [
    { id: 1, text: 'براکت‌های کرتین‌وال و نمای خشک', url: '/products' },
    { id: 2, text: 'برش لیزر فایبر CNC', url: '/contact' },
    { id: 3, text: 'جوشکاری تخصصی MIG / TIG', url: '/contact' },
    { id: 4, text: 'طراحی شاپ‌دراوینگ نما', url: '/contact' },
  ]);

  // فیلتر کردن شبکه‌هایی که لینک معتبر دارند
  const activeSocials = SOCIAL_PLATFORMS.filter(
    (platform) => socialLinks[`SOCIAL_${platform.key.toUpperCase()}`]
  );

  return (
    <footer className="bg-[#2D3644] text-gray-300 pt-20 pb-10 px-6 border-t border-white/10" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* ردیف بالا: معرفی هویت مهندسی */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 text-right">
          
          {/* ستون اول: لوگو + درباره برند + شبکه‌های اجتماعی */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <ImageWithFallback
                src={logoUrl}
                fallbackSrc="/Logo.svg"
                alt="خوش‌صنعت پایدار"
                className="h-11 w-auto transition-all object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <div className="text-left" dir="ltr">
                <div className="text-xs font-mono font-bold tracking-widest text-white">KHOSHSANAT</div>
                <div className="text-[10px] font-mono text-[#60a5fa] tracking-wider">ENGINEERING CO.</div>
              </div>
            </div>

            <div 
              className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.aboutText) }}
            />

            <div className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-4" dir="ltr">
              PRECISION IN EVERY CONNECTION
            </div>

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
                      className="inline-flex items-center justify-center rounded-xl p-2 bg-white/5 hover:bg-[#2563EB] text-white transition-colors border border-white/10"
                      aria-label={label}
                    >
                      <SocialIcon type={key} className="w-4 h-4" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ستون دوم: دسترسی سریع */}
          <div>
            <h4 className="text-white font-bold text-base mb-6 border-r-2 border-[#2563EB] pr-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.col1Title) }} />
            <ul className="space-y-3 text-xs sm:text-sm">
              {col1Links.map((link: any) => (
                <li key={link.id}>
                  <Link href={link.url || '#'} className="hover:text-white transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#2563EB] transition-transform group-hover:scale-150" />
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(link.text) }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ستون سوم: خدمات و تولیدات */}
          <div>
            <h4 className="text-white font-bold text-base mb-6 border-r-2 border-[#2563EB] pr-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.col2Title) }} />
            <ul className="space-y-3 text-xs sm:text-sm">
              {col2Links.map((link: any) => (
                <li key={link.id}>
                  <Link href={link.url || '#'} className="hover:text-white transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-[#2563EB] transition-transform group-hover:scale-150" />
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(link.text) }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ستون چهارم: ارتباط با ما */}
          <div>
            <h4 className="text-white font-bold text-base mb-6 border-r-2 border-[#2563EB] pr-3">اطلاعات کارخانه و دفتر</h4>
            <ul className="space-y-4 text-xs sm:text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={17} className="text-[#60a5fa] shrink-0 mt-0.5" />
                <span className="leading-relaxed text-gray-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.address) }} />
              </li>
              <li className="flex items-center gap-3">
                <Phone size={17} className="text-[#60a5fa] shrink-0" />
                <span dir="ltr" className="text-gray-300 font-mono" dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.phone) }} />
              </li>
              <li className="flex items-center gap-3">
                <Mail size={17} className="text-[#60a5fa] shrink-0" />
                <span className="text-gray-300 font-mono" dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaults.email) }} />
              </li>
            </ul>
          </div>
        </div>

        {/* فوتر پایانی و کپی‌رایت */}
        <div className="pt-8 border-t border-white/10 text-xs text-gray-400 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-center md:text-right">
            تمامی حقوق برای شرکت مهندسی و ساخت <span className="text-white font-semibold">خوش‌صنعت پایدار</span> محفوظ است.
          </p>
          <div className="flex items-center gap-6" dir="ltr">
            <span className="text-gray-500 font-mono">PRECISION IN EVERY CONNECTION</span>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition-colors">قوانین</Link>
              <Link href="#" className="hover:text-white transition-colors">حریم خصوصی</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}