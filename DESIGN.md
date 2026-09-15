# 🎨 DNA طراحی — خوش‌صنعت پایدار (Khosh Sanat Paydar)

> **این فایل منبع حقیقت (Single Source of Truth) هویت بصری پروژه است.**
> قبل از هر تغییر UI، این فایل را بخوان.

---

## هویت برند

| ویژگی | مقدار |
|---|---|
| **نام فارسی** | خوش‌صنعت پایدار |
| **نام انگلیسی** | Khosh Sanat Paydar / KS Engineering |
| **حوزه فعالیت** | مهندسی، تولید و اتصالات مدرن صنعتی |
| **زبان اصلی** | فارسی (RTL) |
| **سبک طراحی** | صنعتی-مدرن تیره با لمس‌های شیشه‌ای ظریف |
| **شخصیت برند** | حرفه‌ای، مطمئن، مهندسی‌شده، دقیق |

---

## پلت رنگی

### اصلی (Primary)
```
#2563EB  → آبی اصلی (دکمه‌ها، CTA، لینک‌ها)
#1d4ed8  → آبی تیره (Hover)
#60a5fa  → آبی روشن (تأکید، هاور متن)
#eff6ff  → آبی بسیار روشن (پس‌زمینه منوی موبایل)
```

### خنثی تیره (Industrial Dark)
```
#1a1d21  → پس‌زمینه اصلی بدنه (ks-dark)
#24272c  → پس‌زمینه کارت‌ها (ks-gray)
#2D3644  → هدر صفحات داخلی
#272727  → فوتر
```

### خنثی روشن
```
#f7f9fa  → پس‌زمینه سکشن‌های روشن
#f1f1f1  → پس‌زمینه ثانویه
#e9e9e9  → خطوط جدا
#111111  → متن تیره
```

### ⛔ ممنوع
```
❌ بنفش / ارغوانی / صورتی / نارنجی / سبز فلورسنت
❌ گرادیان‌های رنگارنگ بی‌هدف
❌ سایه‌های تیره بالای rgba(0,0,0,0.3)
```

---

## تایپوگرافی

```
فونت: Vazir (محلی - woff2)
وزن‌های مجاز: 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold)

h1 (هیرو)    → font-thin,  3rem,     line-height: 1.1
h2 (سکشن)    → font-bold,  1.5-1.875rem, line-height: 1.3
h3 (کارت)    → font-bold,  1.125-1.25rem, line-height: 1.4
body          → font-light, 0.875-1rem, line-height: 1.75 (relaxed)
button        → font-bold,  0.875rem, line-height: 1.25
caption       → font-medium, 0.75-0.875rem

⛔ ممنوع: Inter, Roboto, Poppins, یا هر فونت لاتین به عنوان فونت اصلی
```

---

## فاصله‌گذاری (Spacing)

```
مبنا: مضارب 4px

کارت موبایل    → p-4 (16px)
کارت دسکتاپ   → p-6 (24px)
بین عناصر grid → gap-6 (24px)
بین ستون‌ها    → gap-8 (32px)
بین سکشن‌ها   → py-16 (64px)
هدر سکشن      → mb-10 (40px)
فوتر بالا     → pt-20 (80px)
max-width      → max-w-7xl (1280px)
```

---

## سایه‌ها

```
تخت (Marquee)  → shadow-none
هدر            → shadow-sm / shadow-md
CTA موبایل     → shadow-lg
کارت پروژه    → shadow-xl
منوی موبایل   → shadow-2xl
معلق (Float)   → 0 20px 40px rgba(0,0,0,0.05)

⛔ ممنوع: سایه‌های رنگی (مثل shadow-blue-500/50)
```

---

## شعاع گوشه‌ها

```
دکمه       → rounded-xl (12px)
کارت       → rounded-2xl (16px)
کارت بزرگ  → rounded-3xl (24px)
pill       → rounded-full
```

---

## Glassmorphism (ظریف و صنعتی)

```css
/* تم تیره */
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
backdrop-filter: blur(12px);

/* فقط برای: overlay منو، پشت کارت فلیپ، عناصر ویژه روی تصویر */
/* هرگز برای: سکشن‌های معمولی، کارت‌های محصول، فرم‌ها */
```

---

## انیمیشن

```
موتور اصلی: Framer Motion (layout/mount) + GSAP (scroll)
Easing:     ease-out (ورود) / ease-in (خروج)
مدت:        0.3s - 1.5s
Stagger:    0.08s - 0.12s

✅ انیمیشن مداوم فقط: transform, opacity
⛔ انیمیشن مداوم ممنوع: box-shadow, filter, width, height
⚠️ الزامی: prefers-reduced-motion: reduce
```

---

## Breakpoints

```
Mobile (پایه)  → < 640px  → 1 ستون
sm             → ≥ 640px  → 2 ستون
md             → ≥ 768px  → 3 ستون + هدر دسکتاپ
lg             → ≥ 1024px → 4 ستون
```

---

## پشته تکنولوژی

```
Framework:    Next.js 16 + React 19 + TypeScript
Styling:      Tailwind CSS 4 + CSS custom properties
Animation:    Framer Motion + GSAP 3.15
Icons:        Lucide React
ORM:          Prisma 5.22
Font:         Vazir (local woff2)
```
