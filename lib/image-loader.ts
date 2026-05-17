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

  const q = quality || 75;

  // هدایت اصولی تصاویر به ImgProxy
  // فرض بر این است که Nginx مسیر /imgproxy/ را به درستی به کانتینر imgproxy هدایت می‌کند
  // فرمت استاندارد Imgproxy: /imgproxy/insecure/rs:fill:{width}:0/q:{quality}/plain/{url}
  
  const encodedUrl = encodeURIComponent(src);
  return `/imgproxy/insecure/rs:fill:${width}:0/q:${q}/plain/${encodedUrl}`;
}