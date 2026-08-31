// app/not-found.tsx
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* ستون راست: لوگو + نام شرکت */}
        <div className="text-center md:text-right">
          <ImageWithFallback
            src="/Logo.svg"
            fallbackSrc="/Logo.svg"
            alt="لوگو خوش صنعت پایدار"
            className="w-56 h-56 object-contain mx-auto md:mx-0 mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-700">شرکت خوش صنعت پایدار</h2>
        </div>

        {/* ستون چپ: عدد ۴۰۴ + توضیحات + دکمه */}
        <div className="text-center md:text-right">
          <h1 className="text-6xl font-black text-blue-600 mb-4">۴۰۴</h1>
          <p className="text-xl font-bold text-gray-800 mb-2">صفحه مورد نظر یافت نشد!</p>
          <p className="text-gray-600 mb-8 max-w-md mx-auto md:mx-0 leading-relaxed">
            صفحه‌ای که به دنبال آن هستید حذف شده، آدرس آن تغییر کرده یا وجود ندارد.
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              بازگشت به صفحه اصلی
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
            >
              مشاهده محصولات
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}