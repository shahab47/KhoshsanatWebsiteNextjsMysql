// src/app/admin/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Type, Briefcase, Package, Users, ArrowLeft, Building2, GraduationCap, Bell, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface CustomerStats {
  total: number;
  unreadMessages: number;
  newCustomers: number;
}

export default function AdminDashboard() {
  const [role, setRole] = useState('');
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => { if(d.user) setRole(d.user.role); });
    fetchCustomerStats();
  }, []);

  const fetchCustomerStats = async () => {
    try {
      const res = await fetch('/api/admin/customers/stats');
      const data = await res.json();
      setCustomerStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const cards = [
    { 
      href: '/admin/users', 
      title: role === 'MAIN_ADMIN' ? 'مدیریت کاربران' : 'پروفایل من', 
      desc: role === 'MAIN_ADMIN' ? 'تنظیمات مدیران و سطح دسترسی' : 'تغییر رمز عبور شخصی', 
      icon: <Users size={32} />, 
      color: 'bg-indigo-100 text-indigo-600', 
      hover: 'hover:bg-indigo-50 hover:border-indigo-300' 
    },
    { 
      href: '/admin/customers', 
      title: 'مدیریت مشتریان', 
      desc: 'لیست مشتریان، پیام‌های جدید و مدیریت سفارشات', 
      icon: <Users size={32} />, 
      color: 'bg-emerald-100 text-emerald-600', 
      hover: 'hover:bg-emerald-50 hover:border-emerald-300',
      badge: customerStats && (customerStats.unreadMessages > 0 || customerStats.newCustomers > 0) ? {
        count: (customerStats.unreadMessages + customerStats.newCustomers),
        text: `${customerStats.unreadMessages} پیام جدید • ${customerStats.newCustomers} مشتری جدید`
      } : null
    },
    { 
      href: '/admin/projects', 
      title: 'مدیریت پروژه‌ها', 
      desc: 'ثبت و ویرایش پروژه‌های انجام شده', 
      icon: <Building2 size={32} />, 
      color: 'bg-emerald-100 text-emerald-600', 
      hover: 'hover:bg-emerald-50 hover:border-emerald-300' 
    },
    { 
      href: '/admin/education', 
      title: 'مدیریت آکادمی', 
      desc: 'مقالات آموزشی و اخبار سایت', 
      icon: <GraduationCap size={32} />, 
      color: 'bg-rose-100 text-rose-600', 
      hover: 'hover:bg-rose-50 hover:border-rose-300' 
    },
    { 
      href: '/admin/products', 
      title: 'مدیریت محصولات', 
      desc: 'دسته‌بندی، زیرمجموعه و محصولات', 
      icon: <Package size={32} />, 
      color: 'bg-orange-100 text-orange-600', 
      hover: 'hover:bg-orange-50 hover:border-orange-300' 
    },
    { 
      href: '/admin/slider', 
      title: 'مدیریت اسلایدر', 
      desc: 'آپلود و حذف تصاویر صفحه اصلی', 
      icon: <ImageIcon size={32} />, 
      color: 'bg-blue-100 text-blue-600', 
      hover: 'hover:bg-blue-50 hover:border-blue-300' 
    },
    { 
      href: '/admin/logo', 
      title: 'مدیریت لوگو', 
      desc: 'تغییر هویت بصری سایت', 
      icon: <Briefcase size={32} />, 
      color: 'bg-purple-100 text-purple-600', 
      hover: 'hover:bg-purple-50 hover:border-purple-300' 
    },
    { 
      href: '/admin/texts', 
      title: 'مدیریت متن‌ها', 
      desc: 'ویرایش تیترها و توضیحات', 
      icon: <Type size={32} />, 
      color: 'bg-cyan-100 text-cyan-600', 
      hover: 'hover:bg-cyan-50 hover:border-cyan-300' 
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-4">خوش‌ آمدید 👋</h2>
        <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
          به پنل مدیریت وب‌سایت مهندسی خوش‌صنعت خوش آمدید. در این بخش می‌توانید تمامی محتوا، محصولات و هویت بصری سایت را به صورت زنده مدیریت کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={`flex flex-col p-6 bg-white border border-gray-100 rounded-3xl transition-all group ${card.hover} shadow-sm hover:shadow-xl relative`}>
            {/* Badge نوتیفیکیشن */}
            {card.badge && (
              <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1 z-10">
                <Bell size={12} />
                <span>{card.badge.text}</span>
              </div>
            )}
            
            <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner relative`}>
              {card.icon}
              {card.badge && card.badge.count > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {card.badge.count > 9 ? '9+' : card.badge.count}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{card.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-sm font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              ورود به بخش <ArrowLeft size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}