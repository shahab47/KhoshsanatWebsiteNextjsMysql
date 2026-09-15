// app/projects/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin, ArrowUpRight, LayoutGrid, ChevronRight } from 'lucide-react';
import db from '@/lib/db';
import { SITE_CONFIG, generateBreadcrumbSchema, getCanonicalUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

export const metadata: Metadata = {
  title: 'پروژه‌های برجسته و افتخارات | شرکت خوش‌صنعت پایدار',
  description: 'مشاهده و بررسی پروژه‌های عمرانی، ساختمانی، صنعتی، نیروگاهی و پتروشیمی اجرا شده توسط شرکت خوش‌صنعت پایدار با سازه‌ها و اتصالات پیش‌ساخته مدرن',
  alternates: {
    canonical: '/projects',
  },
  openGraph: {
    title: 'پروژه‌های برجسته شرکت خوش‌صنعت پایدار',
    description: 'آرشیو پروژه‌های بزرگ صنعتی و ساختمانی با قطعات و سازه‌های خوش‌صنعت پایدار',
    url: getCanonicalUrl('/projects'),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'پروژه‌های خوش‌صنعت پایدار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'پروژه‌های برجسته شرکت خوش‌صنعت پایدار',
    description: 'آرشیو پروژه‌های صنعتی و ساختمانی اجرا شده',
    images: ['/Logo.svg'],
  },
};

// تابع تعیین ابعاد کارت بر اساس سایز ذخیره شده در دیتابیس
function getGridSpan(size: string) {
  switch (size) {
    case 'large':
      return 'col-span-1 md:col-span-2 row-span-1 md:row-span-2';
    case 'wide':
      return 'col-span-1 md:col-span-2 row-span-1';
    case 'tall':
      return 'col-span-1 row-span-1 md:row-span-2';
    default:
      return 'col-span-1 row-span-1';
  }
}

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'پروژه‌ها', path: '/projects' },
  ]);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'پروژه‌های برجسته شرکت خوش‌صنعت پایدار',
    description: 'مجموعه پروژه‌های مهندسی، صنعتی و ساختمانی اجرا شده توسط خوش‌صنعت پایدار',
    url: getCanonicalUrl('/projects'),
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: project.title,
      url: getCanonicalUrl(`/projects/${encodeURIComponent(project.slug)}`),
      image: project.imageUrl,
    })),
  };

  return (
    <main className="min-h-screen bg-ks-light-50 pb-20" dir="rtl">
      <JsonLd id="projects-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="projects-collection-schema" data={collectionSchema} />

      {/* Breadcrumb - نوار مسیر */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-ks-blue-500 transition-colors">
            خانه
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-bold">پروژه‌ها</span>
        </div>
      </div>

      {/* هدر معرفی صفحه */}
      <header className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-ks-blue-500 mb-3 font-bold">
            <Building2 size={24} />
            <span>افتخارات و سوابق اجرایی خوش‌صنعت</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 tracking-tight">
            پروژه‌های برجسته و صنعتی
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl leading-relaxed">
            ما مفتخریم که در طراحی، تولید و تامین تجهیزات بزرگترین پروژه‌های صنعتی، عمرانی و پتروشیمی کشور نقشی کلیدی ایفا کرده‌ایم.
          </p>
        </div>
      </header>

      {/* شبکه کاشی‌کاری پروژه‌ها */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${encodeURIComponent(project.slug)}`}
                className={`group relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:border-ks-blue-300 block focus:outline-none focus:ring-2 focus:ring-ks-blue-500 ${getGridSpan(
                  project.size
                )}`}
              >
                {/* تصویر پس‌زمینه کارت */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={project.imageUrl}
                    alt={`تصویر پروژه ${project.title}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* لایه گرادیانت */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-500"></div>

                {/* محتوای روی کارت */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end transition-transform duration-500 ease-out translate-y-2 group-hover:translate-y-0">
                  <div className="mb-auto flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <span className="bg-ks-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      {project.category || 'صنعتی'}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white hover:bg-ks-blue-500 hover:border-ks-blue-500 transition-colors">
                      <ArrowUpRight size={20} className="transform transition-transform group-hover:rotate-45" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                      {project.title}
                    </h2>

                    {project.location && (
                      <div className="flex items-center gap-1.5 text-gray-200 text-sm font-medium opacity-90 group-hover:opacity-100 transition-opacity">
                        <MapPin size={14} className="text-ks-blue-400" />
                        <span>{project.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <LayoutGrid size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">پروژه‌ای یافت نشد!</h2>
            <p className="text-gray-500">در حال حاضر هیچ پروژه فعالی در سیستم ثبت نشده است.</p>
          </div>
        )}

        {/* دکمه دعوت به همکاری */}
        <div className="mt-16 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-ks-blue-500 hover:bg-ks-blue-600 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ks-blue-500/50"
          >
            شما هم پروژه جدیدی دارید؟ تماس و مشاوره با ما
            <ArrowLeft size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}