// app/feed.xml/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { SITE_CONFIG, getCanonicalUrl, stripHtml } from '@/lib/seo';

export const revalidate = 3600; // بازسازی کش هر ۱ ساعت

export async function GET() {
  try {
    const [articles, products] = await Promise.all([
      db.article.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const rssItems = [
      ...articles.map((article) => `
        <item>
          <title><![CDATA[${article.title}]]></title>
          <link>${getCanonicalUrl(`/education/${encodeURIComponent(article.slug)}`)}</link>
          <guid isPermaLink="true">${getCanonicalUrl(`/education/${encodeURIComponent(article.slug)}`)}</guid>
          <description><![CDATA[${stripHtml(article.excerpt || article.content || '').substring(0, 300)}]]></description>
          <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>
          <category><![CDATA[${article.category || 'آموزش فنی و مهندسی'}]]></category>
        </item>
      `),
      ...products.map((product) => `
        <item>
          <title><![CDATA[محصول: ${product.title}]]></title>
          <link>${getCanonicalUrl(`/products/${encodeURIComponent(product.slug)}`)}</link>
          <guid isPermaLink="true">${getCanonicalUrl(`/products/${encodeURIComponent(product.slug)}`)}</guid>
          <description><![CDATA[${stripHtml(product.shortDesc || product.description || '').substring(0, 300)}]]></description>
          <pubDate>${new Date(product.createdAt).toUTCString()}</pubDate>
          <category><![CDATA[محصولات صنعتی]]></category>
        </item>
      `),
    ].join('');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${SITE_CONFIG.name} | اتصالات مدرن و سازه‌های صنعتی]]></title>
    <link>${SITE_CONFIG.siteUrl}</link>
    <description><![CDATA[${SITE_CONFIG.description}]]></description>
    <language>fa-ir</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_CONFIG.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssXml.trim(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('خطا در تولید فید RSS:', error);
    return new NextResponse('<rss version="2.0"><channel><title>Error</title></channel></rss>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
