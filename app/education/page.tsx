'use client';

import React, { useState } from 'react';
import { BookOpen, Clock, Calendar, ChevronLeft, Search, GraduationCap } from 'lucide-react';

// داده‌های تستی (Mock) مقالات آموزشی
const mockArticles = [
  {
    id: 1,
    slug: 'industrial-welding-principles',
    title: 'اصول و استانداردهای جوشکاری صنعتی در سازه‌های فولادی',
    excerpt: 'در این مقاله به بررسی جامع روش‌های نوین جوشکاری، استانداردهای بین‌المللی و نکات ایمنی در ساخت سوله‌ها و سازه‌های سنگین می‌پردازیم.',
    category: 'تکنولوژی ساخت',
    date: '۲۴ اردیبهشت ۱۴۰۳',
    readTime: '۸ دقیقه',
    imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 2,
    slug: 'steel-alloys-guide',
    title: 'راهنمای جامع شناخت آلیاژهای فولادی و کاربرد آن‌ها',
    excerpt: 'آلیاژهای مختلف فولاد چه تفاوت‌هایی با هم دارند؟ چگونه بهترین متریال را برای پروژه صنعتی خود انتخاب کنیم؟',
    category: 'مواد و متالورژی',
    date: '۱۲ خرداد ۱۴۰۳',
    readTime: '۱۲ دقیقه',
    imageUrl: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 3,
    slug: 'preventive-maintenance',
    title: 'اهمیت نگهداری و تعمیرات پیشگیرانه (PM) در کارخانجات',
    excerpt: 'با پیاده‌سازی سیستم‌های نگهداری پیشگیرانه، هزینه‌های استهلاک تجهیزات صنعتی خود را تا ۴۰ درصد کاهش دهید.',
    category: 'مدیریت صنعتی',
    date: '۵ تیر ۱۴۰۳',
    readTime: '۶ دقیقه',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 4,
    slug: 'cnc-machining-future',
    title: 'آینده ماشین‌کاری CNC و هوش مصنوعی در تولید قطعات',
    excerpt: 'تلفیق دستگاه‌های CNC با هوش مصنوعی چگونه دقت تولید قطعات حساس را افزایش و زمان تولید را کاهش می‌دهد؟',
    category: 'ماشین‌کاری پیشرفته',
    date: '۱۸ مرداد ۱۴۰۳',
    readTime: '۱۰ دقیقه',
    imageUrl: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=1000&auto=format&fit=crop',
  },
];

export default function EducationPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = mockArticles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent pb-20 text-white" dir="rtl">
      
      {/* هدر صفحه */}
      <div className="bg-brand-dark/40 backdrop-blur-md border-b border-white/10 py-20 px-6 relative overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-3 text-brand-blue mb-4 font-bold bg-brand-blue/10 px-4 py-2 rounded-full border border-brand-blue/20">
            <GraduationCap size={24} />
            <span>آکادمی خوش‌صنعت</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight">
            دانش‌نامه و مقالات آموزشی
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            به‌روزترین مقالات تخصصی، آموزش‌های فنی و استانداردهای مهندسی در حوزه صنعت، فولاد و ماشین‌سازی را در این بخش مطالعه کنید.
          </p>

          {/* باکس جستجو */}
          <div className="max-w-xl mx-auto mt-10 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="جستجو در مقالات (مثلاً: فولاد، جوشکاری...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all text-white placeholder-gray-500 shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* لیست مقالات */}
      <div className="max-w-7xl mx-auto px-6 mt-16">
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <a 
                key={article.id} 
                href={`/education/${article.slug}`}
                className="group flex flex-col bg-white/5 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 shadow-sm hover:shadow-2xl hover:shadow-brand-blue/10 hover:border-brand-blue/40 transition-all duration-500"
              >
                {/* تصویر مقاله */}
                <div className="relative aspect-video overflow-hidden bg-black/20">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 bg-brand-blue/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    {article.category}
                  </div>
                </div>

                {/* محتوای کارت */}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-brand-blue transition-colors duration-300">
                    {article.title}
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                    {article.excerpt}
                  </p>

                  <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-brand-blue" />
                        <span>{article.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-brand-blue" />
                        <span>{article.readTime} مطالعه</span>
                      </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                      <ChevronLeft size={16} />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            <BookOpen size={64} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">مقاله‌ای یافت نشد!</h3>
            <p className="text-gray-400">با کلمه جستجو شده، آموزشی در پایگاه داده وجود ندارد.</p>
          </div>
        )}
      </div>

    </div>
  );
}