import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // تنظیمات افزایش محدودیت حجم آپلود فایل
  experimental: {
    proxyClientMaxBodySize: '250mb',
    serverActions: {
      bodySizeLimit: '250mb',
    },
  },

  // تنظیمات تصاویر و دسترسی به هاست‌های خارجی
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '45.149.78.107',
        port: '9000',
        pathname: '/khoshsanat-media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'khoshsanat.ir',
        pathname: '/**',
      },
    ],
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
  
  // خروجی مستقل برای داکر
  output: 'standalone',

  // هدرهای امنیتی
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // تنظیمات کامپایلر
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;