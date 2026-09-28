import type { Metadata } from 'next';
import db from '@/lib/db';
import HeroSlider from '@/components/sections/HeroSlider';
import Categories, { CategoryFromAPI } from '@/components/sections/Categories';
import EducationSlider from '@/components/sections/EducationSlider';
import ProjectSlider from '@/components/sections/ProjectSlider';
import WhyUs from '@/components/sections/WhyUs';
import Footer from '@/components/layout/Footer';
import MYRailProduct from '@/components/sections/MYRailProduct';
import { SITE_CONFIG, generateWebSiteSchema } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // ISR هر ۶۰ ثانیه

export async function generateMetadata(): Promise<Metadata> {
  let title = SITE_CONFIG.defaultTitle;
  let description = SITE_CONFIG.description;
  let keywords: string[] = Array.from(SITE_CONFIG.defaultKeywords);

  try {
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

    if (meta.HOME_META_TITLE) title = meta.HOME_META_TITLE;
    if (meta.HOME_META_DESCRIPTION) description = meta.HOME_META_DESCRIPTION;
    if (meta.HOME_META_KEYWORDS) {
      keywords = meta.HOME_META_KEYWORDS.split(',').map((k: string) => k.trim());
    }
  } catch (err) {
    console.warn('پایگاه داده در دسترس نیست؛ متادیتای پیش‌فرض استفاده شد:', err);
  }

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
  const defaultSliderSettings = {
    id: 1,
    heightDesktop: '85vh',
    heightMobile: '60vh',
    overlayColor: '#000000',
    overlayOpacity: 0.7,
    autoplaySpeed: 5000,
    updatedAt: new Date(),
  };

  type SlideItem = Awaited<ReturnType<typeof db.slide.findMany>>[number];
  type ProductItem = { id: number; title: string; slug: string; imageUrl: string; isActive: boolean };
  type ArticleItem = { id: number; title: string; slug: string; excerpt: string | null; category: string | null; author: string | null; readTime: number | null; imageUrl: string; isActive: boolean };
  type ProjectItem = { id: number; title: string; slug: string; category: string | null; location: string | null; content: string | null; imageUrl: string; isActive: boolean };

  let activeSlides: SlideItem[] = [];
  let sliderSettings = defaultSliderSettings;
  let products: ProductItem[] = [];
  let articlesDb: ArticleItem[] = [];
  let projectsDb: ProjectItem[] = [];
  let categories: CategoryFromAPI[] = [];

  try {
    const [
      slidesRes,
      sliderSettingsRes,
      productsRes,
      articlesRes,
      projectsRes,
      categoriesRes,
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

    activeSlides = slidesRes;
    if (sliderSettingsRes) {
      sliderSettings = {
        id: sliderSettingsRes.id,
        heightDesktop: sliderSettingsRes.heightDesktop ?? defaultSliderSettings.heightDesktop,
        heightMobile: sliderSettingsRes.heightMobile ?? defaultSliderSettings.heightMobile,
        overlayColor: sliderSettingsRes.overlayColor ?? defaultSliderSettings.overlayColor,
        overlayOpacity: sliderSettingsRes.overlayOpacity ?? defaultSliderSettings.overlayOpacity,
        autoplaySpeed: defaultSliderSettings.autoplaySpeed,
        updatedAt: sliderSettingsRes.updatedAt,
      };
    }
    products = productsRes;
    articlesDb = articlesRes;
    projectsDb = projectsRes;
    categories = categoriesRes;
  } catch (err) {
    console.warn('پایگاه داده در دسترس نیست؛ مقادیر پیش‌فرض برای صفحه اصلی اعمال شد:', err);
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
    content: p.content || undefined,
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