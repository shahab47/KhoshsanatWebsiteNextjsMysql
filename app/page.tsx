// src/app/page.tsx
import db from '@/lib/db'; // وارد کردن کانکشن دیتابیس
import HeroSlider from '@/components/sections/HeroSlider';
import Categories from '@/components/sections/Categories';
import WhyUs from '@/components/sections/WhyUs';
import Footer from '@/components/layout/Footer';

// این خط یک تکنیک پیشرفته (ISR) است: 
// سایت را هر ۶۰ ثانیه یک بار در بک‌گراند به‌روز می‌کند تا سرعت لود برای کاربر در حد سایت استاتیک (میلی‌ثانیه) بماند اما دیتابیس هم آپدیت شود.
export const revalidate = 60; 

export default async function Home() {
  // ۱. درخواست به دیتابیس MySQL برای گرفتن اسلایدهای فعال
  let activeSlides = await db.slide.findMany({
    where: { 
      isActive: true 
    },
    orderBy: { 
      order: 'asc' // مرتب‌سازی بر اساس ترتیبی که ادمین مشخص کرده
    },
  });

  // ۲. مدیریت حالت خالی (Fallback)
  // اگر دیتابیس تازه نصب شده و خالی است، یک اسلاید پیش‌فرض نشان می‌دهیم تا سایت خراب نشود
  if (activeSlides.length === 0) {
    activeSlides = [
      { 
        id: 0, 
        title: 'اسلاید پیش‌فرض', 
        imageUrl: '/hero-bg.jpg', // عکسی که در پوشه public دارید
        order: 1, 
        isActive: true, 
        createdAt: new Date() 
      }
    ];
  }

  // ۳. رندر کردن قطعات سایت
  return (
    <main className="min-h-screen bg-ks-dark text-white flex flex-col">
      
      
      {/* دیتاهای دیتابیس را به عنوان پراپ (Prop) به اسلایدر می‌فرستیم */}
      <HeroSlider slides={activeSlides} />
      
      <Categories />
      <WhyUs />
      <Footer />
    </main>
  );
}