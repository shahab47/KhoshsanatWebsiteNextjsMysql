// app/education/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, GraduationCap } from 'lucide-react';
import db from '@/lib/db';
import EducationListInteractive from '@/components/education/EducationListInteractive';
import { SITE_CONFIG, generateBreadcrumbSchema, getCanonicalUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

export const metadata: Metadata = {
  title: 'دانش‌نامه و مقالات آموزشی فنی و مهندسی | خوش‌صنعت پایدار',
  description: 'مجموعه مقالات تخصصی مهندسی، متالورژی، فولاد، جوشکاری صنعتی، استانداردهای ساخت سازه‌های فلزی و طراحی شاپ‌دراوینگ در آکادمی خوش‌صنعت پایدار',
  alternates: {
    canonical: '/education',
  },
  openGraph: {
    title: 'دانش‌نامه و مقالات آموزشی مهندسی | خوش‌صنعت پایدار',
    description: 'به‌روزترین آموزش‌ها و استانداردهای مهندسی و صنعتی',
    url: getCanonicalUrl('/education'),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'آکادمی خوش‌صنعت پایدار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'دانش‌نامه و مقالات آموزشی مهندسی | خوش‌صنعت پایدار',
    description: 'آموزش‌های تخصصی مهندسی و تولید صنعتی',
    images: ['/Logo.svg'],
  },
};

export default async function EducationPage() {
  const articles = await db.article.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'آکادمی و مقالات', path: '/education' },
  ]);

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'آکادمی و مقالات آموزشی مهندسی خوش‌صنعت پایدار',
    description: 'دانش‌نامه تخصصی مقالات فنی و مهندسی در حوزه اتصالات و سازه‌های فلزی',
    url: getCanonicalUrl('/education'),
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.siteUrl}/Logo.svg`,
      },
    },
    blogPost: articles.slice(0, 20).map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title,
      url: getCanonicalUrl(`/education/${encodeURIComponent(article.slug)}`),
      datePublished: new Date(article.createdAt).toISOString(),
      image: article.imageUrl,
    })),
  };

  return (
    <main className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      <JsonLd id="education-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="education-blog-schema" data={blogSchema} />

      {/* Breadcrumb - نوار مسیر */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-blue-600 transition">
            خانه
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold">آکادمی و مقالات</span>
        </div>
      </div>

      {/* هدر صفحه */}
      <header className="bg-white border-b border-gray-200 pt-12 pb-16 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center justify-center gap-3 text-blue-600 mb-4 font-bold bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <GraduationCap size={24} />
            <span>آکادمی و پایگاه دانش خوش‌صنعت</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 text-gray-900 tracking-tight">
            دانش‌نامه و مقالات تخصصی مهندسی
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            به‌روزترین مقالات تخصصی، آموزش‌های فنی و استانداردهای مهندسی در حوزه صنعت، فولاد و سازه‌های فلزی را در این بخش مطالعه فرمایید.
          </p>
        </div>
      </header>

      {/* لیست و جستجوی مقالات */}
      <section className="pt-2">
        <EducationListInteractive initialArticles={articles} />
      </section>
    </main>
  );
}