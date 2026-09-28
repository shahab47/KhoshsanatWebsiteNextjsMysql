'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Layers, Shield, Wrench, CheckCircle2 } from 'lucide-react';

export interface Product {
  id: number;
  title: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  category?: string;
  description?: string;
}

interface CinematicProductsProps {
  initialProducts?: Product[];
}

export default function CinematicProducts({ initialProducts }: CinematicProductsProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>(() =>
    (initialProducts || []).filter((p) => p.isActive !== false)
  );
  const [loading, setLoading] = useState<boolean>(() => !initialProducts || initialProducts.length === 0);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;

    fetch('/api/products')
      .then((res) => res.json())
      .then((data: Product[] | { error?: string }) => {
        if ('error' in data && data.error) throw new Error(data.error);
        const active = (data as Product[]).filter((p) => p.isActive !== false);
        setProducts(active);
      })
      .catch((err) => console.warn('خطا در دریافت لیست محصولات:', err))
      .finally(() => setLoading(false));
  }, [initialProducts]);

  if (loading && products.length === 0) {
    return (
      <section className="py-20 bg-white text-center" dir="rtl">
        <p className="text-[#6C6C6E] font-mono text-sm animate-pulse">در حال فراخوانی کاتالوگ قطعات مهندسی...</p>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-white border-t border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش کاتالوگ مهندسی */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
              <span className="w-2 h-0.5 bg-[#2563EB]" />
              ENGINEERED COMPONENTS // CATALOG
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D3644] tracking-tight">
              قطعاتی برای اتصال دقیق
            </h2>
            <p className="text-sm md:text-base text-[#6C6C6E] mt-2 max-w-2xl">
              تولید قطعات استاندارد و سفارشی اتصالات فلزی نما، براکت‌های نگهدارنده مولیون، اتصالات اسپایدر و قطعات مهندسی با متریال فولاد ساختمانی و پوشش مقاوم ضدخوردگی.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] hover:text-[#1d4ed8] group self-start md:self-auto py-2"
          >
            <span>مشاهده کاتالوگ کامل</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* شبکه کاتالوگ قطعات مهندسی */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.slice(0, 8).map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : idx * 0.06 }}
              className="group bg-[#F5F7FA] rounded-2xl border border-gray-200 overflow-hidden hover:border-[#2563EB]/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* ظرف تصویر قطعه با پس‌زمینه تمیز مهندسی */}
                <div className="relative aspect-square w-full bg-white overflow-hidden p-6 flex items-center justify-center border-b border-gray-200">
                  <div className="absolute inset-0 engineering-grid-light opacity-60" />
                  
                  {/* برچسب فنی بالای کارت */}
                  <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-[#F5F7FA] border border-gray-200 text-[10px] font-mono text-[#6C6C6E]" dir="ltr">
                    PART #{product.id.toString().padStart(3, '0')}
                  </div>

                  <Image
                    src={product.imageUrl || '/images/cinematic/scene-02-bracket.jpg'}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* مشخصات قطعه */}
                <div className="p-5">
                  <div className="text-[11px] font-mono text-[#2563EB] mb-1 uppercase" dir="ltr">
                    CURTAIN WALL CONNECTION
                  </div>
                  <h3 className="text-base font-bold text-[#2D3644] group-hover:text-[#2563EB] transition-colors line-clamp-1 mb-2">
                    {product.title}
                  </h3>
                  <p className="text-xs text-[#6C6C6E] line-clamp-2 leading-relaxed">
                    طراحی‌شده جهت انتقال بارهای سازه‌ای نما به اسکلت اصلی با قابلیت تنظیم و رگلاژ آسان در محل پروژه.
                  </p>
                </div>
              </div>

              {/* اکشن کارت و دکمه بررسی */}
              <div className="px-5 pb-5 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#6C6C6E]" dir="ltr">
                  TOLERANCE: ±0.5mm
                </span>
                <Link
                  href={`/products/${product.slug}`}
                  className="text-xs font-bold text-[#2563EB] hover:text-[#1d4ed8] inline-flex items-center gap-1 group/btn"
                >
                  <span>مشاهده جزئیات</span>
                  <ArrowLeft size={13} className="transition-transform group-hover/btn:-translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* نوار اطلاعات متریال و استاندارد در زیر محصولات */}
        <div className="mt-12 p-6 rounded-2xl bg-[#F5F7FA] border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white text-[#2563EB] border border-gray-200 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#2D3644]">تطابق کامل با شاپ‌دراوینگ</h4>
              <p className="text-xs text-[#6C6C6E] mt-1 leading-relaxed">ساخت طبق مدل سه‌بعدی و نقشه‌های اجرایی نما بدون انحراف زاویه و موقعیت سوراخ‌ها.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white text-[#2563EB] border border-gray-200 shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#2D3644]">پوشش مقاوم در برابر خوردگی</h4>
              <p className="text-xs text-[#6C6C6E] mt-1 leading-relaxed">ارائه قطعات با پوشش گالوانیزه گرم و رنگ اپوکسی صنعتی طبق الزامات پروژه.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white text-[#2563EB] border border-gray-200 shrink-0">
              <Wrench size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#2D3644]">نصب و رگلاژ سریع کارگاهی</h4>
              <p className="text-xs text-[#6C6C6E] mt-1 leading-relaxed">سوراخ‌های لوبیایی دقیق برای جبران خطاهای احتمالی اسکلت بتنی و سازه اصلی.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
