// مسیر فایل: src/lib/image-loader.ts

interface LoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function customImageLoader({ src, width, quality }: LoaderParams): string {
  // اگر آدرس تصویر محلی بود (مثل لوگوها یا آیکون‌های داخلی سایت)، آن را مستقیم لود کن
  if (src.startsWith('/') && !src.startsWith('//')) {
    return src;
  }

  // ارسال پارامترها به فایل یکپارچه upload (متد GET به صورت خودکار فراخوانی می‌شود)
  const queryParams = new URLSearchParams({
    url: src,
    w: width.toString(),
    q: (quality || 75).toString(),
  });

  return `/api/upload?${queryParams.toString()}`;
}