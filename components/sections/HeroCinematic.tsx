'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Compass, Layers } from 'lucide-react';
import { Slide, SliderSettings } from './HeroSlider';

interface HeroCinematicProps {
  slides?: Slide[];
  settings?: SliderSettings;
}

export default function HeroCinematic({ slides, settings }: HeroCinematicProps) {
  const shouldReduceMotion = useReducedMotion();

  // تصویر سینمایی معماری نمای کرتین‌وال هیرو
  const heroImageSrc = '/images/cinematic/scene-00-hero.jpg';

  const scrollToNextSection = () => {
    const nextElem = document.getElementById('products-section');
    if (nextElem) {
      nextElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full h-[100dvh] min-h-[660px] flex items-center justify-center overflow-hidden bg-[#11151B]" dir="rtl">
      {/* لایه پس‌زمینه تصویر معماری هیرو — تضمین شفافیت و دیده‌شدن کامل نما */}
      <div className="absolute inset-0 z-0 select-none">
        <Image
          src={heroImageSrc}
          alt="نمای مدرن کرتین‌وال و مهندسی اتصالات خوش‌صنعت پایدار"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center scale-100 transition-transform duration-1000 ease-out will-change-transform"
        />

        {/* فیلتر گرادیان سینمایی ظریف — صرفاً جهت وضوح خوانایی تیترها، بدون تیره کردن کامل نما */}
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#11151B]/90 via-black/20 to-black/40 z-10" />
        <div className="absolute inset-0 engineering-grid-dark opacity-20 z-10 pointer-events-none" />
      </div>

      {/* خطوط و نشانگرهای فنی مهندسی (Technical Annotations) روی نما */}
      <div className="absolute inset-0 z-20 pointer-events-none max-w-7xl mx-auto px-6 hidden md:block">
        {/* نشانگر کرتین وال در بالای تصویر */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-[28%] left-[18%] flex items-center gap-3 text-white/80"
        >
          <div className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]" />
          <div className="w-16 h-[1px] bg-[#2563EB]/60" />
          <div className="text-[11px] font-mono tracking-widest uppercase bg-[#2D3644]/80 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10">
            CURTAIN WALL SYSTEM // AXIS 04
          </div>
        </motion.div>

        {/* نشانگر اتصال براکت سازه‌ای در میانه نما */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute top-[48%] right-[16%] flex items-center gap-3 text-white/80 flex-row-reverse"
        >
          <div className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]" />
          <div className="w-20 h-[1px] bg-[#2563EB]/60" />
          <div className="text-[11px] font-mono tracking-widest uppercase bg-[#2D3644]/80 backdrop-blur-xs px-2.5 py-1 rounded border border-white/10 text-left" dir="ltr">
            CUSTOM SUPPORT BRACKET // HFB-LH
          </div>
        </motion.div>
      </div>

      {/* محتوای متنی هیرو */}
      <div className="relative z-30 max-w-5xl mx-auto px-6 text-center mt-12 md:mt-16 flex flex-col items-center">
        
        {/* برچسب فنی انگلیسی بالا */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-mono tracking-widest uppercase mb-6"
          dir="ltr"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
          PRECISION IN EVERY CONNECTION
          <span className="text-white/40">|</span>
          <span className="text-xs font-sans text-gray-200">دقت در هر اتصال</span>
        </motion.div>

        {/* تیتر اصلی هیرو */}
        <motion.h1
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.15] mb-6 max-w-4xl"
        >
          مهندسی برای ساخت واقعی
        </motion.h1>

        {/* توضیح کوتاه هیرو */}
        <motion.p
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-base sm:text-lg md:text-xl text-gray-300 font-normal leading-relaxed max-w-2xl mb-10 text-center"
        >
          راهکارهای مهندسی و ساخت قطعات فلزی برای پروژه‌های معماری و عمرانی؛ از طراحی اتصالات شاپ‌دراوینگ تا ساخت دقیق براکت‌های کرتین‌وال
        </motion.p>

        {/* دکمه‌های فراخوان عملیات (CTA) */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/projects"
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2.5 border border-[#2563EB]/40 group"
          >
            <span>مشاهده پروژه‌ها</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto bg-[#2D3644]/90 hover:bg-[#2D3644] text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all border border-white/20 backdrop-blur-md inline-flex items-center justify-center gap-2 text-center"
          >
            <span>درخواست استعلام</span>
          </Link>
        </motion.div>

        {/* شاخص‌های اطلاعاتی صنعتی در پایین هیرو */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 text-right w-full max-w-2xl"
        >
          <div>
            <div className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-1" dir="ltr">FACADE SYSTEMS</div>
            <div className="text-sm font-bold text-white">اتصالات کرتین‌وال و نمای خشک</div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-1" dir="ltr">CNC FABRICATION</div>
            <div className="text-sm font-bold text-white">برش لیزر و ساخت دقیق قطعات</div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-[11px] font-mono text-[#60a5fa] uppercase tracking-wider mb-1" dir="ltr">MIG / TIG WELDING</div>
            <div className="text-sm font-bold text-white">جوشکاری تخصصی سازه‌ای</div>
          </div>
        </motion.div>
      </div>

      {/* دکمه اسکرول نرم به پایین */}
      <button
        onClick={scrollToNextSection}
        aria-label="اسکرول به بخش روایی مهندسی"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 p-2 text-white/70 hover:text-white transition-colors focus:outline-none flex flex-col items-center gap-1 group"
      >
        <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 group-hover:text-white transition-colors">
          DISCOVER
        </span>
        <ChevronDown size={18} className="animate-bounce" />
      </button>
    </section>
  );
}
