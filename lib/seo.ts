// lib/seo.ts

export const SITE_CONFIG = {
  name: 'خوش صنعت پایدار',
  englishName: 'Khosh Sanat Paydar',
  legalName: 'شرکت مهندسی و صنعتی خوش صنعت پایدار',
  defaultTitle: 'خوش‌صنعت پایدار | مهندسی، تولید و اتصالات مدرن صنعتی',
  titleTemplate: '%s | خوش‌صنعت پایدار',
  description: 'طراحی، مهندسی و ساخت اتصالات مدرن ساختمانی، سازه‌های صنعتی و قطعات فلزی با تکنولوژی پیشرفته CNC و استانداردهای بین‌المللی',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://khoshsanat.ir',
  locale: 'fa_IR',
  themeColor: '#2563EB',
  defaultKeywords: [
    'خوش صنعت پایدار',
    'اتصالات صنعتی',
    'اتصالات ساختمانی مدرن',
    'سازه های فلزی',
    'شاپ دراوینگ',
    'برش لیزر CNC',
    'خم برک',
    'جوشکاری صنعتی',
    'قطعات پیش ساخته فلزی',
    'تجهیزات صنعتی',
    'مهندسی سازه'
  ],
  contact: {
    phone: '+989351877305',
    displayPhone: '۰۹۳۵ ۱۸ ۷۷ ۳۰۵',
    email: 'info@ks-engineering.com',
    address: {
      streetAddress: 'خیابان مهندسان، پلاک ۱۲',
      addressLocality: 'تهران',
      addressRegion: 'تهران',
      postalCode: '1111111111',
      addressCountry: 'IR',
    },
  },
};

/**
 * تبدیل متن HTML به متن ساده بدون تگ برای استفاده در متادیسکریپشن
 */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&zwnj;/g, '‌')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// تگ‌های کاملاً ممنوع و خطرناک برای جلوگیری از حملات XSS
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'base',
  'frame',
  'frameset',
];

const EVENT_HANDLER_REGEX = /\son\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;
const DANGEROUS_PROTOCOL_REGEX = /(href|src|action)\s*=\s*(['"]?)\s*(javascript:|vbscript:|data:text\/html)/gi;

/**
 * پاکسازی رشته HTML از تگ‌ها و اتریبیوت‌های مخرب برای جلوگیری از XSS
 */
export function sanitizeHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let clean = dirtyHtml;

  // ۱. حذف کامل تگ‌های خطرناک به همراه محتوای داخلی آن‌ها
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    clean = clean.replace(tagRegex, '');
    const singleTagRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    clean = clean.replace(singleTagRegex, '');
  }

  // ۲. حذف تمام Event Handler ها (onload, onerror, onclick, onmouseover, ...)
  clean = clean.replace(EVENT_HANDLER_REGEX, '');

  // ۳. حذف پروتکل‌های خطرناک در لینک‌ها و تصاویر
  clean = clean.replace(DANGEROUS_PROTOCOL_REGEX, '$1=$2#blocked');

  // ۴. حذف تگ‌های comment
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  return clean;
}

/**
 * ایجاد لینک کامل کنونیکال بر اساس مسیر
 */
export function getCanonicalUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.siteUrl}${cleanPath}`;
}

/**
 * اسکیمای وبسایت و جستجو (WebSite Schema)
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.englishName,
    url: SITE_CONFIG.siteUrl,
    inLanguage: 'fa-IR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.siteUrl}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * اسکیمای سازمان و شرکت (Organization Schema)
 */
export function generateOrganizationSchema(logoUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    url: SITE_CONFIG.siteUrl,
    logo: logoUrl ? (logoUrl.startsWith('http') ? logoUrl : `${SITE_CONFIG.siteUrl}${logoUrl}`) : `${SITE_CONFIG.siteUrl}/Logo.svg`,
    description: SITE_CONFIG.description,
    email: SITE_CONFIG.contact.email,
    telephone: SITE_CONFIG.contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.contact.address.streetAddress,
      addressLocality: SITE_CONFIG.contact.address.addressLocality,
      addressRegion: SITE_CONFIG.contact.address.addressRegion,
      addressCountry: SITE_CONFIG.contact.address.addressCountry,
    },
    sameAs: [
      'https://www.linkedin.com',
      'https://www.instagram.com',
    ],
  };
}

/**
 * اسکیمای مسیر راهنما (BreadcrumbList Schema)
 */
export function generateBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}

/**
 * اسکیمای محصول (Product Schema)
 */
export function generateProductSchema(product: {
  title: string;
  slug: string;
  description?: string;
  shortDesc?: string | null;
  imageUrl?: string;
  category?: string;
}) {
  const plainDesc = stripHtml(product.shortDesc || product.description || SITE_CONFIG.description);
  const fullImageUrl = product.imageUrl
    ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${SITE_CONFIG.siteUrl}${product.imageUrl}`)
    : `${SITE_CONFIG.siteUrl}/Logo.svg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainDesc,
    image: [fullImageUrl],
    url: getCanonicalUrl(`/products/${product.slug}`),
    category: product.category || 'اتصالات و قطعات صنعتی',
    brand: {
      '@type': 'Brand',
      name: SITE_CONFIG.name,
    },
    manufacturer: {
      '@type': 'Organization',
      name: SITE_CONFIG.legalName,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: '0',
      availability: 'https://schema.org/InStock',
      url: getCanonicalUrl(`/products/${product.slug}`),
      seller: {
        '@type': 'Organization',
        name: SITE_CONFIG.name,
      },
    },
  };
}

/**
 * اسکیمای مقاله آموزشی (Article Schema)
 */
export function generateArticleSchema(article: {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string | null;
  imageUrl?: string;
  author?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  category?: string | null;
}) {
  const plainExcerpt = stripHtml(article.excerpt || article.content || '').substring(0, 200);
  const fullImageUrl = article.imageUrl
    ? (article.imageUrl.startsWith('http') ? article.imageUrl : `${SITE_CONFIG.siteUrl}${article.imageUrl}`)
    : `${SITE_CONFIG.siteUrl}/Logo.svg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: plainExcerpt,
    image: [fullImageUrl],
    url: getCanonicalUrl(`/education/${article.slug}`),
    datePublished: new Date(article.createdAt).toISOString(),
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date(article.createdAt).toISOString(),
    author: {
      '@type': 'Person',
      name: article.author || 'مدیریت فنی خوش‌صنعت',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.siteUrl}/Logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': getCanonicalUrl(`/education/${article.slug}`),
    },
    articleSection: article.category || 'آموزش فنی و مهندسی',
    inLanguage: 'fa-IR',
  };
}

/**
 * اسکیمای پروژه (CreativeWork Schema)
 */
export function generateProjectSchema(project: {
  title: string;
  slug: string;
  content?: string;
  imageUrl?: string;
  category?: string | null;
  location?: string | null;
  createdAt: Date | string;
}) {
  const plainDesc = stripHtml(project.content || '').substring(0, 200);
  const fullImageUrl = project.imageUrl
    ? (project.imageUrl.startsWith('http') ? project.imageUrl : `${SITE_CONFIG.siteUrl}${project.imageUrl}`)
    : `${SITE_CONFIG.siteUrl}/Logo.svg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    headline: project.title,
    description: plainDesc,
    image: [fullImageUrl],
    url: getCanonicalUrl(`/projects/${project.slug}`),
    dateCreated: new Date(project.createdAt).toISOString(),
    creator: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
    },
    genre: project.category || 'پروژه صنعتی و ساختمانی',
    contentLocation: project.location ? {
      '@type': 'Place',
      name: project.location,
    } : undefined,
    inLanguage: 'fa-IR',
  };
}

/**
 * اسکیمای سوالات متداول (FAQPage Schema)
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
