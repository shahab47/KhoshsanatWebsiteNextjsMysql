'use client';
//@/app/not-found.tsx
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* ستون راست: لوگو + نام شرکت */}
        <div className="text-center md:text-right">
          <ImageWithFallback
            src="/Logo.svg"
            fallbackSrc="/Logo.svg"
            alt="Logo"
            className="w-56 h-56 object-contain mx-auto md:mx-0 mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-700">شرکت خوش صنعت پایدار</h2>
        </div>

        {/* ستون چپ: عدد ۴۰۴ + توضیحات + دکمه */}
        <div className="text-center md:text-right">
          <div className="text-6xl font-bold text-blue-600 mb-4">۴۰۴</div>
          <p className="text-gray-600 mb-8 max-w-md mx-auto md:mx-0">
            صفحه‌ای که به دنبال آن هستید وجود ندارد یا آدرس آن تغییر کرده است.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            ← بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}