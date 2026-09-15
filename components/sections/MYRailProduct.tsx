'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  id: number;
  title: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
}

// الگوی دقیق و محاسبه‌شده برای ۱۸ محصول
// این الگو در یک دیوار ۳ ردیفه قرار می‌گیرد و دقیقا بدون هیچ حفره‌ای در هم چفت می‌شوند.
const bentoClasses = [
  // بلوک اول (تنوع ۱)
  "col-span-2 row-span-2", // 2x2: مربع بزرگ
  "col-span-2 row-span-1", // 2x1: مستطیل افقی (دراز)
  "col-span-1 row-span-2", // 1x2: مستطیل عمودی (ایستاده)
  "col-span-1 row-span-1", // 1x1: کاشی کوچک
  "col-span-1 row-span-1", // 1x1: کاشی کوچک
  "col-span-1 row-span-2", // 1x2: مستطیل عمودی (ایستاده)

  // بلوک دوم (تنوع ۲ - بندهای نامنظم)
  "col-span-1 row-span-1", // 1x1: کاشی کوچک
  "col-span-1 row-span-2", // 1x2: مستطیل عمودی 
  "col-span-2 row-span-1", // 2x1: مستطیل افقی
  "col-span-2 row-span-2", // 2x2: مربع بزرگ
  "col-span-1 row-span-2", // 1x2: مستطیل عمودی
  "col-span-1 row-span-1", // 1x1: کاشی کوچک

  // بلوک سوم (تنوع ۳ - بندهای نامنظم)
  "col-span-2 row-span-2", // 2x2: مربع بزرگ
  "col-span-2 row-span-1", // 2x1: مستطیل افقی
  "col-span-2 row-span-1", // 2x1: مستطیل افقی
  "col-span-2 row-span-1", // 2x1: مستطیل افقی
  "col-span-1 row-span-1", // 1x1: کاشی کوچک
  "col-span-1 row-span-1", // 1x1: کاشی کوچک
];

interface ProductsMarqueeProps {
  initialProducts?: Product[];
}

function prepare18Products(products: Product[]): Product[] {
  let active = products.filter((p) => p.isActive !== false);
  if (active.length === 0) return [];
  while (active.length < 18) {
    active = [...active, ...active];
  }
  return active.slice(0, 18);
}

export default function ProductsMarquee({ initialProducts }: ProductsMarqueeProps = {}) {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(() =>
    initialProducts && initialProducts.length > 0 ? prepare18Products(initialProducts) : []
  );
  const [loading, setLoading] = useState<boolean>(() => !initialProducts || initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;

    fetch('/api/products')
      .then((res) => res.json())
      .then((data: any[]) => {
        if ((data as any).error) throw new Error((data as any).error);
        setSelectedProducts(prepare18Products(data));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialProducts]);

  if (loading) return <p className="text-center py-20 text-gray-500 animate-pulse">در حال چینش پازل محصولات...</p>;
  if (error) return <p className="text-center text-red-500 py-20">خطا: {error}</p>;
  if (selectedProducts.length === 0) return null;

  const renderWallSegment = () => (
    <div className="bento-wall pr-3 md:pr-4 flex-shrink-0">
      {selectedProducts.map((product, index) => (
        <Link 
          key={`${product.id}-${index}`} 
          href={`/products/${product.slug}`}
          // کلاس‌های سایه کاملاً حذف شدند تا ظاهر تخت و یکدست باشد
          className={`relative block w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group transition-all duration-300 bg-gray-100 ${bentoClasses[index]}`}
        >
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

          <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 z-10" dir="rtl">
            <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1 drop-shadow-md group-hover:text-blue-400 transition-colors duration-300">
              {product.title}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <section className="relative py-16 overflow-hidden bg-transparent">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .bento-wall {
          display: grid;
          grid-template-rows: repeat(3, 130px);
          grid-auto-columns: 130px;
          grid-auto-flow: column dense;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .bento-wall {
            grid-template-rows: repeat(3, 200px);
            grid-auto-columns: 200px;
            gap: 16px;
          }
        }

        @keyframes marquee-ltr {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }

        .animate-marquee-ltr {
          animation: marquee-ltr 90s linear infinite;
        }

        .gpu-optimized {
          will-change: transform;
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}} />

      {/* هدر بخش */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10" dir="rtl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* سمت راست: لوگو و تیتر */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-shrink-0 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-sm">
              <img 
                src="/Logo.svg" 
                alt="لوگو خوش صنعت پایدار" 
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                گالری تولیدات <span className="text-ks-blue-400">خوش صنعت پایدار</span>
              </h2>
              <p className="text-sm md:text-base text-gray-400 mt-1 font-medium">
                آرشیوی از قطعات و تجهیزات صنعتی با بالاترین استانداردهای کیفیت
              </p>
            </div>
          </div>

          {/* سمت چپ: دکمه آرشیو */}
          <div className="flex-shrink-0 w-full md:w-auto flex justify-start md:justify-end">
            <Link 
              href="/products" 
              className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-ks-blue-500 hover:border-ks-blue-500 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-ks-blue-500/50"
            >
              مشاهده کامل محصولات
              <svg className="w-4 h-4 rtl:rotate-180 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>

        </div>
      </div>

      {/* باکس متحرک قطاری */}
      <div className="w-full flex overflow-hidden" dir="ltr">
        <div className="flex w-max animate-marquee-ltr hover:[animation-play-state:paused] active:[animation-play-state:paused] gpu-optimized pb-4">
          {renderWallSegment()}
          {renderWallSegment()}
        </div>
      </div>

    </section>
  );
}