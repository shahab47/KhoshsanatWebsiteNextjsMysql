import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.3.27', 'localhost:3000'],
  // تنظیمات حجم آپلود فایل (۲۵۰ مگابایت برای کاربران احرازهویت‌شده)
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
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