---
name: ks-ui-standards
description: >-
  UI component patterns and standards for Khoshsanat Paydar website.
  Use this skill when the user asks to create new UI components, redesign
  existing sections, build new pages, or review component structure. This
  skill defines standard patterns for Cards, Buttons, Sections, Modals, Forms,
  and responsive layout rules specific to RTL industrial design. It also covers
  Glassmorphism guidelines, image handling, and component composition patterns.
---

# استانداردهای UI/UX خوش‌صنعت پایدار (KS UI Standards)

این مهارت الگوهای ساخت کامپوننت و قوانین طراحی رابط کاربری پروژه خوش‌صنعت پایدار را تعریف می‌کند.

---

## ۱. قبل از هر کار

1. فایل `DESIGN.md` در ریشه پروژه را بخوان.
2. مهارت `ks-design-system` را فعال کن — رنگ‌ها و توکن‌ها آنجا تعریف شده‌اند.
3. اگر انیمیشن دارد، مهارت `ks-animation-engine` را هم بخوان.

---

## ۲. اصول معماری کامپوننت

### ساختار پوشه‌ها:
```text
components/
├── layout/        → Header, Footer (کامپوننت‌های ساختاری)
├── sections/      → HeroSlider, WhyUs, ... (بخش‌های صفحه)
├── ui/            → Button, Card, Modal (عناصر قابل بازاستفاده)
├── icons/         → SocialIcons, ... (آیکون‌ها)
├── seo/           → JsonLd, Analytics (SEO)
├── products/      → کامپوننت‌های محصولات
├── projects/      → کامپوننت‌های پروژه‌ها
└── education/     → کامپوننت‌های آموزش
```

### قوانین ساختاری:
- هر کامپوننت سکشن → یک فایل مستقل در `components/sections/`
- کامپوننت‌های `'use client'` فقط در صورت نیاز به state/effect/event
- داده‌خوانی سرور → Server Component (بدون `'use client'`)
- Props با TypeScript interface تعریف شود (نه type alias)

---

## ۳. الگوهای کامپوننت استاندارد

### ۳.۱ سکشن (Section Pattern)

```tsx
<section className="py-16 px-4 bg-[رنگ‌پس‌زمینه]" dir="rtl">
  <div className="max-w-7xl mx-auto">
    {/* هدر سکشن */}
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[رنگ‌عنوان]">
          عنوان سکشن
        </h2>
        <p className="text-sm md:text-base text-gray-500 mt-1">
          توضیح کوتاه
        </p>
      </div>
      <Link href="/..." className="...">دکمه عملیات</Link>
    </div>
    
    {/* محتوای اصلی */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* کارت‌ها */}
    </div>
  </div>
</section>
```

### ۳.۲ کارت (Card Pattern)

```tsx
// کارت تصویری با overlay
<div className="relative rounded-2xl overflow-hidden group bg-ks-dark-900">
  <img 
    src={imageUrl} 
    alt={title}
    loading="lazy"
    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
  />
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
  <div className="absolute bottom-0 inset-x-0 p-4 md:p-6">
    <h3 className="text-sm md:text-base font-bold text-white line-clamp-2">
      {title}
    </h3>
  </div>
</div>
```

### ۳.۳ دکمه (Button Patterns)

```tsx
// دکمه اصلی (Primary)
<button className="px-6 py-2.5 bg-ks-blue-500 hover:bg-ks-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
  متن دکمه
</button>

// دکمه خطی (Outline)
<button className="px-6 py-3 text-sm font-semibold text-[#2D3644] bg-transparent border border-[#2D3644] rounded-2xl hover:bg-ks-blue-500 hover:border-ks-blue-500 hover:text-white transition-all duration-300">
  متن دکمه
</button>

// دکمه شبح (Ghost) — برای تم تیره
<button className="flex items-center gap-1 bg-transparent border border-white text-white rounded-full px-4 py-2 transition-all hover:bg-white/10">
  متن دکمه
</button>
```

---

## ۴. Glassmorphism صنعتی

### کِی استفاده کنیم؟
- Overlay های منوی موبایل (`backdrop-blur-sm` با `bg-black/60`)
- پشت کارت‌های پروژه در حالت فلیپ
- کارت‌های ویژه روی تصاویر هیرو

### کِی استفاده نکنیم؟
- روی سکشن‌های معمولی (مثل WhyUs) — پس‌زمینه ساده بهتر است
- روی کارت‌های محصول در Marquee — تخت و ساده
- روی فرم‌ها — خوانایی مهم‌تر از زیبایی است

### الگوی شیشه‌ای استاندارد (تم تیره):
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-radius: 16px; /* rounded-2xl */
```

---

## ۵. مدیریت تصاویر

### الزامات:
- تمام `<img>` → `loading="lazy"` (به‌جز هیرو اسلایدر)
- `alt` فارسی معنادار — نه `"image"` یا خالی
- `object-cover` برای تصاویر کارت
- `object-contain` برای لوگوها

### Fallback:
- از کامپوننت `ImageWithFallback` استفاده کن (موجود در `components/ui/`)
- fallback همیشه `/Logo.svg`

---

## ۶. Responsive Design Rules

### رویکرد: Mobile-first + RTL-first

```
موبایل (پایه)    → 1 ستون، padding کمتر، فونت کوچکتر
sm (≥640px)      → 2 ستون
md (≥768px)      → 3 ستون، هدر دسکتاپ، padding بیشتر
lg (≥1024px)     → 4 ستون، ارتفاع‌های بزرگتر
```

### RTL Considerations:
- `text-right` برای بلوک‌های متنی فارسی
- `dir="rtl"` روی سکشن‌ها
- `dir="ltr"` فقط برای شماره تلفن و ایمیل
- از `gap` استفاده کن نه `margin-left/right`
- آیکون arrow باید `rtl:rotate-180` داشته باشد

---

## ۷. قوانین بازدارنده

### ⛔ هرگز:
- `style={{ }}` inline برای رنگ‌ها → از کلاس‌های Tailwind یا CSS variables استفاده کن
  (استثنا: مقادیر پویا از دیتابیس مانند `titleColor` در HeroSlider)
- `!important` در Tailwind → نشانه مشکل ساختاری
- `z-index` بالای `50` → حداکثر `z-50` (هدر `z-40`، منو موبایل `z-50`)
- کامپوننت تو در تو بیش از ۳ سطح (Card > Content > Element)

### ✅ همیشه:
- `transition-*` روی عناصر تعاملی (hover, focus)
- `focus:outline-none focus:ring-2` روی دکمه‌ها
- `line-clamp-*` روی متن‌های کارت
- `truncate` یا `line-clamp-1` روی عناوین

---

## مرجع تکمیلی

برای نمونه‌کدهای ورودی/خروجی هر الگو:
[component-patterns.md](./references/component-patterns.md)
