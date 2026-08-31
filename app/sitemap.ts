// app/sitemap.ts
import { MetadataRoute } from 'next';
import db from '@/lib/db';
import { SITE_CONFIG, getCanonicalUrl } from '@/lib/seo';

export const revalidate = 3600; // بازسازی سایت‌مپ هر ۱ ساعت

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // ۱. صفحات ثابت و اصلی سایت
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getCanonicalUrl(''),
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: getCanonicalUrl('/products'),
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: getCanonicalUrl('/projects'),
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: getCanonicalUrl('/education'),
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getCanonicalUrl('/about'),
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: getCanonicalUrl('/contact'),
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  try {
    // ۲. دریافت محصولات فعال
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: getCanonicalUrl(`/products/${encodeURIComponent(product.slug)}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    }));

    // ۳. دریافت پروژه‌های فعال
    const projects = await db.project.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
      url: getCanonicalUrl(`/projects/${encodeURIComponent(project.slug)}`),
      lastModified: project.updatedAt ? new Date(project.updatedAt) : currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

    // ۴. دریافت مقالات آموزشی فعال
    const articles = await db.article.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
      url: getCanonicalUrl(`/education/${encodeURIComponent(article.slug)}`),
      lastModified: article.updatedAt ? new Date(article.updatedAt) : currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [
      ...staticRoutes,
      ...productRoutes,
      ...projectRoutes,
      ...articleRoutes,
    ];
  } catch (error) {
    console.error('خطا در تولید داینامیک Sitemap:', error);
    return staticRoutes;
  }
}
