'use client';
// مسیر فایل: src/app/education/[slug]/page.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, ChevronRight, User, Share2, Bookmark, FolderOpen, LayoutGrid } from 'lucide-react';

export default function ArticleDetailPage() {
  const params = useParams();
  const identifier = (params?.slug as string) || (params?.id as string);

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!identifier) return;

      try {
        const res = await fetch('/api/education');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const decodedIdentifier = decodeURIComponent(identifier);
          const found = data.find((a: any) => {
            const isSlugMatch = a.slug === identifier || a.slug === decodedIdentifier || encodeURIComponent(a.slug) === identifier;
            const isIdMatch = a.id.toString() === identifier || a.id.toString() === decodedIdentifier;
            return (isSlugMatch || isIdMatch) && a.isActive;
          });

          if (found) {
            setArticle(found);
          }
        }
      } catch (err) {
        console.error("خطا در دریافت مقاله:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [identifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center px-6 text-center">
        <LayoutGrid size={80} className="text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">مقاله‌ای یافت نشد!</h1>
        <p className="text-gray-500 mb-8 max-w-md">مقاله مورد نظر وجود ندارد یا حذف شده است.</p>
        <a href="/education" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
          بازگشت به آکادمی
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      
      {/* Breadcrumb - مشابه صفحات قبلی */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
            <a href="/" className="hover:text-blue-600 transition">خانه</a>
            <ChevronRight size={16} />
            <a href="/education" className="hover:text-blue-600 transition">آکادمی و مقالات</a>
            <ChevronRight size={16} />
            <span className="text-gray-800 font-bold truncate max-w-[200px] md:max-w-md">{article.title}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="اشتراک‌گذاری">
              <Share2 size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="ذخیره مقاله">
              <Bookmark size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* محتوای اصلی مقاله */}
      <article className="max-w-4xl mx-auto px-6 py-10">
        
        {/* کارت مقاله (سفید با حاشیه و سایه) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <header className="p-6 md:p-8 text-center border-b border-gray-100">
            <div className="inline-flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-blue-100">
              <FolderOpen size={16} />
              {article.category || 'عمومی'}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-6">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 bg-gray-50 inline-flex p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-600" />
                <span>نویسنده: <strong className="text-gray-800">{article.author || 'مدیریت سایت'}</strong></span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300 hidden md:block"></div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span>{new Date(article.createdAt).toLocaleDateString('fa-IR')}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300 hidden md:block"></div>
              {article.readTime && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-600" />
                  <span>زمان مطالعه: {article.readTime} دقیقه</span>
                </div>
              )}
            </div>
          </header>

          {article.imageUrl && (
            <div className="w-full aspect-video overflow-hidden bg-gray-100">
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* محتوای متنی با استایل مناسب برای تم روشن */}
            <div 
              className="prose prose-gray max-w-none text-gray-700 leading-loose prose-headings:text-gray-800 prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto prose-pre:bg-gray-100 prose-pre:text-gray-800"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          <div className="p-6 md:p-8 pt-0 border-t border-gray-100 mt-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-gray-800">برچسب‌ها:</span>
              <span className="bg-gray-100 border border-gray-200 px-3 py-1 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer">
                #{article.category || 'آموزش'}
              </span>
            </div>

            <div className="flex md:hidden items-center gap-3 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition">
                <Share2 size={18} /> اشتراک
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition">
                <Bookmark size={18} /> ذخیره
              </button>
            </div>
          </div>
        </div>

        {/* دکمه پایین صفحه (اختیاری) */}
        <div className="mt-8 text-center">
          <a href="/education" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold transition">
            <ChevronRight size={16} />
            بازگشت به لیست مقالات
          </a>
        </div>
      </article>

      {/* استایل‌های سفارشی برای محتوای prose در تم روشن */}
      <style dangerouslySetInnerHTML={{ __html: `
        .prose h2 {
          font-size: 1.8rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-right: 0.75rem;
          border-right: 4px solid #2563eb;
        }
        .prose h3 {
          font-size: 1.5rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .prose ul, .prose ol {
          background-color: #f9fafb;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }
        .prose blockquote {
          border-right: 4px solid #2563eb;
          margin: 1.5rem 0;
          font-style: italic;
          color: #4b5563;
          background-color: #f3f4f6;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem 0 0 0.75rem;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: right;
        }
        .prose th {
          background-color: #f3f4f6;
          color: #1f2937;
          font-weight: bold;
        }
        .prose code {
          background-color: #f1f5f9;
          color: #0f172a;
          padding: 0.2rem 0.4rem;
          border-radius: 0.375rem;
          font-size: 0.875em;
        }
        .prose pre {
          background-color: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 0.75rem;
          overflow-x: auto;
        }
        .prose pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }
      `}} />
    </div>
  );
}