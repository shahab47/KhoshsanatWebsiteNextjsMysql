'use client';
// مسیر فایل: src/app/khoshmin/page.tsx

import React, { useEffect, useState } from 'react';
import {
  Image as ImageIcon, Type, Briefcase, Package, Users, ArrowLeft,
  Building2, GraduationCap, Bell, UserPlus, HardDrive, TrendingUp, Activity, Mail
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

  // تمام کارت‌های پیش‌فرض
  const allCards = [
    {
      href: '/khoshmin/analytics',
      title: 'آمار و تحلیل هوشمند بازدید',
      desc: analyticsStats
        ? `امروز: ${analyticsStats.todayVisits.toLocaleString('fa-IR')} بازدید (${analyticsStats.uniqueVisitors.toLocaleString('fa-IR')} مشتری یکتا)`
        : 'مشاهده شهرها، منابع ورودی (گوگل، اینستاگرام) و صفحات پربازدید',
      icon: <TrendingUp size={32} />,
      color: 'bg-blue-100 text-blue-600',
      hover: 'hover:bg-blue-50 hover:border-blue-300',
      badge: analyticsStats && analyticsStats.todayVisits > 0 ? {
        count: analyticsStats.todayVisits,
        text: `امروز: ${analyticsStats.todayVisits.toLocaleString('fa-IR')} بازدید`
      } : null
    },
    {
      href: '/khoshmin/users',
      title: user?.role === 'MAIN_ADMIN' ? 'مدیریت کاربران' : 'پروفایل من',
      desc: user?.role === 'MAIN_ADMIN' ? 'تنظیمات مدیران و سطح دسترسی' : 'تغییر رمز عبور شخصی',
      icon: <Users size={32} />,
      color: 'bg-indigo-100 text-indigo-600',
      hover: 'hover:bg-indigo-50 hover:border-indigo-300'
    },
    {
      href: '/khoshmin/customers',
      title: 'مدیریت مشتریان',
      desc: 'لیست مشتریان، پیام‌های جدید و مدیریت سفارشات',
      icon: <UserPlus size={32} />,
      color: 'bg-emerald-100 text-emerald-600',
      hover: 'hover:bg-emerald-50 hover:border-emerald-300',
      badge: customerStats && (customerStats.unreadMessages > 0 || customerStats.newCustomers > 0) ? {
        count: (customerStats.unreadMessages + customerStats.newCustomers),
        text: `${customerStats.unreadMessages} پیام جدید • ${customerStats.newCustomers} مشتری جدید`
      } : null
    },
    {
      href: '/khoshmin/emails',
      title: 'سیستم ایمیل سازمانی',
      desc: 'ارسال ایمیل رسمی با دامنه khoshsanat.ir، تاریخچه و تنظیمات SMTP',
      icon: <Mail size={32} />,
      color: 'bg-blue-100 text-blue-600',
      hover: 'hover:bg-blue-50 hover:border-blue-300'
    },
    {
      href: '/khoshmin/projects',
      title: 'مدیریت پروژه‌ها',
      desc: 'ثبت و ویرایش پروژه‌های انجام شده',
      icon: <Building2 size={32} />,
      color: 'bg-amber-100 text-amber-600',
      hover: 'hover:bg-amber-50 hover:border-amber-300'
    },
    {
      href: '/khoshmin/education',
      title: 'مدیریت آکادمی',
      desc: 'مقالات آموزشی و اخبار سایت',
      icon: <GraduationCap size={32} />,
      color: 'bg-rose-100 text-rose-600',
      hover: 'hover:bg-rose-50 hover:border-rose-300'
    },
    {
      href: '/khoshmin/products',
      title: 'مدیریت محصولات',
      desc: 'دسته‌بندی، زیرمجموعه و محصولات',
      icon: <Package size={32} />,
      color: 'bg-orange-100 text-orange-600',
      hover: 'hover:bg-orange-50 hover:border-orange-300'
    },
    {
      href: '/khoshmin/media',
      title: 'فایل منیجر',
      desc: 'مدیریت فضای ابری و پاکسازی فایل‌های اضافه',
      icon: <HardDrive size={32} />,
      color: 'bg-teal-100 text-teal-600',
      hover: 'hover:bg-teal-50 hover:border-teal-300'
    },
    {
      href: '/khoshmin/slider',
      title: 'مدیریت اسلایدر',
      desc: 'آپلود و حذف تصاویر صفحه اصلی',
      icon: <ImageIcon size={32} />,
      color: 'bg-sky-100 text-sky-600',
      hover: 'hover:bg-sky-50 hover:border-sky-300'
    },
    {
      href: '/khoshmin/logo',
      title: 'مدیریت لوگو',
      desc: 'تغییر هویت بصری سایت',
      icon: <Briefcase size={32} />,
      color: 'bg-purple-100 text-purple-600',
      hover: 'hover:bg-purple-50 hover:border-purple-300'
    },
    {
      href: '/khoshmin/texts',
      title: 'مدیریت متن‌ها',
      desc: 'ویرایش تیترها و توضیحات',
      icon: <Type size={32} />,
      color: 'bg-cyan-100 text-cyan-600',
      hover: 'hover:bg-cyan-50 hover:border-cyan-300'
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 font-[Vazir,'vazirmatn',sans-serif]">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">
            {user?.name ? `${user.name} عزیز، خوش‌ آمدید 👋` : 'خوش آمدید 👋'}
          </h2>
          <p className="text-gray-500 text-base leading-relaxed">
            به پنل مدیریت سایت خوش‌صنعت پایدار خوش آمدید. از این بخش می‌توانید به سرعت به آمار و تمام ابزارها دسترسی داشته باشید.
          </p>
        </div>
        {user?.role && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${user.role === 'MAIN_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
            دسترسی: {user.role === 'MAIN_ADMIN' ? 'مدیر ارشد' : 'ویرایشگر'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleCards.map((card) => (
          <a key={card.href} href={card.href} className={`flex flex-col p-6 bg-white border border-gray-100 rounded-3xl transition-all group ${card.hover} shadow-sm hover:shadow-xl relative`}>
            {card.badge && (
              <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-xs rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1 z-10 font-bold">
                <Activity size={12} />
                <span>{card.badge.text}</span>
              </div>
            )}

            <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner relative`}>
              {card.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">{card.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              ورود به بخش <ArrowLeft size={16} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}