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
  // واکشی موازی داده‌های بخش‌های مختلف صفحه اصلی در سرور
  const [
    activeSlides,
    sliderSettingsDb,
    products,
    articlesDb,
    projectsDb,
    categories,
  ] = await Promise.all([
    db.slide.findMany({
      where: {
        isActive: true,
        type: 'MAIN',
      },
      orderBy: { order: 'asc' },
    }),
    db.sliderSettings.findUnique({ where: { id: 1 } }),
    db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    }),
    db.article.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        author: true,
        readTime: true,
        imageUrl: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.project.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        location: true,
        content: true,
        imageUrl: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
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
  ]);

  let sliderSettings = sliderSettingsDb;
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

  const safeArticles = articlesDb.map((a) => ({
    ...a,
    excerpt: a.excerpt || undefined,
    category: a.category || undefined,
    author: a.author || undefined,
    readTime: a.readTime || undefined,
  }));

  const safeProjects = projectsDb.map((p) => ({
    ...p,
    category: p.category || undefined,
    location: p.location || undefined,
  }));

  const websiteSchema = generateWebSiteSchema();

  return (
    <main className="min-h-screen bg-ks-dark text-white flex flex-col">
      <JsonLd id="website-schema" data={websiteSchema} />
      <HeroSlider slides={activeSlides} settings={safeSliderSettings} />
      <MYRailProduct initialProducts={products} />
      <EducationSlider initialArticles={safeArticles} />
      <ProjectSlider initialProjects={safeProjects} />
      <Categories initialCategories={categories} />
      <WhyUs />
      <Footer />
    </main>
  );
}