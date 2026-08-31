import type { Metadata } from 'next';
import WhyUs from '@/components/sections/WhyUs';
import Footer from '@/components/layout/Footer';
import { SITE_CONFIG, generateBreadcrumbSchema, getCanonicalUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'درباره شرکت خوش‌صنعت پایدار | مهندسی و ساخت سازه‌های صنعتی',
  description: 'آشنایی با تاریخچه، تجهیزات پیشرفته CNC، ماموریت و استانداردهای کیفی شرکت مهندسی و صنعتی خوش‌صنعت پایدار در تولید اتصالات و سازه‌های فلزی مدرن',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'درباره شرکت خوش‌صنعت پایدار',
    description: 'معرفی تخصص‌ها، خط تولید CNC و خدمات مهندسی شرکت خوش‌صنعت پایدار',
    url: getCanonicalUrl('/about'),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'درباره خوش‌صنعت پایدار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'درباره شرکت خوش‌صنعت پایدار',
    description: 'معرفی تخصص‌ها و خدمات مهندسی خوش‌صنعت پایدار',
    images: ['/Logo.svg'],
  },
};

export default function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'درباره ما', path: '/about' },
  ]);

  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'درباره شرکت خوش‌صنعت پایدار',
    description: 'معرفی تاریخچه، تخصص‌ها و خدمات مهندسی و تولیدی شرکت خوش‌صنعت پایدار',
    url: getCanonicalUrl('/about'),
    mainEntity: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      legalName: SITE_CONFIG.legalName,
      url: SITE_CONFIG.siteUrl,
      telephone: SITE_CONFIG.contact.phone,
      email: SITE_CONFIG.contact.email,
    },
  };

  return (
    <main className="min-h-screen">
      <JsonLd id="about-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="about-page-schema" data={aboutPageSchema} />
      <WhyUs />
      <Footer />
    </main>
  );
}