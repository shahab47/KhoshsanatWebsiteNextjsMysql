import React from 'react';
import { ShieldCheck, Settings, Truck, CheckCircle2, Layers, Cpu, Award } from 'lucide-react';
import db from '@/lib/db';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { sanitizeHtml } from '@/lib/seo';

export default async function WhyUs() {
  let dbTexts: Record<string, string> = {};
  try {
    const allSettings = await db.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'ABOUT_' } },
          { key: { startsWith: 'FEATURE_' } },
        ],
      },
    });
    dbTexts = allSettings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  } catch (err) {
    console.warn('پایگاه داده در دسترس نیست؛ استفاده از متون پیش‌فرض در WhyUs:', err);
  }

  // دریافت لوگو از جدول logo با اولویت main-svg
  let logoUrl = '/Logo.svg';
  try {
    const vectorLogo = await db.logo.findUnique({ where: { type: 'main-svg' } });
    if (vectorLogo?.url) {
      logoUrl = vectorLogo.url;
    }
  } catch (err) {
    console.error('خطا در دریافت لوگو:', err);
  }

  const title = dbTexts.ABOUT_TITLE || "چرا دقت در ساخت اهمیت حیاتی دارد؟";
  const desc = dbTexts.ABOUT_DESC || `
    در سازه‌های مدرن و نماهای بلندمرتبه کرتین‌وال، حتی ۱ میلی‌متر انحراف در تراز براکت‌ها می‌تواند به شکست شیشه‌ها، عدم هوابندی یا توقف عملیات نصب در کارگاه منجر شود. شرکت خوش‌صنعت پایدار با بهره‌گیری از ماشین‌آلات پیشرفته CNC فایبر لیزر، خم‌کاری هیدرولیک و خطوط جوشکاری استاندارد با گاز محافظ، اتصالاتی بدون خطای زاویه‌ای و با بالاترین استحکام سازه‌ای تولید می‌کند.
  `;

  const features = [
    {
      id: 1,
      code: 'PRECISION',
      title: dbTexts.FEATURE_1_TITLE || "تضمین دقت ابعادی و تلرانس ساخت",
      description: dbTexts.FEATURE_1_DESC || "کنترل کیفیت دقیق (QC) و پایش ابعادی سوراخ‌های لوبیایی و اتصالات براکت، جهت مهار کامل ناشاقولی‌های احتمالی اسکلت ساختمان.",
      icon: <ShieldCheck size={28} strokeWidth={1.8} className="text-[#2563EB]" />,
    },
    {
      id: 2,
      code: 'ENGINEERING',
      title: dbTexts.FEATURE_2_TITLE || "راه‌حل‌های مهندسی و شاپ‌دراوینگ",
      description: dbTexts.FEATURE_2_DESC || "بررسی دقیق نقشه‌های اجرایی نما و ارائه بهینه‌سازی فنی اتصالات جهت کاهش دورریز آهن‌آلات و افزایش سرعت نصب در محل پروژه.",
      icon: <Settings size={28} strokeWidth={1.8} className="text-[#2563EB]" />,
    },
    {
      id: 3,
      code: 'EXECUTION',
      title: dbTexts.FEATURE_3_TITLE || "تعهد در تحویل به‌موقع به کارگاه",
      description: dbTexts.FEATURE_3_DESC || "برنامه‌ریزی دقیق تولید بر اساس فازبندی طبقات پروژه ساختمانی، برای ارسال پارت‌های قطعات بدون توقف تیم‌های نصاب نما.",
      icon: <Truck size={28} strokeWidth={1.8} className="text-[#2563EB]" />,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-t border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش: چرا دقت اهمیت دارد */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
            <span className="w-2 h-0.5 bg-[#2563EB]" />
            WHY PRECISION MATTERS // THE ENGINEERING STANDARD
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D3644] tracking-tight">
            دقت در هر اتصال؛ فراتر از یک شعار تجاری
          </h2>
        </div>

        {/* کارت معرفی و داستان برند */}
        <div className="flex flex-col lg:flex-row gap-10 items-center mb-14 bg-[#F5F7FA] p-8 sm:p-10 md:p-12 rounded-3xl border border-gray-200">
          <div className="lg:w-1/4 flex justify-center shrink-0">
            <div className="relative p-6 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center">
              <ImageWithFallback
                src={logoUrl}
                fallbackSrc="/Logo.svg"
                alt="لوگوی شرکت مهندسی خوش صنعت پایدار"
                className="w-32 h-32 md:w-36 md:h-36 object-contain"
              />
            </div>
          </div>
          <div className="lg:w-3/4 text-right">
            <div className="text-xs font-mono text-[#2563EB] uppercase mb-1 tracking-wider" dir="ltr">
              ABOUT KHOSHSANAT PAYDAR
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#2D3644] mb-4">
              {title}
            </h3>
            <div
              className="text-[#6C6C6E] leading-relaxed text-sm sm:text-base space-y-3"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc) }}
            />
          </div>
        </div>

        {/* ستون‌های ۳ گانه ارکان مهندسی */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-col justify-between bg-[#F5F7FA] p-7 sm:p-8 rounded-2xl border border-gray-200 hover:border-[#2563EB]/40 hover:bg-white hover:shadow-md transition-all text-right group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs group-hover:border-[#2563EB]/30 transition-colors">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-mono text-[#6C6C6E] tracking-wider" dir="ltr">
                    {feature.code}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-[#2D3644] mb-3 group-hover:text-[#2563EB] transition-colors">
                  {feature.title}
                </h4>
                <p className="text-xs sm:text-sm text-[#6C6C6E] leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200/80 flex items-center gap-2 text-xs font-mono text-[#2563EB]" dir="ltr">
                <CheckCircle2 size={14} />
                <span>VERIFIED SPECIFICATION</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}