// src/app/layout.tsx
import localFont from 'next/font/local';
import './globals.css';
import db from '@/lib/db';
import Header from '@/components/layout/Header'; // مسیر درست Header

const vazirLocal = localFont({
  src: [
    { path: './fonts/Vazir-Medium.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Vazir-Bold.woff2', weight: '700', style: 'normal' }
  ],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // خواندن لوگو از دیتابیس
  let logoUrl = '/logo.png';
  try {
    const logoSetting = await db.setting.findUnique({ where: { key: 'SITE_LOGO' } });
    if (logoSetting?.value) logoUrl = logoSetting.value;
    console.log('✅ layout: logoUrl =', logoUrl); // لاگ در سرور
  } catch (err) {
    console.error('خطا در خواندن لوگو:', err);
  }

  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirLocal.className} bg-ks-dark text-white`}>
        <Header logoUrl={logoUrl} />
        <main className="pt-20 md:pt-24">   {/* این خط مشکل پنهان شدن محتوا را حل می‌کند */}
          {children}
        </main>
      </body>
    </html>
  );
}