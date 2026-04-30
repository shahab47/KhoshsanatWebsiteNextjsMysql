// src/app/admin/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Image as ImageIcon, Type, LayoutDashboard, Briefcase, Package, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pathname, setPathname] = useState('');

  // استخراج مسیر فعلی در سمت کلاینت برای جایگزینی با هوک next/navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);

  const menuItems = [
    { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'داشبورد' },
    { href: '/admin/products', icon: <Package size={18} />, label: 'کاتالوگ و محصولات' },
    { href: '/admin/slider', icon: <ImageIcon size={18} />, label: 'اسلایدر' },
    { href: '/admin/logo', icon: <Briefcase size={18} />, label: 'لوگو' },
    { href: '/admin/texts', icon: <Type size={18} />, label: 'متن‌ها' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      
      {/* هدر استاتیک پنل مدیریت */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* بخش سمت راست: دکمه همبرگری (موبایل) و عنوان */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="md:hidden p-2 -mr-2 text-gray-300 hover:text-white transition"
              >
                <Menu size={24} />
              </button>
              <div className="font-black text-lg text-blue-400 hidden sm:block">
                خوش‌صنعت
                <span className="text-white text-sm font-normal mr-2">| پنل مدیریت</span>
              </div>
            </div>

            {/* منوی افقی (فقط در دسکتاپ) */}
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a 
                    key={item.href}
                    href={item.href} 
                    onClick={(e) => {
                      if (isActive) {
                        e.preventDefault(); // جلوگیری از رفرش صفحه اگر کاربر در همان مسیر است
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-sm cursor-default' 
                        : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* بخش سمت چپ: دکمه خروج/مشاهده سایت */}
            <div className="flex items-center">
              <a 
                href="/" 
                className="flex items-center gap-2 text-xs font-bold text-slate-900 bg-white px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                <LogOut size={16} className="rotate-180" />
                <span className="hidden sm:inline">بازگشت به سایت</span>
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* منوی کشویی موبایل */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* بک‌گراند تاریک */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            
            {/* سایدبار موبایل */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 w-64 h-[100dvh] bg-slate-900 border-l border-white/10 shadow-2xl z-50 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <span className="font-black text-blue-400 text-lg">منوی مدیریت</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-1 text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        if (isActive) {
                          e.preventDefault(); // جلوگیری از رفرش صفحه اگر کاربر در همان مسیر است
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        isActive 
                          ? 'bg-blue-600 text-white cursor-default' 
                          : 'text-gray-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* بخش محتوای اصلی */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}