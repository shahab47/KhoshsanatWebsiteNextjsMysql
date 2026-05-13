import type { Metadata } from 'next';
import db from '@/lib/db';
import HeroSlider from '@/components/sections/HeroSlider';
import Categories from '@/components/sections/Categories';
import EducationSlider from '@/components/sections/EducationSlider';
import ProjectSlider from '@/components/sections/ProjectSlider';
import WhyUs from '@/components/sections/WhyUs';
//import ProductSlider from '@/components/sections/ProductSlider';<ProductSlider />
import Footer from '@/components/layout/Footer';
import MYRailProduct from '@/components/sections/MYRailProduct';

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

  return {
    title: meta.HOME_META_TITLE || 'وب‌سایت شما',
    description: meta.HOME_META_DESCRIPTION || 'توضیحات پیش‌فرض سایت',
    keywords: meta.HOME_META_KEYWORDS || '',
    openGraph: {
      title: meta.HOME_META_TITLE || 'وب‌سایت شما',
      description: meta.HOME_META_DESCRIPTION || 'توضیحات پیش‌فرض سایت',
      siteName: 'نام سایت شما',
      locale: 'fa_IR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.HOME_META_TITLE || 'وب‌سایت شما',
      description: meta.HOME_META_DESCRIPTION || 'توضیحات پیش‌فرض سایت',
    },
  };
}

export default async function Home() {
  // دریافت اسلایدهای فعال و با نوع MAIN
  const activeSlides = await db.slide.findMany({
    where: {
      isActive: true,
      type: 'MAIN',          // فقط اسلایدهای MAIN
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

  return (
    <main className="min-h-screen bg-ks-dark text-white flex flex-col">
      {/* حالا تایپ‌ها کاملاً هماهنگ هستند و نیازی به as any نیست */}
      <HeroSlider slides={activeSlides} settings={safeSliderSettings} />
      <MYRailProduct/>
      <EducationSlider/>
      <ProjectSlider/>
      
      <Categories />
      <WhyUs />
      <Footer />
    </main>
  );
}