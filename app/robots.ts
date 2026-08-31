// app/robots.ts
import { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/contact',
          '/products',
          '/products/*',
          '/projects',
          '/projects/*',
          '/education',
          '/education/*',
        ],
        disallow: [
          '/khoshmin',
          '/khoshmin/*',
          '/api/*',
          '/login',
          '/login/*',
          '/adminer',
          '/minio',
        ],
      },
    ],
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
    host: SITE_CONFIG.siteUrl,
  };
}
