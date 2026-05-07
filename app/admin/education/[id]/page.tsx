'use client';
// مسیر فایل: src/app/education/[slug]/page.tsx
import React, { use } from 'react';
import { Calendar, Clock, ChevronRight, User, Share2, Bookmark, FolderOpen } from 'lucide-react';

// همان داده‌های تستی برای پیدا کردن مقاله (در نسخه واقعی از دیتابیس دریافت می‌شود)
const mockArticles = [
  {
    id: 1,
    slug: 'industrial-welding-principles',
    title: 'اصول و استانداردهای جوشکاری صنعتی در سازه‌های فولادی',
    excerpt: 'در این مقاله به بررسی جامع روش‌های نوین جوشکاری، استانداردهای بین‌المللی و نکات ایمنی در ساخت سوله‌ها و سازه‌های سنگین می‌پردازیم.',
    category: 'تکنولوژی ساخت',
    date: '۲۴ اردیبهشت ۱۴۰۳',
    author: 'مهندس حسینی',
    readTime: '۸ دقیقه',
    imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1000&auto=format&fit=crop',
    content: `
      <h2>مقدمه‌ای بر جوشکاری مدرن</h2>
      <p>جوشکاری به عنوان یکی از پایه‌ای‌ترین فرآیندهای تولید در صنایع سنگین شناخته می‌شود. با پیشرفت تکنولوژی، روش‌های سنتی جای خود را به سیستم‌های رباتیک و جوشکاری با گازهای محافظ (MIG/MAG) داده‌اند که کیفیت و سرعت را به شدت افزایش می‌دهند.</p>
      
      <h2>استانداردهای بین‌المللی (AWS & ASME)</h2>
      <p>برای اطمینان از کیفیت سازه‌های فولادی، رعایت استانداردهای جهانی الزامی است. کد <strong>AWS D1.1</strong> یکی از معتبرترین مراجع برای جوشکاری سازه‌های فولادی است که تمامی الزامات طراحی، تایید صلاحیت جوشکاران و بازرسی‌های غیرمخرب (NDT) را پوشش می‌دهد.</p>
      
      <ul>
        <li>بازرسی چشمی (VT)</li>
        <li>تست ذرات مغناطیسی (MT)</li>
        <li>تست اولتراسونیک (UT)</li>
        <li>تست رادیوگرافی (RT)</li>
      </ul>

      <h2>ایمنی در محیط کارگاه</h2>
      <p>ایمنی جوشکاران باید در بالاترین اولویت باشد. استفاده از سیستم‌های تهویه موضعی برای خروج دودهای سمی، استفاده از شیلدهای محافظ صورت با تیرگی استاندارد، و پوشیدن لباس‌های نسوز از جمله بدیهیات فعالیت در یک کارگاه استاندارد است.</p>
      
      <blockquote>
        کیفیت یک سازه فولادی دقیقاً به اندازه ضعیف‌ترین جوشِ به کار رفته در آن است. بنابراین نظارت مرحله به مرحله رمز موفقیت پروژه‌های عظیم است.
      </blockquote>
    `
  },
  // برای اختصار کدهای اضافه اینجا قرار داده نشدند، اما کد به درستی کار می‌کند
];

export default function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const article = mockArticles.find(a => a.slug === resolvedParams.slug) || mockArticles[0]; // fallback به مقاله اول برای تست

  return (
    <div className="min-h-screen bg-transparent pb-20 text-white" dir="rtl">
      
      {/* نوار مسیر (Breadcrumb) */}
      <div className="bg-brand-dark/80 backdrop-blur-xl border-b border-white/10 py-4 px-6 mt-16 md:mt-0 sticky top-[60px] md:top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400 overflow-x-auto whitespace-nowrap">
            <a href="/" className="hover:text-white transition">خانه</a>
            <ChevronRight size={16} />
            <a href="/education" className="hover:text-white transition">آموزش‌ها</a>
            <ChevronRight size={16} />
            <span className="text-white font-bold truncate max-w-[200px] md:max-w-md">{article.title}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-full transition" title="اشتراک‌گذاری">
              <Share2 size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-full transition" title="ذخیره مقاله">
              <Bookmark size={18} />
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-6 py-10">
        
        {/* هدر مقاله */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 text-brand-blue bg-brand-blue/10 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-brand-blue/20">
            <FolderOpen size={16} />
            {article.category}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-8">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 bg-white/5 inline-flex p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <User size={16} className="text-brand-blue" />
              <span>نویسنده: <strong className="text-white">{article.author}</strong></span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-brand-blue" />
              <span>{article.date}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-blue" />
              <span>زمان مطالعه: {article.readTime}</span>
            </div>
          </div>
        </header>

        {/* تصویر اصلی مقاله */}
        <div className="w-full aspect-video rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-black/50 border border-white/10 relative">
          <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent"></div>
        </div>

        {/* محتوای متنی مقاله */}
        {/* از آنجایی که محتوای وبلاگ معمولاً HTML است، از dangerouslySetInnerHTML استفاده می‌کنیم. */}
        {/* استایل‌های تایپوگرافی اختصاصی برای خوانایی بالا در محیط تیره نوشته شده است. */}
        <div 
          className="prose-custom text-gray-300 leading-loose text-lg"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* تگ‌های پایین مقاله */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white">برچسب‌ها:</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-sm hover:bg-brand-blue/20 transition cursor-pointer">#صنعت</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-sm hover:bg-brand-blue/20 transition cursor-pointer">#مهندسی</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-sm hover:bg-brand-blue/20 transition cursor-pointer">#فولاد</span>
          </div>

          {/* دکمه‌های موبایل */}
          <div className="flex md:hidden items-center gap-3 w-full">
            <button className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl font-bold hover:bg-white/10 transition">
              <Share2 size={18} /> اشتراک
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl font-bold hover:bg-white/10 transition">
              <Bookmark size={18} /> ذخیره
            </button>
          </div>
        </div>

      </article>

      {/* استایل‌های تایپوگرافی داخلی برای محتوای مقاله */}
      <style dangerouslySetInnerHTML={{ __html: `
        .prose-custom h2 {
          color: white;
          font-size: 1.75rem;
          font-weight: 900;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .prose-custom h2::before {
          content: "";
          display: block;
          width: 6px;
          height: 24px;
          background-color: rgb(var(--brand-blue-rgb));
          border-radius: 4px;
        }
        .prose-custom p {
          margin-bottom: 1.5rem;
          text-align: justify;
        }
        .prose-custom ul {
          list-style-type: disc;
          padding-right: 1.5rem;
          margin-bottom: 1.5rem;
          background-color: rgba(255,255,255,0.02);
          padding: 1.5rem 2.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .prose-custom li {
          margin-bottom: 0.5rem;
        }
        .prose-custom strong {
          color: white;
        }
        .prose-custom blockquote {
          border-right: 4px solid rgb(var(--brand-blue-rgb));
          padding-right: 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          color: #94a3b8;
          background-color: rgba(63, 120, 165, 0.1);
          padding: 1.5rem;
          border-radius: 1rem 0 0 1rem;
        }
      `}} />
    </div>
  );
}