# قوانین RTL و دسترسی‌پذیری (Accessibility)

این قوانین **بدون استثنا** در تمام کامپوننت‌های UI پروژه خوش‌صنعت پایدار باید رعایت شوند.

---

## ۱. RTL (راست‌به‌چپ)

### الزامات:
- تمام سکشن‌ها و فرم‌ها: `dir="rtl"`
- `text-right` برای بلوک‌های متنی (مگر اینکه center باشد)
- شماره تلفن و ایمیل: `dir="ltr"` + `text-left`
- از `gap` و `space-x/y` استفاده کن نه `ml-*` / `mr-*`
  - استثنا: `mx-auto` برای وسط‌چین مجاز است
- آیکون‌های جهت‌دار (arrow): `rtl:rotate-180` یا `group-hover:-translate-x-1`
- `flex-row-reverse` نزن — از `dir="rtl"` + `flex-row` استفاده کن

### ممنوعیت‌ها:
- `float: left/right` → از Flexbox/Grid استفاده کن
- `padding-left` / `padding-right` مستقیم → از `px-*` استفاده کن
- `text-align: left` روی متن فارسی

---

## ۲. دسترسی‌پذیری (a11y)

### فرم‌ها:
- هر `<input>` حتماً `<label>` با `htmlFor` متصل داشته باشد
- فیلدهای الزامی: `required` + `aria-required="true"`
- پیام‌های خطا: `aria-describedby` مرتبط با فیلد
- placeholder جایگزین label نیست — هر دو لازم‌اند

### دکمه‌ها و لینک‌ها:
- هر `<button>` باید متن قابل خواندن یا `aria-label` فارسی داشته باشد
- دکمه‌های فقط-آیکون: `aria-label="توضیح عملکرد"` الزامی
- وضعیت فوکوس: `focus:outline-none focus:ring-2 focus:ring-[رنگ]` الزامی
- `tabIndex` منفی فقط برای عناصر تزئینی

### تصاویر:
- `alt` فارسی معنادار — نه `"image"` یا `"img"` یا خالی
- تصاویر تزئینی: `alt=""` + `aria-hidden="true"`
- لوگو: `alt="خوش صنعت پایدار"` یا `alt="KS Engineering"`

### رنگ‌ها و کنتراست:
- نسبت کنتراست متن/پس‌زمینه: حداقل **4.5:1** (WCAG AA)
- سفید روی `ks-dark (#1a1d21)` → ✅ نسبت ≈ 16:1
- `text-gray-400` روی `ks-dark` → ⚠️ مرزی — ترجیحاً `text-gray-300`
- `text-gray-600` روی `#f7f9fa` → ✅ قابل قبول

### حرکت و انیمیشن:
- **الزامی:** بررسی `prefers-reduced-motion: reduce`
- در CSS: غیرفعال‌سازی `animation-duration` و `transition-duration`
- در Framer Motion: استفاده از `useReducedMotion()`
- در GSAP: بررسی `matchMedia('(prefers-reduced-motion: reduce)')`
- Marquee‌ها باید با `hover:[animation-play-state:paused]` قابل توقف باشند

### ساختار معنایی:
- `<section>` برای بخش‌های اصلی
- `<header>` برای هدر
- `<footer>` برای فوتر
- `<nav>` برای ناوبری
- `<main>` برای محتوای اصلی (فقط یک بار در صفحه)
- سلسله‌مراتب heading: `h1` → `h2` → `h3` بدون پرش

---

## ۳. SEO و Semantic HTML

- از `<Link>` (next/link) استفاده کن نه `<a>`
- عناوین صفحات از `generateMetadata()` بیایند
- `lang="fa"` روی `<html>`
- `<JsonLd>` برای Schema.org داده‌ها
