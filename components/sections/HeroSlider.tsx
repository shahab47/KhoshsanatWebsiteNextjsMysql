'use client'; // این یک کامپوننت سمت کلاینت است

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// ۱. تعریف دقیق ساختار دیتایی که از دیتابیس (فایل page.tsx) به اینجا فرستاده می‌شود
interface Slide {
  id: number;
  imageUrl: string;
  title: string | null;
}

// ۲. کامپوننت حالا اسلایدها (slides) را به عنوان ورودی دریافت می‌کند
export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // منطق تعویض خودکار اسلاید
  useEffect(() => {
    // اگر هیچ اسلایدی از دیتابیس نیامد یا فقط یک اسلاید بود، نیازی به حرکت نیست
    if (!slides || slides.length <= 1) return;

    // تنظیم یک اینتروال ۵ ثانیه‌ای
    const slideInterval = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => 
        prevIndex === slides.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    // پاک کردن اینتروال هنگام خارج شدن از صفحه
    return () => clearInterval(slideInterval);
  }, [slides]); // به روز رسانی وابستگی به لیست اسلایدها

  // اگر هیچ عکسی وجود نداشت، بخش هیرو را خالی نگذاریم
  if (!slides || slides.length === 0) return null;

  return (
    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
      
      {/* اسلایدر تصاویر پس‌زمینه */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-ks-dark/70 z-10"></div>
        
        {/* ۳. حالا به جای آرایه ثابت، روی اطلاعات دیتابیس حلقه می‌زنیم */}
        {slides.map((slide, index) => (
          <img 
            key={slide.id} // استفاده از ID دیتابیس به عنوان کلید یکتا
            src={slide.imageUrl} // خواندن آدرس عکس از دیتابیس
            alt={slide.title || `نمای کارگاه ${index + 1}`} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              index === currentSlideIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      
      {/* محتوای متنی روی اسلایدر */}
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
          قدرت مهندسی‌شده <br />
          برای <span className="text-ks-blue">ساخت دنیایی بهتر</span>
        </h1>
        
        <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-3xl font-light">
          تولید قطعات پیش‌ساخته فلزی، از طراحی و ایده‌پردازی تا تحویل و نصب دقیق در محل پروژه. 
          تضمین کیفیت و استحکام در هر قطعه.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="#catalog" 
            className="bg-ks-blue hover:bg-blue-600 text-white px-8 py-4 rounded-md font-bold text-lg flex items-center justify-center gap-2 transition-all group"
          >
            مشاهده کاتالوگ محصولات
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}