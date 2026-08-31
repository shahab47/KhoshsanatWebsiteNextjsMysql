// app/products/[slug]/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import db from '@/lib/db';
import ProductDetailInteractive from '@/components/products/ProductDetailInteractive';
import {
  SITE_CONFIG,
  generateProductSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl,
  stripHtml,
} from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

export const revalidate = 60; // بازسازی کش هر ۶۰ ثانیه

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slugOrId: string) {
  const decoded = decodeURIComponent(slugOrId);
  const numericId = parseInt(decoded);

  let product = await db.product.findFirst({
    where: {
      OR: [
        { slug: decoded },
        ...(!isNaN(numericId) ? [{ id: numericId }] : []),
      ],
      isActive: true,
    },
    include: {
      subcategory: {
        include: {
          category: true,
        },
      },
    },
  });

  return product;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);

  if (!product) {
    return {
      title: 'محصول یافت نشد',
      robots: { index: false, follow: false },
    };
  }

  const plainDesc = stripHtml(product.shortDesc || product.description || SITE_CONFIG.description).substring(0, 160);
  const title = `${product.title} | خوش‌صنعت پایدار`;
  const canonicalPath = `/products/${encodeURIComponent(product.slug)}`;
  const imageUrl = product.imageUrl.startsWith('http')
    ? product.imageUrl
    : `${SITE_CONFIG.siteUrl}${product.imageUrl}`;

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
          alt: product.title,
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

export default async function SingleProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  // پردازش تصاویر گالری
  let galleryImages: string[] = [];
  if (typeof product.gallery === 'string') {
    try {
      galleryImages = JSON.parse(product.gallery);
    } catch (e) {
      console.error('خطا در پارس گالری محصول:', e);
    }
  } else if (Array.isArray(product.gallery)) {
    galleryImages = product.gallery as string[];
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'خانه', path: '/' },
    { name: 'محصولات ما', path: '/products' },
    { name: product.title, path: `/products/${product.slug}` },
  ]);

  const productSchema = generateProductSchema({
    title: product.title,
    slug: product.slug,
    description: product.description,
    shortDesc: product.shortDesc,
    imageUrl: product.imageUrl,
    category: product.subcategory?.category?.title || product.subcategory?.title || undefined,
  });

  return (
    <main className="min-h-screen bg-[#F9FAFB] pb-20 font-[Vazir,'vazirmatn',sans-serif] overflow-x-hidden" dir="rtl">
      <JsonLd id="product-breadcrumb-schema" data={breadcrumbSchema} />
      <JsonLd id="product-single-schema" data={productSchema} />

      {/* ۱. Breadcrumb (نوار مسیر) */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-blue-600 transition">
            خانه
          </Link>
          <ChevronLeft size={16} />
          <Link href="/products" className="hover:text-blue-600 transition">
            محصولات ما
          </Link>
          <ChevronLeft size={16} />
          <span className="text-gray-800 font-bold">{product.title}</span>
        </div>
      </div>

      <article className="max-w-7xl mx-auto px-4 md:px-8 mt-8 md:mt-12">
        {/* ۲. بخش اصلی معرفی (تصاویر و مشخصات کوتاه) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 bg-white p-6 md:p-8 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100">
          {/* سمت راست: تصاویر و کامپوننت تعاملی کلاینت */}
          <ProductDetailInteractive
            product={{
              id: product.id,
              title: product.title,
              slug: product.slug,
              shortDesc: product.shortDesc,
              description: product.description,
              imageUrl: product.imageUrl,
              catalogUrl: product.catalogUrl,
            }}
            galleryImages={galleryImages}
          />

          {/* سمت چپ: اطلاعات متنی و نام محصول (رندر سروری کامل) */}
          <div className="w-full lg:w-1/2 flex flex-col">
            {product.subcategory && (
              <span className="text-sm font-bold text-blue-600 mb-2">
                {product.subcategory.category?.title} / {product.subcategory.title}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-snug">
              {product.title}
            </h1>
            {product.shortDesc && (
              <p className="text-[16px] md:text-lg text-gray-600 mb-8 leading-relaxed">
                {product.shortDesc}
              </p>
            )}
          </div>
        </div>

        {/* ۳. توضیحات تکمیلی (رندر سروری با تگ‌های معنایی و استایل مناسب) */}
        <section className="mt-8 bg-white p-6 md:p-10 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
            مشخصات فنی و توضیحات تکمیلی
          </h2>
          <div
            className="text-gray-600 leading-loose text-justify [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-2 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4"
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />
        </section>
      </article>
    </main>
  );
}