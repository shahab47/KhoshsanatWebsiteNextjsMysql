'use client';

import React from 'react';
import { ArrowLeft, Building2, MapPin, ArrowUpRight } from 'lucide-react';

// داده‌های تستی (Mock) برای نمایش ظاهر سایت. 
// بعداً می‌توانید این‌ها را از دیتابیس دریافت کنید.
const mockProjects = [
  {
    id: 1,
    title: 'توسعه خط تولید فولاد مبارکه',
    category: 'صنعتی و کارخانه‌جات',
    location: 'اصفهان',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop',
    size: 'large', // کارت بزرگ (مربع بزرگ)
  },
  {
    id: 2,
    title: 'پالایشگاه نفت ستاره خلیج فارس',
    category: 'پتروشیمی',
    location: 'بندرعباس',
    imageUrl: 'https://images.unsplash.com/photo-1615579122137-b67db9e8d752?q=80&w=1000&auto=format&fit=crop',
    size: 'wide', // مستطیل افقی
  },
  {
    id: 3,
    title: 'اسکلت فلزی برج میلاد',
    category: 'عمران و ساختمان',
    location: 'تهران',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop',
    size: 'tall', // مستطیل عمودی
  },
  {
    id: 4,
    title: 'نیروگاه سیکل ترکیبی',
    category: 'نیروگاهی',
    location: 'یزد',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1000&auto=format&fit=crop',
    size: 'normal', // کارت معمولی (مربع کوچک)
  },
  {
    id: 5,
    title: 'سوله صنعتی فاز دو',
    category: 'سوله‌سازی',
    location: 'شهرک صنعتی شمس‌آباد',
    imageUrl: 'https://images.unsplash.com/photo-1565610222536-ea43fc951918?q=80&w=1000&auto=format&fit=crop',
    size: 'normal',
  },
  {
    id: 6,
    title: 'پایانه صادراتی',
    category: 'زیرساخت',
    location: 'بندر امام',
    imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1000&auto=format&fit=crop',
    size: 'wide',
  },
];

export default function ProjectsPage() {
  
  // تابع کمکی برای تعیین ابعاد کاشی‌ها (Bento Grid)
  const getGridSpan = (size: string) => {
    switch (size) {
      case 'large':
        return 'col-span-1 md:col-span-2 row-span-1 md:row-span-2';
      case 'wide':
        return 'col-span-1 md:col-span-2 row-span-1';
      case 'tall':
        return 'col-span-1 row-span-1 md:row-span-2';
      default: // normal
        return 'col-span-1 row-span-1';
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 text-white" dir="rtl">
      
      {/* هدر معرفی صفحه */}
      <div className="bg-brand-dark/40 backdrop-blur-md border-b border-white/10 py-20 px-6 relative overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 text-brand-blue mb-4 font-bold">
            <Building2 size={24} />
            <span>افتخارات خوش‌صنعت</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight">
            پروژه‌های برجسته
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed">
            ما مفتخریم که در طراحی، تولید و تامین تجهیزات بزرگترین پروژه‌های صنعتی، عمرانی و پتروشیمی کشور نقشی کلیدی ایفا کرده‌ایم. در اینجا نمایی از همکاری‌های ما را مشاهده می‌کنید.
          </p>
        </div>
      </div>

      {/* شبکه کاشی‌کاری پروژه‌ها (Bento Grid) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
          
          {mockProjects.map((project) => (
            <a 
              key={project.id}
              href={`/projects/${project.id}`} 
              className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-brand-blue/20 transition-all duration-500 block ${getGridSpan(project.size)}`}
            >
              {/* تصویر پس‌زمینه کارت */}
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>

              {/* لایه تاریک‌کننده (Gradient Overlay) - در حالت هاور تاریک‌تر می‌شود تا متن خواناتر شود */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/40 to-transparent transition-opacity duration-500 group-hover:from-brand-dark"></div>

              {/* محتوای روی کارت */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end transition-transform duration-500 ease-out translate-y-4 group-hover:translate-y-0">
                
                {/* تگ دسته‌بندی */}
                <div className="mb-auto flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  <span className="bg-brand-blue/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    {project.category}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                    <ArrowUpRight size={20} className="transform transition-transform group-hover:rotate-45" />
                  </div>
                </div>

                {/* عنوان و مکان پروژه */}
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
                    {project.title}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-gray-300 text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    <MapPin size={14} className="text-brand-blue" />
                    <span>{project.location}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
          
        </div>
        
        {/* دکمه مشاهده بیشتر یا دعوت به همکاری */}
        <div className="mt-16 text-center">
           <a href="/#contact" className="inline-flex items-center gap-2 bg-white/5 hover:bg-brand-blue border border-white/10 hover:border-brand-blue text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300">
             شما هم پروژه جدیدی دارید؟ تماس با ما
             <ArrowLeft size={20} />
           </a>
        </div>
      </div>

    </div>
  );
}