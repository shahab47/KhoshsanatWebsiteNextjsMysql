// app/why-us/page.tsx
import WhyUs from '@/components/sections/WhyUs';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'درباره ما | خوش صنعت پایدار',
  description: 'معرفی شرکت خوش صنعت پایدار، تخصص‌ها و خدمات مهندسی',
};

export default function WhyUsPage() {
  return (
    <main className="min-h-screen">
      <WhyUs />
      <Footer/>
    </main>
  );
}