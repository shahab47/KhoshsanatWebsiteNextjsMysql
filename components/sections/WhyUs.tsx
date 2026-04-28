import React from 'react';
import { ShieldCheck, Settings, Truck } from 'lucide-react';

// تعریف ساختار داده‌ها برای تایپ‌اسکریپت
interface FeatureItem {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: FeatureItem[] = [
  {
    id: 1,
    title: "کیفیت بی‌نظیر",
    description: "تضمین بالاترین استانداردهای صنعتی و کنترل کیفیت دقیق (QC) در تمامی مراحل جوشکاری، برش‌کاری و مونتاژ قطعات فولادی.",
    icon: <ShieldCheck size={48} strokeWidth={1.5} className="text-ks-blue" />
  },
  {
    id: 2,
    title: "راه‌حل‌های مهندسی‌شده",
    description: "ساخت دقیق قطعات بر اساس نقشه‌های شاپ‌دراوینگ و ارائه مشاوره‌های تخصصی برای بهینه‌سازی اتصالات و کاهش پرتی آهن‌آلات.",
    icon: <Settings size={48} strokeWidth={1.5} className="text-ks-blue" />
  },
  {
    id: 3,
    title: "تحویل به‌موقع",
    description: "لجستیک حرفه‌ای و برنامه‌ریزی دقیق تولید، جهت ارسال قطعات پیش‌ساخته به کارگاه شما بدون کوچکترین تاخیر در زمان‌بندی پروژه.",
    icon: <Truck size={48} strokeWidth={1.5} className="text-ks-blue" />
  }
];

export default function WhyUs() {
  return (
    // استفاده از رنگ پس‌زمینه کمی تیره‌تر برای تفکیک بخش‌ها
    <section className="py-24 px-6 bg-[#14161a]">
      <div className="max-w-7xl mx-auto">
        
        {/* تیتر بخش */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
           درباره خوش صنعت پایدار
            </h2>
<p className="text-gray-400 max-w-2xl mx-auto leading-loose text-justify md:text-center">
  شرکت <strong className="text-white font-semibold">خوش صنعت پایدار</strong> با دارا بودن ماشین‌آلات تولیدی مانند 
  <strong className="text-blue-400 font-medium"> CNC لیزر</strong>، 
  <strong className="text-blue-400 font-medium"> جوشکاری CO2 و آرگون</strong>، 
  <strong className="text-blue-400 font-medium"> خم برک</strong> و ... امکان تولید محصولات صنعتی و ساختمانی را به‌صورت عمومی و اختصاصی 
  برای برآورد نیاز بازار داخل و خارج از ایران دارد.
  <br />
  همچنین بخش مهندسی ما متعهد است در صورت نیاز شما در بحث 
  <strong className="text-blue-400 font-medium"> طراحی محصولات جدید</strong>، 
  <strong className="text-blue-400 font-medium"> مشاوره بازار</strong> و 
  <strong className="text-blue-400 font-medium"> روش تولید</strong>، همکاری‌های مورد نیاز شما را به عمل آورد.
</p>
        </div>

        {/* گرید ویژگی‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {features.map((feature) => (
            <div 
              key={feature.id} 
              className="flex flex-col items-center text-center group"
            >
              {/* آیکون با افکت هاور */}
              <div className="mb-6 p-4 rounded-full bg-ks-gray border border-gray-800 group-hover:border-ks-blue group-hover:bg-ks-blue/10 transition-all duration-300">
                {feature.icon}
              </div>
              
              {/* عنوان */}
              <h3 className="text-xl font-bold text-white mb-4">
                {feature.title}
              </h3>
              
              {/* توضیحات */}
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}