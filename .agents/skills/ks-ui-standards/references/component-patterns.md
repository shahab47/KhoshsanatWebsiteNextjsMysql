# الگوهای کامپوننت — نمونه‌های ورودی/خروجی (Few-shot Examples)

این فایل نمونه‌هایی از درخواست‌های کاربر و خروجی مورد انتظار عامل را نشان می‌دهد.

---

## نمونه ۱: ساخت کارت ویژگی (Feature Card)

### ورودی کاربر:
> «یک کارت ویژگی بساز که آیکون، عنوان و توضیح داشته باشد»

### ✅ خروجی صحیح:
```tsx
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center" dir="rtl">
      <div className="mb-3 p-3 rounded-full bg-gray-100 border border-gray-200 inline-flex">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 font-light leading-relaxed text-sm max-w-xs mx-auto">
        {description}
      </p>
    </div>
  );
}
```

### ❌ خروجی نادرست (AI Slop):
```tsx
// ❌ گرادیان بنفش
<div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-3xl shadow-2xl">
  // ❌ سایه سنگین رنگی
  <div className="shadow-purple-500/50 shadow-2xl">
    // ❌ فونت Inter
    <h3 className="font-inter text-2xl">Title</h3>
  </div>
</div>
```

---

## نمونه ۲: سکشن با grid واکنش‌گرا

### ورودی کاربر:
> «یک بخش نمایش خدمات با ۳ تا ۴ کارت بساز»

### ✅ خروجی صحیح:
```tsx
export default function ServicesSection() {
  const services = [/* ... */];
  
  return (
    <section className="py-16 px-4 bg-ks-dark" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-right mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            خدمات مهندسی
          </h2>
          <p className="text-sm text-gray-400 font-light">
            راهکارهای تخصصی برای پروژه‌های صنعتی
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="relative rounded-2xl overflow-hidden bg-ks-dark-900 border border-white/5 p-6 transition-all duration-300 hover:border-white/10"
            >
              <div className="text-ks-blue-400 mb-4">
                {service.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-gray-400 font-light leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**نکات کلیدی:**
- `bg-ks-dark` نه یک رنگ دلخواه
- `border border-white/5` به جای سایه سنگین
- `rounded-2xl` نه `rounded-3xl`
- `transition-all duration-300` روی hover
- `text-right` و `dir="rtl"` حفظ شده

---

## نمونه ۳: دکمه CTA با آیکون

### ورودی کاربر:
> «یک دکمه "مشاهده همه" بساز»

### ✅ خروجی صحیح:
```tsx
import Link from 'next/link';

<Link 
  href="/products" 
  className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#2D3644] bg-transparent border border-[#2D3644] rounded-2xl hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white transition-all duration-300 shadow-sm"
>
  مشاهده همه محصولات
  <svg 
    className="w-5 h-5 rtl:rotate-180 transform group-hover:-translate-x-1 transition-transform" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
</Link>
```

**نکات:**
- از الگوی `Link` (نه `<a>`) استفاده شده
- `rtl:rotate-180` برای جهت آیکون
- `group-hover:-translate-x-1` برای حرکت ظریف آیکون
- رنگ‌ها مطابق سیستم طراحی

---

## نمونه ۴: کارت شیشه‌ای روی تصویر

### ورودی کاربر:
> «یک overlay شیشه‌ای روی تصویر هیرو بساز»

### ✅ خروجی صحیح:
```tsx
<div className="relative">
  <img src={imageUrl} alt={alt} className="w-full h-[60vh] object-cover" />
  
  {/* Overlay شیشه‌ای */}
  <div className="absolute bottom-8 right-8 max-w-md p-6 rounded-2xl"
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
  >
    <h2 className="text-2xl font-bold text-white mb-2">
      عنوان
    </h2>
    <p className="text-sm text-gray-200 font-light leading-relaxed">
      توضیحات
    </p>
  </div>
</div>
```

### ❌ خروجی نادرست:
```tsx
// ❌ blur بیش از حد
style={{ backdropFilter: 'blur(40px)' }}
// ❌ شفافیت بیش از حد (ناخوانا)
style={{ background: 'rgba(255, 255, 255, 0.01)' }}
// ❌ سایه سنگین رنگی
className="shadow-2xl shadow-blue-500/30"
```

---

## نمونه ۵: فرم تماس RTL

### ورودی کاربر:
> «فرم استعلام قیمت بساز»

### ✅ خروجی صحیح (ساختار پایه):
```tsx
<form className="max-w-2xl mx-auto space-y-6" dir="rtl">
  <div>
    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
      نام و نام خانوادگی
    </label>
    <input
      id="name"
      type="text"
      required
      aria-required="true"
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-ks-blue-500 focus:border-transparent transition-all"
      placeholder="مثال: علی محمدی"
    />
  </div>
  
  <div>
    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
      شماره تماس
    </label>
    <input
      id="phone"
      type="tel"
      dir="ltr"
      required
      aria-required="true"
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ks-blue-500 focus:border-transparent transition-all"
      placeholder="09xx xxx xxxx"
    />
  </div>
  
  <button
    type="submit"
    className="w-full px-6 py-3 bg-ks-blue-500 hover:bg-ks-blue-600 text-white rounded-xl text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ks-blue-500 focus:ring-offset-2"
  >
    ارسال درخواست
  </button>
</form>
```

**نکات:**
- `dir="ltr"` فقط روی فیلد تلفن
- `aria-required` برای دسترسی‌پذیری
- `focus:ring-2` برای وضوح فوکوس
- `space-y-6` برای فاصله یکنواخت بین فیلدها
