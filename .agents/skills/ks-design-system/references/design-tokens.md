# مرجع کامل توکن‌های طراحی (Design Tokens Reference)

این فایل مرجع تکمیلی توکن‌های CSS و Tailwind برای سیستم طراحی خوش‌صنعت پایدار است.

---

## CSS Custom Properties

این متغیرها باید در `app/globals.css` تعریف شوند:

```css
:root {
  /* === Primary Blue === */
  --ks-blue-50:  #eff6ff;
  --ks-blue-100: #dbeafe;
  --ks-blue-200: #bfdbfe;
  --ks-blue-300: #93c5fd;
  --ks-blue-400: #60a5fa;
  --ks-blue-500: #2563eb;   /* اصلی */
  --ks-blue-600: #1d4ed8;   /* Hover */
  --ks-blue-700: #1e40af;
  --ks-blue-800: #1e3a8a;
  --ks-blue-900: #172554;

  /* === Neutral Dark (Industrial) === */
  --ks-dark-950: #1a1d21;   /* bg-ks-dark — پس‌زمینه اصلی */
  --ks-dark-900: #24272c;   /* bg-ks-gray — کارت‌ها */
  --ks-dark-800: #2D3644;   /* هدر داخلی */
  --ks-dark-700: #272727;   /* فوتر */
  --ks-dark-600: #3a3a3a;   /* hover فوتر */
  --ks-dark-500: #4a4a4a;
  --ks-dark-400: #6b7280;
  --ks-dark-300: #858990;   /* آیکون‌های خنثی */

  /* === Neutral Light === */
  --ks-light-50:  #f7f9fa;  /* سکشن‌های روشن */
  --ks-light-100: #f1f1f1;
  --ks-light-200: #e9e9e9;  /* خطوط جدا */
  --ks-light-300: #e2e8f0;  /* selection */
  --ks-light-text: #111111; /* متن تیره */

  /* === Semantic === */
  --ks-success: #22c55e;
  --ks-warning: #f59e0b;
  --ks-error:   #ef4444;
  --ks-info:    var(--ks-blue-400);

  /* === Surfaces === */
  --ks-surface-glass: rgba(255, 255, 255, 0.05);
  --ks-surface-glass-border: rgba(255, 255, 255, 0.1);
  --ks-surface-glass-hover: rgba(255, 255, 255, 0.08);
  --ks-overlay-dark: rgba(0, 0, 0, 0.6);
  --ks-overlay-medium: rgba(0, 0, 0, 0.4);

  /* === Typography === */
  --font-vazir: 'Vazir', system-ui, -apple-system, sans-serif;

  /* === Shadows === */
  --ks-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --ks-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --ks-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05);
  --ks-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.05);
  --ks-shadow-float: 0 20px 40px rgba(0, 0, 0, 0.05);

  /* === Border Radius === */
  --ks-radius-sm: 8px;
  --ks-radius-md: 12px;    /* rounded-xl */
  --ks-radius-lg: 16px;    /* rounded-2xl */
  --ks-radius-xl: 24px;    /* rounded-3xl */
  --ks-radius-full: 9999px;

  /* === Transitions === */
  --ks-transition-fast: 0.2s ease;
  --ks-transition-normal: 0.3s ease-out;
  --ks-transition-slow: 0.5s ease-out;
  --ks-transition-spring: 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Tailwind Config Mapping

مقادیر بالا باید با `tailwind.config.js` هماهنگ باشند:

```js
// tailwind.config.js — extend.colors
colors: {
  ks: {
    blue: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#2563eb',  // DEFAULT
      600: '#1d4ed8',
      700: '#1e40af',
      800: '#1e3a8a',
      900: '#172554',
    },
    dark: {
      DEFAULT: '#1a1d21', // bg-ks-dark
      950: '#1a1d21',
      900: '#24272c',     // bg-ks-gray  
      800: '#2D3644',
      700: '#272727',
      600: '#3a3a3a',
    },
    light: {
      50:  '#f7f9fa',
      100: '#f1f1f1',
      200: '#e9e9e9',
    },
  },
},
```

---

## مقیاس فاصله‌گذاری رایج

```
4px   → p-1, m-1, gap-1
8px   → p-2, m-2, gap-2
12px  → p-3, m-3, gap-3
16px  → p-4, m-4, gap-4    ← پایه
24px  → p-6, m-6, gap-6
32px  → p-8, m-8, gap-8
40px  → p-10, mb-10
48px  → p-12
64px  → py-16              ← بین سکشن‌ها
80px  → py-20              ← فوتر
```

---

## Glassmorphism Tokens

برای عناصر شیشه‌ای در تم تیره:

```css
.glass-card {
  background: var(--ks-surface-glass);
  border: 1px solid var(--ks-surface-glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--ks-radius-lg);
}

.glass-card:hover {
  background: var(--ks-surface-glass-hover);
}
```

برای عناصر شیشه‌ای در تم روشن:

```css
.glass-card-light {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--ks-shadow-float);
}
```
