'use client';
// مسیر فایل: src/app/khoshmin/page.tsx

import React, { useEffect, useState } from 'react';
import {
  Image as ImageIcon, Type, Briefcase, Package, Users, ArrowLeft,
  Building2, GraduationCap, Bell, UserPlus, HardDrive, TrendingUp, Activity, Mail,
  Landmark, ShoppingCart, Factory, FileSpreadsheet, ShieldCheck
} from 'lucide-react';

interface CustomerStats {
  total: number;
  unreadMessages: number;
  newCustomers: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<{ todayVisits: number; uniqueVisitors: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authRes = await fetch('/api/auth');
        const authData = await authRes.json();
        if (authData.user) setUser(authData.user);

        const statsRes = await fetch('/api/khoshmin/customers/stats');
        const statsData = await statsRes.json();
        setCustomerStats(statsData);

        const analyticsRes = await fetch('/api/khoshmin/analytics?range=today');
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalyticsStats({
            todayVisits: analyticsData.kpi?.todayVisits || 0,
            uniqueVisitors: analyticsData.kpi?.uniqueVisitors || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // تمام کارت‌های پیش‌فرض داشبورد
  const allCards = [
    {
      href: '/khoshmin/treasury',
      title: 'خزانه‌داری، چک و بانک‌ها',
      desc: 'مدیریت حساب‌های بانکی، ثبت و استعلام چک‌های صیادی، صندوق نقدی و مغایرت‌گیری',
      icon: <Landmark size={32} />,
      color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-600',
    },
    {
      href: '/khoshmin/procurement',
      title: 'خرید، تدارکات و باسکول',
      desc: 'سفارشات خرید (PO)، قبض ورود بار و توزین باسکول دیجیتال، فاکتورهای خرید و ظهرنویسی',
      icon: <ShoppingCart size={32} />,
      color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      hover: 'hover:border-amber-300 dark:hover:border-amber-600',
    },
    {
      href: '/khoshmin/production',
      title: 'مهندسی تولید و سفارش کار',
      desc: 'فرمول ساخت (BOM)، رهگیری کالای در جریان ساخت (WIP)، تسهیم سربار و محاسبه COGM',
      icon: <Factory size={32} />,
      color: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
      hover: 'hover:border-cyan-300 dark:hover:border-cyan-600',
    },
    {
      href: '/khoshmin/payroll',
      title: 'حقوق و دستمزد پرسنل',
      desc: 'محاسبه حقوق ماهانه قانون کار، بیمه تامین اجتماعی ۳۰٪، مالیات ماده ۸۶ و دیسکت پایا',
      icon: <Users size={32} />,
      color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-600',
    },
    {
      href: '/khoshmin/reports',
      title: 'گزارش‌های مالی و سامانه مودیان',
      desc: 'تراز آزمایشی ۴ و ۸ ستونی، دفتر روزنامه، ترازنامه، سود و زیان و خروجی رسمی مودیان',
      icon: <FileSpreadsheet size={32} />,
      color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      hover: 'hover:border-blue-300 dark:hover:border-blue-600',
    },
    {
      href: '/khoshmin/customers',
      title: 'مدیریت مشتریان و حساب‌ها',
      desc: 'لیست مشتریان، تراز بدهکاری/بستانکاری، پیام‌های جدید و مدیریت سفارشات',
      icon: <UserPlus size={32} />,
      color: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
      hover: 'hover:border-indigo-300 dark:hover:border-indigo-600',
      badge: customerStats && (customerStats.unreadMessages > 0 || customerStats.newCustomers > 0) ? {
        count: (customerStats.unreadMessages + customerStats.newCustomers),
        text: `${customerStats.unreadMessages} پیام جدید • ${customerStats.newCustomers} مشتری جدید`
      } : null
    },
    {
      href: '/khoshmin/analytics',
      title: 'آمار و تحلیل هوشمند بازدید',
      desc: analyticsStats
        ? `امروز: ${analyticsStats.todayVisits.toLocaleString('fa-IR')} بازدید (${analyticsStats.uniqueVisitors.toLocaleString('fa-IR')} مشتری یکتا)`
        : 'مشاهده شهرها، منابع ورودی (گوگل، اینستاگرام) و صفحات پربازدید',
      icon: <TrendingUp size={32} />,
      color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      hover: 'hover:border-blue-300 dark:hover:border-blue-600',
      badge: analyticsStats && analyticsStats.todayVisits > 0 ? {
        count: analyticsStats.todayVisits,
        text: `امروز: ${analyticsStats.todayVisits.toLocaleString('fa-IR')} بازدید`
      } : null
    },
    {
      href: '/khoshmin/users',
      title: user?.role === 'MAIN_ADMIN' ? 'مدیریت کاربران' : 'پروفایل من',
      desc: user?.role === 'MAIN_ADMIN' ? 'تنظیمات مدیران و سطح دسترسی' : 'تغییر رمز عبور شخصی',
      icon: <ShieldCheck size={32} />,
      color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
      hover: 'hover:border-purple-300 dark:hover:border-purple-600'
    },
    {
      href: '/khoshmin/emails',
      title: 'سیستم ایمیل سازمانی',
      desc: 'ارسال ایمیل رسمی با دامنه khoshsanat.ir، تاریخچه و تنظیمات SMTP',
      icon: <Mail size={32} />,
      color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      hover: 'hover:border-blue-300 dark:hover:border-blue-600'
    },
    {
      href: '/khoshmin/projects',
      title: 'مدیریت پروژه‌ها',
      desc: 'ثبت و ویرایش پروژه‌های انجام شده کارخانه',
      icon: <Building2 size={32} />,
      color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      hover: 'hover:border-amber-300 dark:hover:border-amber-600'
    },
    {
      href: '/khoshmin/education',
      title: 'مدیریت آکادمی',
      desc: 'مقالات آموزشی، مقالات مهندسی و اخبار سایت',
      icon: <GraduationCap size={32} />,
      color: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
      hover: 'hover:border-rose-300 dark:hover:border-rose-600'
    },
    {
      href: '/khoshmin/products',
      title: 'کاتالوگ محصولات',
      desc: 'دسته‌بندی، مقاطع فولادی و تجهیزات صنعتی',
      icon: <Package size={32} />,
      color: 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
      hover: 'hover:border-orange-300 dark:hover:border-orange-600'
    },
    {
      href: '/khoshmin/media',
      title: 'فایل منیجر',
      desc: 'مدیریت فضای ابری و فایل‌های رسانه',
      icon: <HardDrive size={32} />,
      color: 'bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
      hover: 'hover:border-teal-300 dark:hover:border-teal-600'
    },
    {
      href: '/khoshmin/slider',
      title: 'مدیریت اسلایدر',
      desc: 'تصاویر و بنرهای هیرو صفحه اصلی',
      icon: <ImageIcon size={32} />,
      color: 'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
      hover: 'hover:border-sky-300 dark:hover:border-sky-600'
    },
    {
      href: '/khoshmin/logo',
      title: 'مدیریت لوگو و برند',
      desc: 'تغییر هویت بصری و نشان تجاری',
      icon: <Briefcase size={32} />,
      color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
      hover: 'hover:border-purple-300 dark:hover:border-purple-600'
    },
    {
      href: '/khoshmin/texts',
      title: 'مدیریت متن‌ها',
      desc: 'ویرایش تیترها و متون عمومی بخش‌های سایت',
      icon: <Type size={32} />,
      color: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
      hover: 'hover:border-cyan-300 dark:hover:border-cyan-600'
    },
  ];

  // تعیین مسیرهای مجاز برای کاربر فعلی
  const getUserAllowedRoutes = (): string[] => {
    if (!user) return [];
    if (user.role === 'MAIN_ADMIN') return allCards.map(card => card.href);
    try {
      return user.allowedPaths ? user.allowedPaths.split(',').map((p: string) => p.trim()) : [];
    } catch {
      return [];
    }
  };

  const allowedRoutes = getUserAllowedRoutes();
  const visibleCards = allCards.filter(card => {
    if (user?.role === 'MAIN_ADMIN') return true;
    if (card.href === '/khoshmin/users') return true;
    return allowedRoutes.includes(card.href);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 font-vazir">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700/60 p-8 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
            {user?.name ? `${user.name} عزیز، خوش‌ آمدید 👋` : 'خوش آمدید 👋'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            به پنل یکپارچه مهندسی و مدیریت صنعتی خوش‌صنعت پایدار خوش آمدید. ماژول‌های حسابداری دوبل، خزانه‌داری، زنجیره تامین و خط تولید آماده استفاده هستند.
          </p>
        </div>
        {user?.role && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${user.role === 'MAIN_ADMIN' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}>
            دسترسی: {user.role === 'MAIN_ADMIN' ? 'مدیر ارشد کارخانه' : 'کارشناس سیستم'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleCards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className={`flex flex-col p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl transition-all group ${card.hover} shadow-sm hover:shadow-lg relative hover:bg-slate-50/50 dark:hover:bg-slate-750/50`}
          >
            {card.badge && (
              <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-xs rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1 z-10 font-bold">
                <Activity size={12} />
                <span>{card.badge.text}</span>
              </div>
            )}

            <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-inner relative`}>
              {card.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{card.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">{card.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
              ورود به بخش <ArrowLeft size={14} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}