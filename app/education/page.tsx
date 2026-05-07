'use client';
// مسیر فایل: src/app/education/page.tsx

import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Calendar, ChevronRight, Search, GraduationCap, Loader2, ChevronLeft } from 'lucide-react';

export default function EducationPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/education');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const activeArticles = data.filter((a: any) => a.isActive);
            setArticles(activeArticles);
          }
        }
      } catch (err) {
        console.error("خطا در دریافت مقالات:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(article => {
    const isTitleMatch = article.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const isCategoryMatch = article.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return isTitleMatch || isCategoryMatch;
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      
      {/* Breadcrumb - مشابه صفحات محصولات و پروژه‌ها */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold">آکادمی و مقالات</span>
        </div>
      </div>

      {/* هدر صفحه (با استیل روشن) */}
      <div className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-3 text-blue-600 mb-4 font-bold bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <GraduationCap size={24} />
            <span>آکادمی خوش‌صنعت</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 text-gray-900 tracking-tight">
            دانش‌نامه و مقالات آموزشی
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            به‌روزترین مقالات تخصصی، آموزش‌های فنی و استانداردهای مهندسی در حوزه صنعت، فولاد و ماشین‌سازی را در این بخش مطالعه کنید.
          </p>

          {/* باکس جستجو - مشابه جستجوی محصولات */}
          <div className="max-w-xl mx-auto mt-10 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="جستجو در مقالات (مثلاً: فولاد، جوشکاری...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* لیست مقالات */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-blue-600">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold text-gray-600">در حال دریافت مقالات...</p>
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <a 
                key={article.id} 
                href={`/education/${article.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300"
              >
                {/* تصویر مقاله */}
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    {article.category || 'عمومی'}
                  </div>
                </div>

                {/* محتوای کارت */}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                    {article.excerpt || 'بدون چکیده...'}
                  </p>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{new Date(article.createdAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                      {article.readTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-blue-600" />
                          <span>{article.readTime} دقیقه</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <ChevronLeft size={14} />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">مقاله‌ای یافت نشد!</h3>
            <p className="text-gray-500">با کلمه جستجو شده، آموزشی در پایگاه داده وجود ندارد.</p>
          </div>
        )}
      </div>
    </div>
  );
}