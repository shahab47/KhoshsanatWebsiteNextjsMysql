// app/contact/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ChevronRight } from 'lucide-react';
import db from '@/lib/db';
import ContactForm from '@/components/contact/ContactForm';
import { SITE_CONFIG, generateBreadcrumbSchema, getCanonicalUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'تماس با ما و استعلام قیمت | خوش‌صنعت پایدار',
  description: 'راه‌های ارتباط با شرکت مهندسی خوش‌صنعت پایدار، دریافت مشاوره فنی رایگان، استعلام قیمت قطعات و سازه‌های صنعتی و آدرس دفتر مرکزی',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'تماس با شرکت خوش‌صنعت پایدار | استعلام قیمت و مشاوره فنی',
    description: 'جهت دریافت استعلام قیمت، مشاوره تخصصی شاپ‌دراوینگ و سفارش ساخت قطعات صنعتی با ما در ارتباط باشید.',
    url: getCanonicalUrl('/contact'),
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: 'website',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'تماس با خوش‌صنعت پایدار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'تماس با خوش‌صنعت پایدار',
    description: 'دریافت مشاوره فنی و استعلام قیمت قطعات و اتصالات صنعتی',
    images: ['/Logo.svg'],
  },
};

export default async function ContactPage() {
  const settings = await db.setting.findMany({
    where: {
      key: { in: ['FOOTER_ADDRESS', 'FOOTER_PHONE', 'FOOTER_EMAIL'] },
    },
  });

  const texts = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const address = texts.FOOTER_ADDRESS || 'تهران، شهرک صنعتی، خیابان مهندسان، پلاک ۱۲';
  const phone = texts.FOOTER_PHONE || '+98 935 18 77 305';
  const email = texts.FOOTER_EMAIL || 'info@ks-engineering.com';

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'تماس با ما', path: '/contact' },
  ]);

  const contactPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'تماس با شرکت خوش‌صنعت پایدار',
    description: 'صفحه تماس و ثبت استعلام قیمت خدمات و محصولات شرکت خوش‌صنعت پایدار',
    url: getCanonicalUrl('/contact'),
    mainEntity: {
      '@type': 'LocalBusiness',
      name: SITE_CONFIG.name,
      image: `${SITE_CONFIG.siteUrl}/Logo.svg`,
      telephone: phone,
      email: email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: address,
        addressLocality: 'تهران',
        addressRegion: 'تهران',
        addressCountry: 'IR',
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'],
          opens: '08:00',
          closes: '17:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Thursday'],
          opens: '08:00',
          closes: '13:00',
        },
      ],
    },
  };

  return (
    <main className="min-h-screen bg-ks-light-50 pb-16" dir="rtl">
      <JsonLd id="contact-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="contact-page-schema" data={contactPageSchema} />

      {/* نوار مسیر (Breadcrumb) */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-ks-blue-500 transition-colors">
            خانه
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-bold">تماس با ما و استعلام</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        <header className="mb-8 text-center md:text-right">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            ارتباط با ما و درخواست استعلام قیمت
          </h1>
          <p className="text-gray-600 max-w-3xl leading-relaxed">
            جهت سفارش ساخت قطعات، مشاوره در خصوص سازه‌های فلزی، استعلام قیمت اتصالات صنعتی یا هماهنگی جلسات حضوری با کارشناسان ما تماس بگیرید.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row-reverse gap-8">
          {/* بخش فرم تماس */}
          <div className="lg:w-2/3">
            <ContactForm />

            {/* نقشه موقعیت مکانی */}
            <section className="mt-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-hidden">
              <h2 className="font-bold text-lg text-gray-900 mb-4">
                موقعیت دفتر و کارخانه روی نقشه
              </h2>
              <div className="rounded-xl overflow-hidden h-64 w-full border border-gray-200">
                <iframe
                  title="موقعیت مکانی شرکت خوش‌صنعت پایدار"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3239.917457370039!2d51.389144!3d35.689197!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f8e0e9e8f3b0f3b%3A0x7c3c6f5b4f8a67e3!2sTehran!5e0!3m2!1sen!2s!4v1712345678901!5m2!1sen!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all"
                />
              </div>
            </section>
          </div>

          {/* بخش اطلاعات تماس */}
          <aside className="lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 rounded-xl bg-ks-blue-50 text-ks-blue-500 border border-ks-blue-100">
                  <MapPin size={22} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  آدرس دفتر مرکزی و کارخانه
                </h2>
              </div>
              <p className="leading-relaxed text-gray-700 text-sm">{address}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 rounded-xl bg-ks-blue-50 text-ks-blue-500 border border-ks-blue-100">
                  <Phone size={22} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  شماره‌های تماس
                </h2>
              </div>
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-base font-bold font-mono text-ks-blue-500 hover:underline block" dir="ltr">
                {phone}
              </a>
              <p className="text-xs mt-2 text-gray-500">ساعات پاسخگویی: ۸ الی ۱۷ (شنبه تا چهارشنبه)</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 rounded-xl bg-ks-blue-50 text-ks-blue-500 border border-ks-blue-100">
                  <Mail size={22} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  پست الکترونیک رسمی
                </h2>
              </div>
              <a href={`mailto:${email}`} className="text-sm font-semibold text-ks-blue-500 hover:underline block" dir="ltr">
                {email}
              </a>
              <p className="text-xs mt-2 text-gray-500">ارسال نقشه‌ها و استعلام‌های رسمی شاپ‌دراوینگ</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 rounded-xl bg-ks-blue-50 text-ks-blue-500 border border-ks-blue-100">
                  <Clock size={22} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  ساعات کاری و پذیرش
                </h2>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex justify-between text-gray-700">
                  <span>شنبه تا چهارشنبه:</span>
                  <span className="font-semibold text-gray-900">۸:۰۰ – ۱۷:۰۰</span>
                </li>
                <li className="flex justify-between text-gray-700">
                  <span>پنجشنبه:</span>
                  <span className="font-semibold text-gray-900">۸:۰۰ – ۱۳:۰۰</span>
                </li>
                <li className="flex justify-between text-gray-700">
                  <span>جمعه و تعطیلات رسمی:</span>
                  <span className="text-red-500 font-semibold">تعطیل</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}