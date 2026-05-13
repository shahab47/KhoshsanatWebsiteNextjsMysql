import localFont from 'next/font/local';
import './globals.css';
import db from '@/lib/db';
import Header from '@/components/layout/Header';

const vazirLocal = localFont({
  src: [
    { path: './fonts/Vazir-Medium.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Vazir-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Vazir-Thin-FD-WOL.woff2', weight: '100', style: 'normal' },
    { path: './fonts/Vazir-Light-FD-WOL.woff2', weight: '300', style: 'normal' },
    { path: './fonts/Vazir-FD-WOL.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Vazir-Medium-FD-WOL.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Vazir-Bold-FD-WOL.woff2', weight: '700', style: 'normal' },
  ],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let logoUrl = '/Logo.svg';

  try {
    const vectorLogo = await db.logo.findUnique({ where: { type: 'main-svg' } });
    if (vectorLogo?.url) {
      logoUrl = vectorLogo.url;
    } else {
      const rasterLogo = await db.logo.findUnique({ where: { type: 'main' } });
      if (rasterLogo?.url) {
        logoUrl = rasterLogo.url;
      }
    }
  } catch (err) {
    console.error('خطا در دریافت لوگو از دیتابیس:', err);
  }

  return (
    <html lang="fa" dir="rtl" className="scroll-smooth">
      <body className={`${vazirLocal.className} bg-ks-dark text-white`}>
        <Header logoUrl={logoUrl} />
        <main>{children}</main>
      </body>
    </html>
  );
}