'use client';

import ImageWithFallback from '@/components/ui/ImageWithFallback';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <ImageWithFallback
          src="/Logo.svg"
          fallbackSrc="/Logo.svg"
          alt="Logo"
          className="w-32 h-32 object-contain mx-auto animate-pulse-slow"
        />
        <p className="mt-8 text-gray-500 text-sm">در حال بارگذاری...</p>
      </div>
    </div>
  );
}