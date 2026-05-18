'use client';
// مسیر فایل: src/app/projects/page.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, MapPin, ArrowUpRight, LayoutGrid, Loader2, ChevronRight } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // دریافت اطلاعات پروژه‌ها از دیتابیس
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          // فقط پروژه‌هایی که تیک "فعال" دارند را نمایش بده
          setProjects(data.filter((p: any) => p.isActive));
        }
      } catch (err) {
        console.error("خطا در دریافت پروژه‌ها:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // تابع تعیین ابعاد کارت بر اساس سایز ذخیره شده در دیتابیس
  const getGridSpan = (size: string) => {
    switch (size) {
      case 'large': return 'col-span-1 md:col-span-2 row-span-1 md:row-span-2';
      case 'wide': return 'col-span-1 md:col-span-2 row-span-1';
      case 'tall': return 'col-span-1 row-span-1 md:row-span-2';
      default: return 'col-span-1 row-span-1';
    }
  };

  return (
    // پس‌زمینه روشن، بدون pt یا mt اضافی
    <div className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      
      {/* Breadcrumb - مشابه صفحه محصولات */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold">پروژه‌ها</span>
        </div>
      </div>

      {/* هدر معرفی صفحه (با رنگ‌بندی جدید) */}
      <div className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-blue-600 mb-4 font-bold">
            <Building2 size={24} />
            <span>افتخارات خوش‌صنعت</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 text-gray-900 tracking-tight">
            پروژه‌های برجسته
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl leading-relaxed">
            ما مفتخریم که در طراحی، تولید و تامین تجهیزات بزرگترین پروژه‌های صنعتی، عمرانی و پتروشیمی کشور نقشی کلیدی ایفا کرده‌ایم.
          </p>
        </div>
      </div>

      {/* شبکه کاشی‌کاری پروژه‌ها (Bento Grid) - با استایل روشن */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-blue-600">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold text-gray-600">در حال دریافت پروژه‌ها...</p>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
            {projects.map((project) => (
              <a 
                key={project.id}
                href={`/projects/${project.slug}`} 
                className={`group relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-blue-400 block ${getGridSpan(project.size)}`}
              >
                {/* تصویر پس‌زمینه کارت */}
                <div className="absolute inset-0 w-full h-full">
                  <img 
                    src={project.imageUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* لایه تاریک‌کننده (روشن‌تر از قبل) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity duration-500"></div>

                {/* محتوای روی کارت */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end transition-transform duration-500 ease-out translate-y-4 group-hover:translate-y-0">
                  <div className="mb-auto flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <span className="bg-blue-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                      {project.category || 'صنعتی'}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white hover:bg-blue-600 hover:border-blue-600 transition-colors">
                      <ArrowUpRight size={20} className="transform transition-transform group-hover:rotate-45" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                      {project.title}
                    </h3>
                    
                    {project.location && (
                      <div className="flex items-center gap-1.5 text-gray-200 text-sm font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                        <MapPin size={14} className="text-blue-400" />
                        <span>{project.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <LayoutGrid size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">پروژه‌ای یافت نشد!</h3>
            <p className="text-gray-500">در حال حاضر هیچ پروژه فعالی در سیستم ثبت نشده است.</p>
          </div>
        )}
        
        {/* دکمه دعوت به همکاری - مشابه دکمه‌های صفحه محصولات */}
        <div className="mt-16 text-center">
          <a 
            href="/contact" 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg"
          >
            شما هم پروژه جدیدی دارید؟ تماس با ما
            <ArrowLeft size={20} />
          </a>
        </div>
      </div>
    </div>
  );
}