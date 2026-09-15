<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ks-design-rules -->
# قوانین طراحی UI/UX — خوش‌صنعت پایدار

## الزام اول: خواندن DESIGN.md
قبل از هر تغییر بصری (رنگ، فاصله، فونت، انیمیشن، کامپوننت جدید)، فایل `DESIGN.md` در ریشه پروژه را بخوان. این فایل منبع حقیقت هویت بصری پروژه است.

## ممنوعیت‌های AI Slop
- ❌ رنگ بنفش، ارغوانی، صورتی، نارنجی یا سبز فلورسنت
- ❌ گرادیان‌های رنگارنگ بی‌هدف (فقط گرادیان‌های شفافیتی تک‌رنگ مجاز)
- ❌ سایه‌های تیره سنگین بالای `rgba(0,0,0,0.3)` یا سایه‌های رنگی
- ❌ فونت Inter, Roboto, Poppins به عنوان فونت اصلی (فقط Vazir)
- ❌ گوشه‌های بیش از حد گرد (`rounded-[40px]` و مشابه) — حداکثر `rounded-3xl`
- ❌ `!important` در Tailwind
- ❌ `z-index` بالای 50

## الزامات RTL
- تمام سکشن‌ها: `dir="rtl"`
- متن فارسی: `text-right`
- شماره تلفن/ایمیل: `dir="ltr"`
- از `gap` استفاده کن نه `margin-left/right`

## الزامات دسترسی‌پذیری
- بررسی `prefers-reduced-motion: reduce` قبل از هر انیمیشن
- `alt` فارسی معنادار برای تصاویر
- `aria-label` فارسی برای دکمه‌های فقط‌آیکون
- `focus:ring-2` روی عناصر تعاملی

## الزامات عملکردی
- `will-change: transform` روی عناصر انیمیشنی
- انیمیشن مداوم فقط: `transform` و `opacity`
- `loading="lazy"` روی تصاویر (به‌جز هیرو)
<!-- END:ks-design-rules -->
