// مسیر فایل: src/app/admin/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Image as ImageIcon, Type, LayoutDashboard, Briefcase, Package, LogOut, Users, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 👈 کلیدی

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // 👈 همیشه به‌روز
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth').then(res => res.json()).then(data => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
    window.location.href = '/admin/login';
  };

  if (pathname === '/admin/login') return <>{children}</>;

  const menuItems = [
    { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'داشبورد' },
    { href: '/admin/products', icon: <Package size={18} />, label: 'کاتالوگ و محصولات' },
    { href: '/admin/slider', icon: <ImageIcon size={18} />, label: 'اسلایدر' },
    { href: '/admin/logo', icon: <Briefcase size={18} />, label: 'لوگو' },
    { href: '/admin/texts', icon: <Type size={18} />, label: 'متن‌ها' },
    { href: '/admin/users', icon: <Users size={18} />, label: user?.role === 'MAIN_ADMIN' ? 'مدیریت مدیران' : 'پروفایل من' },
  ];

  // ------------------- تابع تولید مسیر جاری (Breadcrumb) -------------------
  const getBreadcrumbs = (): { name: string; href: string }[] => {
    const segments = pathname.split('/').filter(segment => segment !== '');
    
    if (segments.length === 1 && segments[0] === 'admin') {
      return [{ name: 'داشبورد', href: '/admin' }];
    }
    
    const breadcrumbs: { name: string; href: string }[] = [];
    let accumulatedPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      accumulatedPath += `/${segment}`;
      
      if (segment === 'admin') {
        breadcrumbs.push({ name: 'پنل مدیریت', href: '/admin' });
        continue;
      }
      
      let name = '';
      switch (segment) {
        case 'products': name = 'محصولات'; break;
        case 'categories': name = 'دسته‌بندی‌ها'; break;
        case 'add': name = 'افزودن محصول'; break;
        case 'edit': name = 'ویرایش'; break;
        case 'slider': name = 'اسلایدر'; break;
        case 'logo': name = 'لوگو'; break;
        case 'texts': name = 'متن‌ها'; break;
        case 'users': name = user?.role === 'MAIN_ADMIN' ? 'مدیریت مدیران' : 'پروفایل'; break;
        case 'customers': name = 'مشتریان'; break;
        case 'projects': name = 'پروژه‌ها'; break;
        case 'education': name = 'آکادمی'; break;
        case 'new': name = 'جدید'; break;
        default:
          if (/^\d+$/.test(segment)) name = `آیتم ${segment}`;
          else if (segment === 'dashboard') name = 'داشبورد';
          else name = segment;
      }
      breadcrumbs.push({ name, href: accumulatedPath });
    }
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-300 hover:text-white transition">
                <Menu size={24} />
              </button>
              <div className="font-black text-lg text-blue-400">
                خوش‌صنعت <span className="text-white text-xs font-normal mr-2 hidden sm:inline">| {user?.name || 'پنل مدیریت'}</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => (
                <a key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${pathname === item.href ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-slate-800'}`}>
                  {item.icon} {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-white bg-red-600/80 px-4 py-2 rounded-lg hover:bg-red-600 transition">
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb - مسیر جاری (زیر هدر) */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href}>
                {idx > 0 && <ChevronLeft size={16} className="text-gray-400 flex-shrink-0" />}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-bold">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>

      {/* منوی موبایل */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <span className="text-white font-bold">منوی ادمین</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
                  {item.icon} {item.label}
                </a>
              ))}
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-red-400 hover:bg-red-600/20 transition-colors">
                <LogOut size={16} /> خروج
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}