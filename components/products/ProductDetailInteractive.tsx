// components/products/ProductDetailInteractive.tsx
'use client';

import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { sanitizeHtml } from '@/lib/seo';
import { useModal } from '@/app/contexts/ModalContext';

interface ProductDetailInteractiveProps {
  product: {
    id: number;
    title: string;
    slug: string;
    shortDesc: string | null;
    description: string;
    imageUrl: string;
    catalogUrl: string | null;
  };
  galleryImages: string[];
}

export default function ProductDetailInteractive({
  product,
  galleryImages,
}: ProductDetailInteractiveProps) {
  const { showAlert } = useModal();
  const [mainImage, setMainImage] = useState<string>(product.imageUrl);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);

  const handleDownloadSpecs = async () => {
    setPdfLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { toJpeg } = await import('html-to-image');

      const element = document.getElementById('product-specs-template');
      const container = document.getElementById('pdf-hidden-container');
      if (!element || !container) throw new Error('قالب PDF یافت نشد.');

      container.style.width = '800px';
      container.style.height = 'auto';
      container.style.overflow = 'visible';

      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      container.style.width = '0px';
      container.style.height = '0px';
      container.style.overflow = 'hidden';

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('رندر تصویر با شکست مواجه شد.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`مشخصات-${product.title.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('خطا در تولید PDF:', error);
      showAlert('خطا در تولید برگه مشخصات محصول. لطفاً مجدداً تلاش کنید.', 'خطا', 'error');
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

  return (
    <>
      {/* سمت راست: تصاویر گالری و تصویر اصلی */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className="w-full aspect-[4/3] rounded-[8px] overflow-hidden bg-gray-100 border border-gray-200">
          <img
            src={mainImage}
            alt={`تصویر اصلی محصول ${product.title}`}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        </div>

        {/* تصاویر بندانگشتی (گالری) */}
        {galleryImages.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setMainImage(product.imageUrl)}
              className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[8px] overflow-hidden border-2 transition-all cursor-pointer ${
                mainImage === product.imageUrl ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
              }`}
              aria-label="تصویر اصلی"
            >
              <img
                src={product.imageUrl}
                className="w-full h-full object-cover"
                alt="تصویر اصلی محصول"
              />
            </button>
            {galleryImages.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(imgUrl)}
                className={`w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[8px] overflow-hidden border-2 transition-all cursor-pointer ${
                  mainImage === imgUrl ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                }`}
                aria-label={`تصویر ${idx + 1} محصول`}
              >
                <img
                  src={imgUrl}
                  className="w-full h-full object-cover"
                  alt={`تصویر گالری ${idx + 1} ${product.title}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* دکمه‌های دانلود کاتالوگ یا ساخت PDF */}
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
            className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-blue-50 text-blue-700 border border-blue-200 px-8 py-4 rounded-full text-lg font-bold shadow-sm hover:bg-blue-600 hover:text-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {pdfLoading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
            {pdfLoading ? 'در حال آماده‌سازی فایل...' : 'دانلود برگه مشخصات محصول (PDF)'}
          </button>
        )}
      </div>

      {/* قالب مخفی تولید PDF */}
      <div
        id="pdf-hidden-container"
        className="fixed top-0 -left-[9999px] w-0 h-0 overflow-hidden z-[-50]"
      >
        <div
          id="product-specs-template"
          className="w-[800px] p-12 font-[Vazir,'vazirmatn',sans-serif]"
          dir="rtl"
          style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
        >
          <div className="flex items-start gap-6 pb-8 mb-8" style={{ borderBottom: '2px solid #2563eb' }}>
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-48 h-48 object-cover rounded-xl"
              style={{ border: '1px solid #e5e7eb' }}
              crossOrigin="anonymous"
            />
            <div className="flex-1 pt-2">
              <div className="text-3xl font-black mb-4 leading-tight" style={{ color: '#111827' }}>
                {product.title}
              </div>
              <p className="text-lg leading-relaxed text-justify" style={{ color: '#4b5563' }}>
                {product.shortDesc}
              </p>
            </div>
          </div>

          <div className="mb-12">
            <div className="text-2xl font-bold mb-4 pb-2 inline-block" style={{ color: '#1f2937', borderBottom: '2px solid #f3f4f6' }}>
              مشخصات کامل
            </div>
            <div
              className="pdf-desc-content leading-loose text-justify [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-2"
              style={{ color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
            />
          </div>

          <div className="pt-6 text-center font-bold text-sm rounded-lg p-4" style={{ borderTop: '2px solid #f3f4f6', backgroundColor: '#f9fafb', color: '#6b7280' }}>
            تولید شده توسط وب‌سایت رسمی شرکت خوش‌صنعت پایدار | اتصالات مدرن، سازه‌های ماندگار
          </div>
        </div>
      </div>
    </>
  );
}
