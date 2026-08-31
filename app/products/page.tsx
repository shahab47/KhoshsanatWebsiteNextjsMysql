// app/products/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import db from '@/lib/db';
import ProductsExplorer from '@/components/products/ProductsExplorer';
import { SITE_CONFIG, generateBreadcrumbSchema, getCanonicalUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

export const metadata: Metadata = {
  title: 'محصولات و اتصالات مدرن صنعتی | کاتالوگ قطعات خوش‌صنعت پایدار',
  description: 'مشاهده و بررسی انواع اتصالات ساختمانی مدرن، قطعات صنعتی، سازه‌های پیش‌ساخته فلزی و دانلود کاتالوگ محصولات شرکت خوش‌صنعت پایدار',
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: 'محصولات و اتصالات مدرن صنعتی | خوش‌صنعت پایدار',
    description: 'آرشیو قطعات، اتصالات صنعتی و سازه‌های تولید شده با دستگاه‌های پیشرفته CNC',
    url: getCanonicalUrl('/products'),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'محصولات خوش‌صنعت پایدار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'محصولات و اتصالات مدرن صنعتی | خوش‌صنعت پایدار',
    description: 'آرشیو قطعات و تجهیزات صنعتی شرکت خوش‌صنعت پایدار',
    images: ['/Logo.svg'],
  },
};

export default async function ProductsPage() {
  const [categories, products, companyCatalogSetting] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    db.setting.findUnique({
      where: { key: 'company_catalog_url' },
    }),
  ]);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'محصولات ما', path: '/products' },
  ]);

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'محصولات و تولیدات صنعتی خوش‌صنعت پایدار',
    description: 'لیست محصولات و اتصالات صنعتی شرکت خوش‌صنعت پایدار',
    url: getCanonicalUrl('/products'),
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.title,
      url: getCanonicalUrl(`/products/${encodeURIComponent(product.slug)}`),
      image: product.imageUrl,
    })),
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] pb-20 font-[Vazir,'vazirmatn',sans-serif]" dir="rtl">
      <JsonLd id="products-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="products-itemlist-schema" data={itemListSchema} />

      {/* Breadcrumb نوار مسیر */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-blue-600 transition">
            خانه
          </Link>
          <ChevronLeft size={16} />
          <span className="text-gray-800 font-bold">محصولات ما</span>
        </div>
      </div>

      {/* هدر صفحه */}
      <header className="pt-16 pb-4 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
          محصولات و اتصالات مدرن صنعتی
        </h1>
        <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">
          اتصالات مدرن، سازه‌های ماندگار؛ تجربه‌ای از کیفیت و دوام در تولیدات خوش‌صنعت پایدار
        </p>
      </header>

      {/* کامپوننت تعاملی فیلتر و اسلایدر محصولات با دیتای اولیه سرور */}
      <ProductsExplorer
        categories={categories}
        products={products}
        companyCatalog={companyCatalogSetting?.value || null}
      />
    </main>
  );
}