// app/projects/[id]/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin, ArrowLeft, FolderOpen, FileText, Download } from 'lucide-react';
import db from '@/lib/db';
import ProjectDetailGallery from '@/components/projects/ProjectDetailGallery';
import {
  SITE_CONFIG,
  generateProjectSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl,
  stripHtml,
} from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

interface PageProps {
  params: Promise<{ id?: string; slug?: string }>;
}

async function getProject(identifier?: string) {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier);
  const numericId = parseInt(decoded);

  const project = await db.project.findFirst({
    where: {
      OR: [
        { slug: decoded },
        ...(!isNaN(numericId) ? [{ id: numericId }] : []),
      ],
      isActive: true,
    },
  });

  return project;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug || resolvedParams.id;
  const project = await getProject(identifier);

  if (!project) {
    return {
      title: 'پروژه یافت نشد',
      robots: { index: false, follow: false },
    };
  }

  const plainDesc = stripHtml(project.content || SITE_CONFIG.description).substring(0, 160);
  const title = `${project.title} | خوش‌صنعت پایدار`;
  const canonicalPath = `/projects/${encodeURIComponent(project.slug)}`;
  const imageUrl = project.imageUrl.startsWith('http')
    ? project.imageUrl
    : `${SITE_CONFIG.siteUrl}${project.imageUrl}`;

  return {
    title: {
      absolute: title,
    },
    description: plainDesc,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description: plainDesc,
      url: getCanonicalUrl(canonicalPath),
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: project.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: plainDesc,
      images: [imageUrl],
    },
  };
}

export default async function SingleProjectPage({ params }: PageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug || resolvedParams.id;
  const project = await getProject(identifier);

  if (!project) {
    notFound();
  }

  // استخراج فایل‌ها و تصاویر ضمیمه
  let allAttachments: any[] = [];
  if (typeof project.gallery === 'string') {
    try {
      allAttachments = JSON.parse(project.gallery);
    } catch (e) {
      console.error('خطا در پارس گالری پروژه:', e);
    }
  } else if (Array.isArray(project.gallery)) {
    allAttachments = project.gallery;
  }

  const parsedImages: { url: string; name: string }[] = [];
  const parsedFiles: { url: string; name: string }[] = [];

  if (project.imageUrl) {
    parsedImages.push({ url: project.imageUrl, name: 'تصویر اصلی پروژه' });
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
    { name: 'پروژه‌ها', path: '/projects' },
    { name: project.title, path: `/projects/${project.slug}` },
  ]);

  const projectSchema = generateProjectSchema({
    title: project.title,
    slug: project.slug,
    content: project.content,
    imageUrl: project.imageUrl,
    category: project.category,
    location: project.location,
    createdAt: project.createdAt,
  });

  return (
    <main className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      <JsonLd id="project-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="project-single-schema" data={projectSchema} />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-blue-600 transition">
            خانه
          </Link>
          <ChevronRight size={16} />
          <Link href="/projects" className="hover:text-blue-600 transition">
            پروژه‌ها
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold truncate max-w-[200px] sm:max-w-md">
            {project.title}
          </span>
        </div>
      </div>

      <article className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* ستون راست: گالری تصاویر تعاملی */}
            <ProjectDetailGallery
              title={project.title}
              mainImageUrl={project.imageUrl}
              images={parsedImages}
            />

            {/* ستون چپ: اطلاعات و محتوای پروژه (رندر سروری) */}
            <div className="p-6 md:p-8 flex flex-col">
              {/* دسته‌بندی */}
              {project.category && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                    <FolderOpen size={14} />
                    {project.category}
                  </span>
                </div>
              )}

              {/* ردیف عنوان و موقعیت */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight flex-1">
                  {project.title}
                </h1>
                {project.location && (
                  <div className="flex items-center gap-1 text-gray-500 text-sm whitespace-nowrap bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{project.location}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              {/* محتوای رندر شده از ویرایشگر */}
              {project.content && (
                <div
                  className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-strong:text-gray-800 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-img:shadow-md mb-8 leading-loose text-justify"
                  dangerouslySetInnerHTML={{ __html: project.content }}
                />
              )}

              {/* بخش فایل‌های ضمیمه */}
              {parsedFiles.length > 0 && (
                <section className="mt-6 mb-8 border-t border-gray-100 pt-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    فایل‌ها و مدارک ضمیمه پروژه
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {parsedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-white p-2 rounded-lg text-blue-600 shrink-0 shadow-sm">
                            <FileText size={18} />
                          </div>
                          <span className="font-medium text-gray-700 text-sm truncate w-full" dir="ltr" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <a
                          href={file.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition shrink-0 mr-2"
                        >
                          <Download size={16} />
                          دانلود فایل
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-auto pt-8 border-t border-gray-100">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                >
                  شروع پروژه‌ای مشابه با ما <ArrowLeft size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}