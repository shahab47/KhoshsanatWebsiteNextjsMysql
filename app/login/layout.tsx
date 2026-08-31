import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ورود به پنل مدیریت | خوش‌صنعت پایدار',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
