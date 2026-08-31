import type { Metadata } from 'next';
import db from '@/lib/db';
import HeroSlider from '@/components/sections/HeroSlider';
import Categories from '@/components/sections/Categories';
import EducationSlider from '@/components/sections/EducationSlider';
import ProjectSlider from '@/components/sections/ProjectSlider';
import WhyUs from '@/components/sections/WhyUs';
import Footer from '@/components/layout/Footer';
import MYRailProduct from '@/components/sections/MYRailProduct';
import { SITE_CONFIG, generateWebSiteSchema } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // ISR هر ۶۰ ثانیه

export async function generateMetadata(): Promise<Metadata> {
  const metaSettings = await db.setting.findMany({
    where: {
      key: {
        in: ['HOME_META_TITLE', 'HOME_META_DESCRIPTION', 'HOME_META_KEYWORDS']
      }
    }
  });

  const meta = Object.fromEntries(
    metaSettings.map(setting => [setting.key, setting.value])
  );

  const title = meta.HOME_META_TITLE || SITE_CONFIG.defaultTitle;
  const description = meta.HOME_META_DESCRIPTION || SITE_CONFIG.description;
  const keywords = meta.HOME_META_KEYWORDS ? meta.HOME_META_KEYWORDS.split(',').map((k: string) => k.trim()) : SITE_CONFIG.defaultKeywords;

  return {
    title: {
      absolute: title, // برای صفحه اصلی، تایتل دقیق بدون پسوند تکراری
    },
    description,
    keywords,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title,
      description,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: 'website',
      url: SITE_CONFIG.siteUrl,
      images: [
        {
          url: '/Logo.svg',
          width: 800,
          height: 600,
          alt: SITE_CONFIG.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/Logo.svg'],
    },
  };
}

export default async function Home() {
  // دریافت اسلایدهای فعال و با نوع MAIN
  const activeSlides = await db.slide.findMany({
    where: {
      isActive: true,
      type: 'MAIN', // فقط اسلایدهای MAIN
    },
    orderBy: { order: 'asc' },
  });

  // دریافت تنظیمات اسلایدر
  let sliderSettings = await db.sliderSettings.findUnique({ where: { id: 1 } });
  if (!sliderSettings) {
    sliderSettings = await db.sliderSettings.create({
      data: {
        id: 1,
        heightDesktop: '85vh',
        heightMobile: '60vh',
        overlayColor: '#000000',
        overlayOpacity: 0.7,
      },
    });
  }

  const safeSliderSettings = {
    heightDesktop: sliderSettings.heightDesktop || '85vh',
    heightMobile: sliderSettings.heightMobile || '60vh',
    overlayColor: sliderSettings.overlayColor || '#000000',
    overlayOpacity: sliderSettings.overlayOpacity ?? 0.7,
  };

  const websiteSchema = generateWebSiteSchema();

  return (
    <main className="min-h-screen bg-ks-dark text-white flex flex-col">
      <JsonLd id="website-schema" data={websiteSchema} />
      <HeroSlider slides={activeSlides} settings={safeSliderSettings} />
      <MYRailProduct />
      <EducationSlider />
      <ProjectSlider />
      <Categories />
      <WhyUs />
      <Footer />
    </main>
  );
}