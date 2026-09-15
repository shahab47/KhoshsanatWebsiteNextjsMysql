import React from 'react';
import { ShieldCheck, Settings, Truck } from 'lucide-react';
import db from '@/lib/db';
import ImageWithFallback from '@/components/ui/ImageWithFallback'; // اضافه شد
import { sanitizeHtml } from '@/lib/seo';

export default async function WhyUs() {
  const settings = await db.setting.findMany({
    where: { key: { startsWith: 'ABOUT_' } }
  });
  const featuresDb = await db.setting.findMany({
    where: { key: { startsWith: 'FEATURE_' } }
  });

  const dbTexts = [...settings, ...featuresDb].reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

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

  const title = dbTexts.ABOUT_TITLE || "درباره خوش صنعت پایدار";
  const desc = dbTexts.ABOUT_DESC || `
    <span style="color: #ffffff;">شرکت</span> خوش صنعت پایدار با دارا بودن <span style="color: #ff2e2e;">ماشین‌آلات</span> تولیدی مانند CNC لیزر، جوشکاری CO2 و آرگون، خم برک و ... امکان تولید محصولات صنعتی و ساختمانی را به‌صورت عمومی و اختصاصی برای برآورد نیاز بازار داخل و خارج از ایران دارد.
  `;

  const features = [
    {
      id: 1,
      title: dbTexts.FEATURE_1_TITLE || "تضمین کیفیت",
      description: dbTexts.FEATURE_1_DESC || "تضمین بالاترین استانداردهای صنعتی و کنترل کیفیت دقیق (QC) در تمامی مراحل جوشکاری، برش‌کاری و مونتاژ قطعات فولادی.",
      icon: <ShieldCheck size={44} strokeWidth={1.75} className="text-ks-blue-500" />
    },
    {
      id: 2,
      title: dbTexts.FEATURE_2_TITLE || "راه‌حل‌های مهندسی‌شده",
      description: dbTexts.FEATURE_2_DESC || "ساخت دقیق قطعات بر اساس نقشه‌های شاپ‌دراوینگ و ارائه مشاوره‌های تخصصی برای بهینه‌سازی اتصالات و کاهش پرتی آهن‌آلات.",
      icon: <Settings size={44} strokeWidth={1.75} className="text-ks-blue-500" />
    },
    {
      id: 3,
      title: dbTexts.FEATURE_3_TITLE || "تحویل به‌موقع",
      description: dbTexts.FEATURE_3_DESC || "لجستیک حرفه‌ای و برنامه‌ریزی دقیق تولید، جهت ارسال قطعات پیش‌ساخته به کارگاه شما بدون کوچکترین تاخیر در زمان‌بندی پروژه.",
      icon: <Truck size={44} strokeWidth={1.75} className="text-ks-blue-500" />
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 bg-ks-light-50" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-center mb-12 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="md:w-1/4 flex justify-center md:justify-start shrink-0">
            <ImageWithFallback
              src={logoUrl}
              fallbackSrc="/Logo.svg"
              alt="لوگو خوش صنعت پایدار"
              className="w-32 h-32 object-contain md:w-36 md:h-36"
            />
          </div>
          <div className="md:w-3/4 text-right">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              {title}
            </h2>
            <div 
              className="text-gray-600 font-normal leading-relaxed text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc) }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
          {features.map((feature) => (
            <div key={feature.id} className="flex flex-col items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md hover:border-ks-blue-300">
              <div className="mb-4 p-3.5 rounded-2xl bg-ks-blue-50 border border-ks-blue-100 inline-flex shadow-xs">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 font-normal leading-relaxed text-sm max-w-xs mx-auto">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}