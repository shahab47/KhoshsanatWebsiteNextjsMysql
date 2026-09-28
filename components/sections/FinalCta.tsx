'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, PhoneCall, FileText, CheckCircle2 } from 'lucide-react';

export default function FinalCta() {
  return (
    <section className="relative py-24 md:py-32 bg-[#F5F7FA] border-t border-gray-200 overflow-hidden" dir="rtl">
      {/* گرید مهندسی پس‌زمینه */}
      <div className="absolute inset-0 engineering-grid-light opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
        
        {/* برچسب فنی انگلیسی */}
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-4 uppercase" dir="ltr">
          <span className="w-2 h-0.5 bg-[#2563EB]" />
          READY FOR THE NEXT CONNECTION
        </div>

        {/* تیتر فارسی بخش پایانی */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2D3644] tracking-tight leading-[1.2] mb-6 max-w-3xl">
          برای پروژه بعدی آماده‌ایم.
        </h2>

        {/* توضیح آرام و مطمئن */}
        <p className="text-base sm:text-lg md:text-xl text-[#6C6C6E] leading-relaxed max-w-2xl mb-10">
          برای دریافت مشاوره فنی، بررسی نقشه‌های شاپ‌دراوینگ یا استعلام زمان‌بندی و قیمت ساخت قطعات فلزی نما، با تیم مهندسی ما در ارتباط باشید.
        </p>

        {/* دکمه‌های اقدام */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-12">
          <Link
            href="/contact"
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-9 py-4 rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2.5 border border-[#2563EB]/40 group"
          >
            <FileText size={17} />
            <span>درخواست استعلام پروژه</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#2D3644] px-8 py-4 rounded-xl font-bold text-sm transition-all border border-gray-300 shadow-xs inline-flex items-center justify-center gap-2.5 text-center"
          >
            <PhoneCall size={17} className="text-[#2563EB]" />
            <span>تماس با ما</span>
          </Link>
        </div>

        {/* نشانه‌های آرامش و اطمینان مهندسی */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs font-mono text-[#6C6C6E] border-t border-gray-200/80 pt-8" dir="ltr">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#2563EB]" />
            <span>CAD / SHOP DRAWING REVIEW</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#2563EB]" />
            <span>SAMPLE MOCKUP FABRICATION</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#2563EB]" />
            <span>PRECISION DELIVERY TIMELINE</span>
          </div>
        </div>

      </div>
    </section>
  );
}
