// app/education/[id]/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  Clock,
  ChevronRight,
  User,
  FolderOpen,
  FileText,
  Download,
} from 'lucide-react';
import db from '@/lib/db';
import ArticleDetailGallery from '@/components/education/ArticleDetailGallery';
import {
  SITE_CONFIG,
  generateArticleSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl,
  stripHtml,
} from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

interface PageProps {
  params: Promise<{ id?: string; slug?: string }>;
}

async function getArticle(identifier?: string) {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier);
  const numericId = parseInt(decoded);

  const article = await db.article.findFirst({
    where: {
      OR: [
        { slug: decoded },
        ...(!isNaN(numericId) ? [{ id: numericId }] : []),
      ],
      isActive: true,
    },
  });

  return article;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug || resolvedParams.id;
  const article = await getArticle(identifier);

  if (!article) {
    return {
      title: 'مقاله یافت نشد',
      robots: { index: false, follow: false },
    };
  }

  const plainExcerpt = stripHtml(article.excerpt || article.content || SITE_CONFIG.description).substring(0, 160);
  const title = `${article.title} | آکادمی خوش‌صنعت پایدار`;
  const canonicalPath = `/education/${encodeURIComponent(article.slug)}`;
  const imageUrl = article.imageUrl.startsWith('http')
    ? article.imageUrl
    : `${SITE_CONFIG.siteUrl}${article.imageUrl}`;

  return {
    title: {
      absolute: title,
    },
    description: plainExcerpt,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description: plainExcerpt,
      url: getCanonicalUrl(canonicalPath),
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: 'article',
      publishedTime: new Date(article.createdAt).toISOString(),
      modifiedTime: new Date(article.updatedAt || article.createdAt).toISOString(),
      authors: [article.author || SITE_CONFIG.name],
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: plainExcerpt,
      images: [imageUrl],
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug || resolvedParams.id;
  const article = await getArticle(identifier);

  if (!article) {
    notFound();
  }

  let allAttachments: any[] = [];
  if (article.media) {
    if (typeof article.media === 'string') {
      try {
        allAttachments = JSON.parse(article.media);
      } catch (e) {
        allAttachments = [article.media];
      }
    } else if (Array.isArray(article.media)) {
      allAttachments = article.media;
    }
  }

  const parsedImages: { url: string; name: string }[] = [];
  const parsedFiles: { url: string; name: string }[] = [];

  if (article.imageUrl && article.imageUrl.trim()) {
    parsedImages.push({ url: article.imageUrl, name: 'تصویر شاخص مقاله' });
  }

  allAttachments.forEach((item: any) => {
    let url = '';
    if (typeof item === 'string') url = item;
    else if (item && typeof item === 'object') {
      url = item.imageUrl || item.url || item.path || item.src || '';
    }
    if (!url) return;

    const name =
      typeof item === 'string'
        ? decodeURIComponent(url.split('/').pop() || 'فایل')
        : item.name || item.title || decodeURIComponent(url.split('/').pop() || 'فایل');

    const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
    if (isImg) {
      if (!parsedImages.some((img) => img.url === url)) parsedImages.push({ url, name });
    } else {
      if (!parsedFiles.some((f) => f.url === url)) parsedFiles.push({ url, name });
    }
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'آکادمی و مقالات', path: '/education' },
    { name: article.title, path: `/education/${article.slug}` },
  ]);

  const articleSchema = generateArticleSchema({
    title: article.title,
    slug: article.slug,
    content: article.content,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    author: article.author,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    category: article.category,
  });

  return (
    <main className="min-h-screen bg-[#f1f5f9]" dir="rtl">
      <JsonLd id="article-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="article-single-schema" data={articleSchema} />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
            <Link href="/" className="hover:text-blue-600 transition">
              خانه
            </Link>
            <ChevronRight size={16} />
            <Link href="/education" className="hover:text-blue-600 transition">
              آکادمی و مقالات
            </Link>
            <ChevronRight size={16} />
            <span className="text-gray-800 font-bold truncate max-w-[200px] md:max-w-md">
              {article.title}
            </span>
          </div>
        </div>
      </div>

      {/* تصویر شاخص و مدال تصاویر */}
      <ArticleDetailGallery
        articleTitle={article.title}
        activeImageUrl={article.imageUrl || ''}
        images={parsedImages}
      />

      {/* محتوای اصلی مقاله (رندر سروری کامل) */}
      <article className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-8">
            {/* ستون کناری: فایل‌های ضمیمه و گالری */}
            <aside className="lg:col-span-1 space-y-8">
              {parsedFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
                    <FileText className="text-blue-600" size={20} />
                    فایل‌ها و مدارک ضمیمه
                  </h3>
                  <div className="space-y-3">
                    {parsedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                            <FileText size={18} />
                          </div>
                          <span className="font-medium text-gray-700 text-sm truncate" dir="ltr" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <a
                          href={file.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shrink-0 mr-2 shadow-sm"
                        >
                          <Download size={14} />
                          دانلود
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* ستون اصلی: هدر مقاله، نویسنده، تاریخ و متن کامل */}
            <div className="lg:col-span-2">
              <header className="mb-6">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-gray-500 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    <FolderOpen size={12} />
                    {article.category || 'عمومی'}
                  </span>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-600" />
                    <span>
                      نویسنده: <strong className="text-gray-800">{article.author || 'مدیریت فنی خوش‌صنعت'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <time dateTime={new Date(article.createdAt).toISOString()}>
                      {new Date(article.createdAt).toLocaleDateString('fa-IR')}
                    </time>
                  </div>
                  {article.readTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-600" />
                      <span>{article.readTime} دقیقه مطالعه</span>
                    </div>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4 text-center lg:text-right">
                  {article.title}
                </h1>
              </header>

              <div className="border-t border-gray-200 my-4"></div>

              {/* متن کامل مقاله */}
              <div className="prose prose-gray max-w-none text-gray-700 leading-loose text-justify prose-headings:text-gray-800 prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-img:shadow-md">
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>
            </div>
          </div>

          {/* دکمه بازگشت به آکادمی */}
          <div className="p-6 md:p-8 border-t border-gray-100 text-center">
            <Link
              href="/education"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold transition"
            >
              <ChevronRight size={16} />
              بازگشت به لیست مقالات و آموزش‌ها
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}