import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import db from '@/lib/db';
import Header from '@/components/layout/Header';
import { SITE_CONFIG, generateOrganizationSchema } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';
import AnalyticsTracker from '@/components/seo/AnalyticsTracker';
import { ModalProvider } from '@/app/contexts/ModalContext';

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
  display: 'swap',
  variable: '--font-vazir',
});

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  title: {
    default: SITE_CONFIG.defaultTitle,
    template: SITE_CONFIG.titleTemplate,
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  keywords: SITE_CONFIG.defaultKeywords,
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.siteUrl }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.legalName,
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: '/',
    languages: {
      'fa-IR': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.siteUrl,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.defaultTitle,
    description: SITE_CONFIG.description,
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
    title: SITE_CONFIG.defaultTitle,
    description: SITE_CONFIG.description,
    images: ['/Logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/Logo.svg',
    shortcut: '/Logo.svg',
    apple: '/Logo.svg',
  },
};

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

  const organizationSchema = generateOrganizationSchema(logoUrl);

  return (
    <html lang="fa" dir="rtl" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <JsonLd id="organization-schema" data={organizationSchema} />
      </head>
      <body
        className={`${vazirLocal.className} bg-ks-dark text-white antialiased selection:bg-blue-600 selection:text-white`}
        suppressHydrationWarning
      >
        <ModalProvider>
          <AnalyticsTracker />
          <Header logoUrl={logoUrl} />
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}