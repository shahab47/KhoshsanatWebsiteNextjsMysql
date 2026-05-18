'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, ChevronLeft, ChevronRight, FileText, Loader2, Package, Image as ImageIcon } from 'lucide-react';

// ==========================================
// 1. تعریف اینترفیس‌های تایپ‌اسکریپت
// ==========================================
interface Product {
  id: number;
  title: string;
  slug: string;
  shortDesc: string | null;
  description: string;
  imageUrl: string;
  gallery: string | string[] | null;
  subcategoryId: number;
  catalogUrl: string | null;
}

export default function SingleProductPage() {
  const params = useParams();
  
  // استخراج هوشمند پارامتر تا اگر پوشه [id] یا [slug] بود، برنامه کرش نکند
  const identifier = params ? (params.id || params.slug || Object.values(params)[0]) as string : null;
  
  // ==========================================
  // 2. State ها
  // ==========================================
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mainImage, setMainImage] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);

  // ==========================================
  // 3. دریافت اطلاعات محصول
  // ==========================================
  useEffect(() => {
    // اگر پارامتر هنوز از URL خوانده نشده است، متوقف بمان
    if (!identifier) return;

    const fetchProductData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${identifier}`);
        if (!res.ok) throw new Error('محصول یافت نشد');
        
        const data: Product = await res.json();
        setProduct(data);
        setMainImage(data.imageUrl);

        // پردازش گالری تصاویر
        let parsedGallery: string[] = [];
        if (typeof data.gallery === 'string') {
          try {
            parsedGallery = JSON.parse(data.gallery);
          } catch (e) {
            console.error("خطا در پارس گالری");
          }
        } else if (Array.isArray(data.gallery)) {
          parsedGallery = data.gallery;
        }
        setGalleryImages(parsedGallery);

      } catch (error) {
        console.error("خطا در دریافت اطلاعات محصول:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [identifier]);

  // ==========================================
  // 4. تولید PDF مشخصات با jspdf و html-to-image
  // ==========================================
  const handleDownloadSpecs = async () => {
    setPdfLoading(true);
    try {
      // ایمپورت داینامیک برای جلوگیری از مشکلات SSR
      const { jsPDF } = await import('jspdf');
      const { toJpeg } = await import('html-to-image');

      const element = document.getElementById('product-specs-template');
      const container = document.getElementById('pdf-hidden-container');
      if (!element || !container) throw new Error('قالب PDF یافت نشد.');

      // 1. عنصر والد را موقتاً از حالت سایز صفر خارج می‌کنیم اما بیرون از صفحه نگه می‌داریم
      container.style.width = '800px';
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      
      // یک تاخیر کوتاه برای اطمینان از اعمال تغییرات DOM
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // گرفتن عکس با استفاده از فرمت Jpeg (با کیفیت ۹۵ درصد برای حفظ وضوح)
      const dataUrl = await toJpeg(element, { 
        quality: 0.95,
        pixelRatio: 2,           // کیفیت بالا
        backgroundColor: '#ffffff',
      });
      
      // 2. مجدداً عنصر والد را کاملاً می‌بندیم تا اسکرول صفحه به هم نریزد
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.overflow = 'hidden';

      // بررسی صحت تصویر رندر شده
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('رندر تصویر با شکست مواجه شد. (خروجی خالی)');
      }

      const pdf = new jsPDF('p', 'mm', 'a4'); // عمودی، میلی‌متر، A4
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // محاسبه ارتفاع متناسب با ابعاد واقعی المان
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      // استفاده از فرمت JPEG در ثبت تصویر در PDF
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`مشخصات-${product?.title.replace(/\s+/g, '-') || 'محصول'}.pdf`);

    } catch (error) {
      console.error('خطا در تولید PDF:', error);
      alert('خطا در تولید برگه مشخصات محصول. لطفاً مجدداً تلاش کنید.');
      
      // بازگرداندن به حالت ایزوله در صورت خطا
      const container = document.getElementById('pdf-hidden-container');
      if (container) {
        container.style.width = '0px';
        container.style.height = '0px';
        container.style.overflow = 'hidden';
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // ==========================================
  // 5. رابط کاربری (UI)
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center font-[Vazir,'vazirmatn',sans-serif]">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-bold">در حال دریافت اطلاعات محصول...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center font-[Vazir,'vazirmatn',sans-serif]">
        <Package size={64} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 font-[Yekan,'B_Yekan',sans-serif]">محصول مورد نظر یافت نشد.</h2>
        <a href="/products" className="mt-6 text-blue-600 font-bold hover:underline">بازگشت به فروشگاه</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 font-[Vazir,'vazirmatn',sans-serif] overflow-x-hidden" dir="rtl">
      
      {/* 1. Breadcrumb (نوار مسیر) */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronLeft size={16} />
          <a href="/products" className="hover:text-blue-600 transition">محصولات ما</a>
          <ChevronLeft size={16} />
          <span className="text-gray-800 font-bold">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 md:mt-12">
        
        {/* 2. بخش اصلی معرفی (تصاویر و مشخصات کوتاه) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-white p-6 md:p-8 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100">
          
          {/* سمت راست: تصاویر گالری */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {/* تصویر اصلی */}
            <div className="w-full aspect-[4/3] rounded-[8px] overflow-hidden bg-gray-100 border border-gray-200">
              <img 
                src={mainImage} 
                alt={product.title} 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" 
              />
            </div>
            
            {/* تصاویر بندانگشتی (گالری) */}
            {galleryImages.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                <button 
                  onClick={() => setMainImage(product.imageUrl)} 
                  className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[8px] overflow-hidden border-2 transition-all ${mainImage === product.imageUrl ? 'border-blue-600' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={product.imageUrl} className="w-full h-full object-cover" alt="تصویر اصلی" />
                </button>
                {galleryImages.map((imgUrl, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setMainImage(imgUrl)} 
                    className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[8px] overflow-hidden border-2 transition-all ${mainImage === imgUrl ? 'border-blue-600' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <img src={imgUrl} className="w-full h-full object-cover" alt={`تصویر گالری ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* سمت چپ: اطلاعات و دکمه دانلود */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 font-[Yekan,'B_Yekan',sans-serif] leading-snug">
              {product.title}
            </h1>
            <p className="text-[16px] md:text-lg text-gray-600 mb-8 leading-relaxed">
              {product.shortDesc}
            </p>

            {/* بخش دکمه دانلود (کاتالوگ یا PDF ساز) */}
            <div className="mt-auto pt-8 border-t border-gray-100">
              {product.catalogUrl ? (
                <a 
                  href={product.catalogUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 hover:shadow-[0_6px_16px_rgba(37,99,235,0.3)] transition-all duration-300"
                >
                  <Download size={24} />
                  دانلود کاتالوگ محصول
                </a>
              ) : (
                <button 
                  onClick={handleDownloadSpecs} 
                  disabled={pdfLoading} 
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-blue-50 text-blue-700 border border-blue-200 px-8 py-4 rounded-full text-lg font-bold shadow-sm hover:bg-blue-600 hover:text-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {pdfLoading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                  {pdfLoading ? 'در حال آماده‌سازی...' : 'دانلود برگه مشخصات محصول'}
                </button>
              )}
            </div>
          </div>

        </div>
        
        {/* 3. توضیحات تکمیلی (ویرایشگر متنی HTML) */}
        <div className="mt-8 bg-white p-6 md:p-10 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 font-[Yekan,'B_Yekan',sans-serif] border-b border-gray-100 pb-4">
            توضیحات تکمیلی
          </h2>
          {/* استایل‌های اختصاصی برای محتوای HTML دریافتی از HitmanTextEditor */}
          <div 
            className="text-gray-600 leading-loose text-justify [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4" 
            dangerouslySetInnerHTML={{ __html: product.description || '' }} 
          />
        </div>

      </div>

      {/* ========================================== */}
      {/* 6. قالب مخفی تولید PDF (Hidden Template) */}
      {/* 🟢 کانتینر با سایز صفر، ایزوله شده، بدون ایجاد اسکرول اضافی */}
      {/* ========================================== */}
      <div 
        id="pdf-hidden-container"
        className="fixed top-0 -left-[9999px] w-0 h-0 overflow-hidden z-[-50]"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          #product-specs-template .pdf-desc-content h2 { color: #1f2937 !important; }
        `}} />
        <div 
          id="product-specs-template" 
          className="w-[800px] p-12 font-[Vazir,'vazirmatn',sans-serif]" 
          dir="rtl"
          style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
        >
          
          {/* هدر PDF */}
          <div className="flex items-start gap-6 pb-8 mb-8" style={{ borderBottom: '2px solid #2563eb' }}>
            <img 
              src={product.imageUrl} 
              alt="تصویر اصلی" 
              className="w-48 h-48 object-cover rounded-xl" 
              style={{ border: '1px solid #e5e7eb' }}
              crossOrigin="anonymous" 
            />
            <div className="flex-1 pt-2">
              <h1 className="text-3xl font-black mb-4 font-[Yekan,'B_Yekan',sans-serif] leading-tight" style={{ color: '#111827' }}>
                {product.title}
              </h1>
              <p className="text-lg leading-relaxed text-justify" style={{ color: '#4b5563' }}>
                {product.shortDesc}
              </p>
            </div>
          </div>
          
          {/* محتوای متنی PDF */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 font-[Yekan,'B_Yekan',sans-serif] pb-2 inline-block" style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6' }}>
              مشخصات کامل
            </h2>
            <div 
              className="pdf-desc-content leading-loose text-justify [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-2" 
              style={{ color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: product.description || '' }} 
            />
          </div>
          
          {/* فوتر PDF */}
          <div className="pt-6 text-center font-bold text-sm rounded-lg p-4" style={{ borderTop: '2px solid #f3f4f6', backgroundColor: '#f9fafb', color: '#6b7280' }}>
            تولید شده توسط وب‌سایت رسمی خوش‌صنعت | اتصالات مدرن، سازه‌های ماندگار
          </div>
        </div>
      </div>

    </div>
  );
}