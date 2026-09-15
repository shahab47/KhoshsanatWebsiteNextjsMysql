---
name: ks-design-system
description: >-
  Khoshsanat Paydar brand design system and visual identity tokens.
  Use this skill whenever the user asks to create, modify, or review any UI
  component, page layout, color scheme, typography, or visual element in the
  Khoshsanat engineering website. This skill defines the authoritative color
  palette, spacing scale, typography system, shadow hierarchy, and border-radius
  standards for the brand. Always read DESIGN.md at the project root first.
---

# سیستم طراحی خوش‌صنعت پایدار (KS Design System)

این مهارت هویت بصری و توکن‌های طراحی اختصاصی پروژه وب‌سایت مهندسی خوش‌صنعت پایدار را تعریف می‌کند. هر تغییر UI باید مطابق این سیستم باشد.

---

## ۱. قبل از هر کار

1. فایل `DESIGN.md` در ریشه پروژه را بخوان — این منبع حقیقت توکن‌هاست.
2. فایل `tailwind.config.js` را بررسی کن — توکن‌ها باید با مقادیر Tailwind همخوانی داشته باشند.
3. فایل `app/globals.css` را بررسی کن — متغیرهای CSS سفارشی اینجا تعریف شده‌اند.

---

## ۲. پلت رنگی برند

### رنگ‌های اصلی (Primary)

| نام توکن | کد هکس | کاربرد |
|---|---|---|
| `--ks-blue-500` | `#2563EB` | رنگ اصلی برند — دکمه‌ها، لینک‌ها، آیکون‌های فعال |
| `--ks-blue-600` | `#1d4ed8` | Hover state دکمه‌ها |
| `--ks-blue-400` | `#60a5fa` | رنگ تأکیدی روشن (Hover متن، بَج‌ها) |
| `--ks-blue-50` | `#eff6ff` | پس‌زمینه‌های بسیار روشن (منوی موبایل) |

### رنگ‌های خنثی تیره صنعتی (Neutral Dark)

| نام توکن | کد هکس | کاربرد |
|---|---|---|
| `--ks-dark-950` | `#1a1d21` | پس‌زمینه اصلی بدنه (ks-dark) |
| `--ks-dark-900` | `#24272c` | پس‌زمینه کارت‌ها (ks-gray) |
| `--ks-dark-800` | `#2D3644` | هدر صفحات داخلی |
| `--ks-dark-700` | `#272727` | فوتر |
| `--ks-dark-600` | `#3a3a3a` | حالت Hover عناصر فوتر |

### رنگ‌های خنثی روشن (Neutral Light)

| نام توکن | کد هکس | کاربرد |
|---|---|---|
| `--ks-light-50` | `#f7f9fa` | پس‌زمینه سکشن‌های روشن (مانند WhyUs) |
| `--ks-light-100` | `#f1f1f1` | پس‌زمینه اسکرول‌بار |
| `--ks-light-200` | `#e9e9e9` | خطوط جداکننده |
| `--ks-light-text` | `#111111` | متن تیره روی پس‌زمینه روشن |

### ⛔ رنگ‌های ممنوع

- **بنفش/ارغوانی** به هر شکلی — هویت برند آبی-صنعتی است
- **صورتی، نارنجی، سبز فلورسنت** — نامناسب برای صنعت سنگین
- **گرادیان‌های رنگارنگ بی‌هدف** — فقط گرادیان‌های تک‌رنگ شفافیتی مجاز هستند
  (مثال مجاز: `from-black/80 via-transparent to-black/70`)

---

## ۳. تایپوگرافی

| عنصر | فونت | وزن | اندازه | Line-height |
|---|---|---|---|---|
| `h1` (عنوان هیرو) | Vazir | `font-thin (100)` | `3rem` (48px) | `1.1` |
| `h2` (عنوان سکشن) | Vazir | `font-bold (700)` | `1.5rem - 1.875rem` | `1.3` |
| `h3` (عنوان کارت) | Vazir | `font-bold (700)` | `1.125rem - 1.25rem` | `1.4` |
| `body` (متن بدنه) | Vazir | `font-light (300)` | `0.875rem - 1rem` | `1.75 (relaxed)` |
| `small` (متن کمکی) | Vazir | `font-medium (500)` | `0.75rem - 0.875rem` | `1.5` |
| `button` | Vazir | `font-bold (700)` | `0.875rem` | `1.25` |

### ⛔ فونت‌های ممنوع
- Inter, Roboto, Poppins یا هر فونت لاتین به عنوان فونت اصلی
- فونت Vazir فقط با وزن‌های تعریف‌شده (100, 300, 400, 500, 700) استفاده شود

---

## ۴. فاصله‌گذاری (Spacing Scale)

مبنا: مضارب **4px** (Tailwind standard)

| کلاس Tailwind | مقدار | کاربرد متداول |
|---|---|---|
| `p-4` / `gap-4` | 16px | فاصله داخلی کارت موبایل |
| `p-6` | 24px | فاصله داخلی کارت دسکتاپ |
| `p-8` | 32px | فاصله داخلی سکشن‌ها |
| `gap-6` | 24px | فاصله بین عناصر grid |
| `gap-8` | 32px | فاصله بین ستون‌های اصلی |
| `py-16` | 64px | فاصله بالا/پایین سکشن‌ها |
| `py-20` | 80px | فاصله فوتر بالا |
| `mb-10` | 40px | فاصله بعد از هدر سکشن |

---

## ۵. سایه‌ها (Shadow Hierarchy)

| سطح | مقدار | کاربرد |
|---|---|---|
| **بدون سایه** | `shadow-none` | کارت‌های محصول در Marquee (تخت) |
| **نرم** | `shadow-sm` | هدر اسکرول‌شده |
| **متوسط** | `shadow-md` | هدر صفحات داخلی |
| **بلند** | `shadow-lg` | دکمه CTA موبایل |
| **معلق** | `shadow-xl` | کارت‌های پروژه |
| **شیشه‌ای** | `shadow-2xl` | منوی موبایل |

### ⛔ سایه‌های ممنوع
- `box-shadow` با رنگ تیره بالای `rgba(0,0,0,0.3)` → حداکثر `rgba(0,0,0,0.05)` برای عناصر معلق
- سایه‌های رنگی (مثلاً `shadow-blue-500/50`) — فقط سایه‌های خاکستری مجازند

---

## ۶. شعاع گوشه‌ها (Border Radius)

| عنصر | کلاس | مقدار |
|---|---|---|
| دکمه‌های کوچک | `rounded-xl` | 12px |
| کارت‌ها | `rounded-2xl` | 16px |
| کارت‌های بزرگ | `rounded-3xl` | 24px |
| دکمه pill | `rounded-full` | 9999px |

---

## ۷. Breakpoints

| نام | مقدار | کاربرد |
|---|---|---|
| Mobile | `< 640px` | طراحی پایه (Mobile-first) |
| `sm` | `≥ 640px` | Grid 2 ستونه |
| `md` | `≥ 768px` | Grid 3 ستونه، هدر دسکتاپ |
| `lg` | `≥ 1024px` | Grid 4 ستونه |
| `max-w-7xl` | `1280px` | حداکثر عرض محتوا |

---

## مرجع تکمیلی

برای لیست کامل توکن‌ها و CSS variables، فایل زیر را بخوان:
[design-tokens.md](./references/design-tokens.md)
