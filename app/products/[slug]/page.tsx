'use client';

import React, { useState, useEffect, use } from 'react';
import { ChevronRight, CheckCircle, ShieldCheck, PhoneCall, Info, LayoutGrid } from 'lucide-react';

export default function SingleProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // استفاده از React.use برای باز کردن مقادیر داینامیک در Next.js 15
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // استیت برای مدیریت گالری تصاویر
  const [activeImage, setActiveImage] = useState<string>('');
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    // گرفتن تمام محصولات و پیدا کردن محصول مورد نظر با اسلاگ
    const fetchProduct = async () => {
      try {
        const res = await fetch('/api/products');
        const allProducts = await res.json();
        
        const foundProduct = allProducts.find((p: any) => p.slug === slug && p.isActive);
        
        if (foundProduct) {
          setProduct(foundProduct);
          setActiveImage(foundProduct.imageUrl);
          
          // آماده‌سازی گالری
          let parsedGallery: string[] = [];
          if (typeof foundProduct.gallery === 'string') {
            try { parsedGallery = JSON.parse(foundProduct.gallery); } catch(e){}
          } else if (Array.isArray(foundProduct.gallery)) {
            parsedGallery = foundProduct.gallery;
          }
          
          // اضافه کردن تصویر اصلی به ابتدای گالری اگر نبود
          const finalGallery = [foundProduct.imageUrl, ...parsedGallery.filter((url: string) => url !== foundProduct.imageUrl)];
          setGallery(finalGallery);
        }
      } catch (err) {
        console.error("خطا در دریافت محصول:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <LayoutGrid size={80} className="text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">محصول مورد نظر یافت نشد!</h1>
        <p className="text-gray-500 mb-8 max-w-md">شاید این محصول از سیستم حذف شده باشد یا آدرس آن را اشتباه وارد کرده باشید.</p>
        <a href="/products" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
          بازگشت به فروشگاه
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      
      {/* Breadcrumb (مسیر راهنما) */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronRight size={16} />
          <a href="/products" className="hover:text-blue-600 transition">محصولات</a>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* بخش گالری تصاویر (راست) */}
            <div className="p-6 md:p-10 border-b md:border-b-0 md:border-l border-gray-100 bg-gray-50/50">
              {/* تصویر بزرگ */}
              <div className="aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm mb-4 relative flex items-center justify-center">
                <img 
                  src={activeImage} 
                  alt={product.title} 
                  className="max-w-full max-h-full object-contain p-4 transition-all duration-300"
                />
              </div>
              
              {/* تصاویر کوچک گالری */}
              {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {gallery.map((url, index) => (
                    <button 
                      key={index}
                      onClick={() => setActiveImage(url)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === url ? 'border-blue-600 shadow-md ring-2 ring-blue-100' : 'border-transparent bg-white hover:border-gray-300'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt={`Gallery ${index}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* بخش اطلاعات و توضیحات (چپ) */}
            <div className="p-6 md:p-10 flex flex-col">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                {product.title}
              </h1>
              
              {/* نشان‌ها */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                  <CheckCircle size={14} />
                  موجود و قابل سفارش
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">
                  <ShieldCheck size={14} />
                  تضمین کیفیت خوش‌صنعت
                </span>
              </div>

              {/* توضیح کوتاه */}
              {product.shortDesc && (
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Info size={16} className="text-gray-400" />
                    معرفی اجمالی:
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {product.shortDesc}
                  </p>
                </div>
              )}

              {/* توضیحات کامل */}
              <div className="mb-8 flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">مشخصات فنی و کامل</h3>
                {/* استفاده از whitespace-pre-line برای حفظ Enterهایی که کاربر در ادمین زده است */}
                <div className="text-gray-600 leading-loose text-sm whitespace-pre-line">
                  {product.description}
                </div>
              </div>

              {/* دکمه‌های اکشن (پایین صفحه چسبیده) */}
              <div className="pt-6 border-t border-gray-100 mt-auto flex flex-col sm:flex-row gap-4">
                <a 
                  href="/#contact" // لینک به فرم تماس با ما در صفحه اصلی
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-2xl font-bold transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <PhoneCall size={20} />
                  درخواست استعلام و سفارش
                </a>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-4 rounded-2xl font-bold transition">
                  دانلود کاتالوگ (PDF)
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}