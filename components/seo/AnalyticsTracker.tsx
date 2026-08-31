// components/seo/AnalyticsTracker.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const initialReferrer = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialReferrer.current = document.referrer || '';
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;

    // جلوگیری از ثبت لاگ تکراری در یک مسیر یا مسیرهای مدیریت و لاگین
    if (
      pathname === lastTrackedPath.current ||
      pathname.startsWith('/khoshmin') ||
      pathname.startsWith('/login')
    ) {
      return;
    }

    lastTrackedPath.current = pathname;

    const trackVisit = async () => {
      try {
        const payload = {
          path: pathname,
          referrer: initialReferrer.current || document.referrer || null,
        };

        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json; charset=UTF-8',
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track', blob);
        } else {
          fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {});
        }
      } catch (err) {
        // نادیده گرفتن خطاهای کلاینتی رهگیری برای پایداری ۱۰۰٪ برنامه
      }
    };

    // کمی تاخیر برای لود بدون اختلال صفحه
    const timer = setTimeout(trackVisit, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
