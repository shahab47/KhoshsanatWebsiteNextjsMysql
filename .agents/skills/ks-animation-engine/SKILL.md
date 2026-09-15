---
name: ks-animation-engine
description: >-
  Animation and motion standards for Khoshsanat Paydar website.
  Use this skill whenever the user asks to add, modify, or debug animations,
  transitions, scroll effects, hover interactions, or any motion-related feature.
  This skill defines which animation engine to use (Framer Motion vs GSAP),
  performance rules, accessibility requirements (prefers-reduced-motion),
  and easing/timing standards.
---

# موتور انیمیشن خوش‌صنعت پایدار (KS Animation Engine)

این مهارت قوانین و استانداردهای انیمیشن در وب‌سایت خوش‌صنعت پایدار را تعریف می‌کند.

---

## ۱. انتخاب موتور انیمیشن

### Framer Motion — برای:
- انیمیشن‌های mount/unmount (`AnimatePresence`)
- انتقال‌های صفحه‌ای (Page transitions)
- انیمیشن‌های layout (مانند منوی موبایل)
- Hover/Tap interactions ساده

### GSAP + ScrollTrigger — برای:
- انیمیشن‌های وابسته به اسکرول (Scroll-triggered)
- انیمیشن‌های پیچیده timeline (چندمرحله‌ای)
- انیمیشن‌های عناصر متعدد با stagger
- Marquee و حرکت‌های بی‌پایان

### CSS @keyframes — برای:
- انیمیشن‌های ساده و تکراری (مثل pulse, spin)
- Marquee ساده (مانند ProductsMarquee فعلی)
- Progress bar ها

### ⛔ هرگز:
- jQuery animate یا Web Animations API مستقیم
- `setInterval` / `setTimeout` برای انیمیشن — از `requestAnimationFrame` استفاده کن
- دو موتور انیمیشن همزمان روی یک عنصر

---

## ۲. قوانین Easing و Timing

### استاندارد easing:
```
ease-out     → برای ورود عناصر (Enter)
ease-in      → برای خروج عناصر (Exit)  
ease-in-out  → برای تغییر حالت (Toggle/Switch)
```

### حداقل مدت انتقال:
```
Opacity transitions   → حداقل 0.3s
Transform transitions → حداقل 0.3s
Color transitions     → حداقل 0.2s
```

### Stagger (ورود پله‌ای):
```
عناصر grid/list → stagger: 0.08s تا 0.12s
```

### ⛔ ممنوعیت‌ها:
- تغییر حالت آنی (بدون transition) ← ممنوع
- `duration` بالای `1.5s` برای انیمیشن‌های تعاملی ← ممنوع
- `duration` زیر `0.15s` ← ممنوع (غیرقابل درک)

---

## ۳. عملکرد (Performance)

### الزامات GPU Acceleration:
```css
/* هر عنصر انیمیشنی باید داشته باشد: */
will-change: transform;
/* یا */
transform: translateZ(0); /* fallback */
```

### ⛔ ممنوعیت انیمیشن مداوم روی:
- `box-shadow` — فقط در hover/focus مجاز
- `filter` (blur, brightness) — فقط در hover/focus مجاز
- `border-radius` — هرگز انیمیشن نکن
- `width` / `height` — از `transform: scale()` استفاده کن

### ✅ ویژگی‌های مجاز برای انیمیشن مداوم:
- `transform` (translate, scale, rotate)
- `opacity`

### Marquee / حرکت بی‌پایان:
```css
.gpu-optimized {
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}
```

---

## ۴. دسترسی‌پذیری (Accessibility — حیاتی)

### الزام `prefers-reduced-motion`:

#### در CSS:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### در Framer Motion:
```tsx
import { useReducedMotion } from 'framer-motion';

function MyComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : 20 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    />
  );
}
```

#### در GSAP:
```ts
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  gsap.from('.card', {
    y: 50,
    opacity: 0,
    stagger: 0.1,
    scrollTrigger: { trigger: '.cards-section' }
  });
}
```

### ⛔ بدون بررسی `prefers-reduced-motion` هیچ انیمیشن اسکرول‌محور، Marquee یا جلوه فضایی ایجاد نکن.

---

## ۵. الگوهای انیمیشن مجاز

### ورود عنصر (Fade + Slide Up):
```tsx
// Framer Motion
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
/>
```

### انتقال اسلاید (Slide Transition):
```tsx
// Framer Motion — مانند منوی موبایل Header
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
/>
```

### Hover Scale روی کارت:
```tsx
// Tailwind CSS — مانند ProductsMarquee
className="transform group-hover:scale-110 transition-transform duration-700 ease-out"
```

### Scroll-triggered Stagger (GSAP):
```ts
gsap.from('.feature-card', {
  y: 40,
  opacity: 0,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: '.features-section',
    start: 'top 80%',
    toggleActions: 'play none none none',
  }
});
```

---

## ۶. چک‌لیست قبل از تحویل

- [ ] آیا `prefers-reduced-motion` بررسی شده؟
- [ ] آیا فقط `transform` و `opacity` انیمیشن مداوم دارند؟
- [ ] آیا `will-change` روی عناصر انیمیشنی اعمال شده؟
- [ ] آیا `duration` بین `0.15s` و `1.5s` است؟
- [ ] آیا stagger بین `0.08s` و `0.12s` است؟
- [ ] آیا دو موتور انیمیشن همزمان روی یک عنصر نیستند؟
