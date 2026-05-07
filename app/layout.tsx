// src/app/layout.tsx
import localFont from 'next/font/local';
import './globals.css';
import db from '@/lib/db';
import Header from '@/components/layout/Header'; // مسیر درست Header

const vazirLocal = localFont({
  src: [
    { path: './fonts/Vazir-Medium.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Vazir-Bold.woff2', weight: '700', style: 'normal' },
    {
      path: './fonts/Vazir-Thin-FD-WOL.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/Vazir-Light-FD-WOL.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/Vazir-FD-WOL.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Vazir-Medium-FD-WOL.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Vazir-Bold-FD-WOL.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${vazirLocal.className} bg-ks-dark text-white`}>
        <Header />
        <main className="">   {/* این خط مشکل پنهان شدن محتوا را حل می‌کند */}
          {children}
        </main>
      </body>
    </html>
  );
}