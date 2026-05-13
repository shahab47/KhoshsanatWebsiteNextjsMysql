import React from 'react';
import { ShieldCheck, Settings, Truck } from 'lucide-react';
import db from '@/lib/db';
import ImageWithFallback from '@/components/ui/ImageWithFallback'; // اضافه شد

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
      icon: <ShieldCheck size={48} strokeWidth={1.5} className="text-[rgb(133,137,140)]" />
    },
    {
      id: 2,
      title: dbTexts.FEATURE_2_TITLE || "راه‌حل‌های مهندسی‌شده",
      description: dbTexts.FEATURE_2_DESC || "ساخت دقیق قطعات بر اساس نقشه‌های شاپ‌دراوینگ و ارائه مشاوره‌های تخصصی برای بهینه‌سازی اتصالات و کاهش پرتی آهن‌آلات.",
      icon: <Settings size={48} strokeWidth={1.5} className="text-[rgb(133,137,140)]" />
    },
    {
      id: 3,
      title: dbTexts.FEATURE_3_TITLE || "تحویل به‌موقع",
      description: dbTexts.FEATURE_3_DESC || "لجستیک حرفه‌ای و برنامه‌ریزی دقیق تولید، جهت ارسال قطعات پیش‌ساخته به کارگاه شما بدون کوچکترین تاخیر در زمان‌بندی پروژه.",
      icon: <Truck size={48} strokeWidth={1.5} className="text-[rgb(133,137,140)]" />
    }
  ];

  return (
    <section className="py-8 px-4 bg-[rgb(247,249,250)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
          <div className="md:w-1/4 flex justify-start">
            <ImageWithFallback
              src={logoUrl}
              fallbackSrc="/Logo.svg"
              alt="Logo"
              className="w-32 h-32 object-contain md:w-40 md:h-40"
            />
          </div>
          <div className="md:w-3/4 text-right">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {title}
            </h2>
            <div 
              className="text-gray-700 font-light leading-relaxed text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: desc }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
          {features.map((feature) => (
            <div key={feature.id} className="flex flex-col items-center">
              <div className="mb-3 p-3 rounded-full bg-gray-100 border border-gray-200 inline-flex">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 font-light leading-relaxed text-sm max-w-xs mx-auto">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}