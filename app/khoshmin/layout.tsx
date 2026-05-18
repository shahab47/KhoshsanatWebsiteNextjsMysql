'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, X, Image as ImageIcon, Type, LayoutDashboard, Briefcase,
  Package, LogOut, Users, ChevronLeft, Globe, Building2,
  GraduationCap, UserPlus, HardDrive, ChevronDown, Settings
} from 'lucide-react';
import { ModalProvider, useModal } from '@/app/contexts/ModalContext';
import { useRouter } from 'next/navigation';

// --------------------------------------------------------------
// کامپوننت داخلی که از useModal استفاده می‌کند (بعد از Provider)
// --------------------------------------------------------------
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pathname, setPathname] = useState('/khoshmin');
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showConfirm, showAlert } = useModal();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }

    fetch('/api/auth', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('خطا در ارتباط با سرور');
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setIsAuthChecking(false);
        } else {
          showAlert('لطفاً وارد حساب کاربری خود شوید.', 'عدم احراز هویت', 'warning');
          setTimeout(() => { window.location.href = '/login'; }, 1500);
        }
      })
      .catch(err => {
        console.error('Auth error:', err);
        showAlert('مشکلی در برقراری ارتباط با سرور وجود دارد. لطفاً دوباره تلاش کنید.', 'خطای شبکه', 'error');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // بررسی دسترسی به صفحه فعلی بر اساس allowedPaths
  useEffect(() => {
    if (!user || isAuthChecking) return;
    if (user.role === 'MAIN_ADMIN') return;

    let allowed: string[] = [];
    try {
      allowed = user.allowedPaths ? user.allowedPaths.split(',').map((p: string) => p.trim()) : [];
    } catch {
      allowed = [];
    }
    // صفحه پروفایل من همیشه مجاز است
    if (!allowed.includes('/khoshmin/users')) allowed.push('/khoshmin/users');

    const isAllowed = allowed.some(route => pathname === route || pathname.startsWith(route + '/'));
    if (!isAllowed && pathname !== '/khoshmin' && !pathname.startsWith('/khoshmin/users')) {
      router.replace('/khoshmin/not-found');
    }
  }, [user, pathname, router, isAuthChecking]);

  const handleLogout = () => {
    showConfirm({
      title: 'خروج از پنل',
      message: 'آیا مطمئن هستید که می‌خواهید از پنل مدیریت خارج شوید؟',
      type: 'warning',
      confirmText: 'بله، خروج',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' }),
            credentials: 'include',
          });
          window.location.href = '/login';
        } catch (err) {
          console.error('Logout error:', err);
          showAlert('خطا در خروج از سیستم. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
        }
      },
    });
  };

  // تعریف تمام منوها (ثابت)
  const allMenuGroups = [
    {
      id: 'main',
      label: 'مدیریت اصلی',
      icon: <LayoutDashboard size={18} />,
      items: [
        { href: '/khoshmin', icon: <LayoutDashboard size={16} />, label: 'داشبورد ادمین' },
        { href: '/khoshmin/customers', icon: <UserPlus size={16} />, label: 'لیست مشتریان' },
        { href: '/khoshmin/users', icon: <Users size={16} />, label: user?.role === 'MAIN_ADMIN' ? 'مدیریت مدیران' : 'پروفایل من' },
      ]
    },
    {
      id: 'content',
      label: 'محتوا و آکادمی',
      icon: <GraduationCap size={18} />,
      items: [
        { href: '/khoshmin/products', icon: <Package size={16} />, label: 'مدیریت محصولات' },
        { href: '/khoshmin/education', icon: <GraduationCap size={16} />, label: 'مقالات آموزشی' },
        { href: '/khoshmin/projects', icon: <Building2 size={16} />, label: 'پروژه‌های انجام شده' },
      ]
    },
    {
      id: 'media',
      label: 'مدیریت رسانه',
      icon: <HardDrive size={18} />,
      items: [
        { href: '/khoshmin/media', icon: <HardDrive size={16} />, label: 'فایل منیجر (Cloud)' },
      ]
    },
    {
      id: 'appearance',
      label: 'تنظیمات ظاهری',
      icon: <Settings size={18} />,
      items: [
        { href: '/khoshmin/texts', icon: <Type size={16} />, label: 'مدیریت متن‌ها' },
        { href: '/khoshmin/slider', icon: <ImageIcon size={16} />, label: 'اسلایدر اصلی' },
        { href: '/khoshmin/logo', icon: <Briefcase size={16} />, label: 'مدیریت لوگوها' },
      ]
    }
  ];

  // محاسبه مسیرهای مجاز برای کاربر جاری
  const getUserAllowedRoutes = (): string[] => {
    if (!user) return [];
    if (user.role === 'MAIN_ADMIN') return allMenuGroups.flatMap(g => g.items.map(i => i.href));
    try {
      return user.allowedPaths ? user.allowedPaths.split(',').map((p: string) => p.trim()) : [];
    } catch {
      return [];
    }
  };

  const allowedRoutes = getUserAllowedRoutes();
  // فیلتر منوها: اگر کاربر مدیر ارشد است همه را نشان بده، در غیر این صورت فقط آیتم‌هایی که در allowedRoutes هستند
  const filteredMenuGroups = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (user?.role === 'MAIN_ADMIN') return true;
      // صفحه پروفایل من همیشه مجاز است
      if (item.href === '/khoshmin/users') return true;
      return allowedRoutes.includes(item.href);
    })
  })).filter(group => group.items.length > 0);

  const getBreadcrumbs = (): { name: string; href: string }[] => {
    const segments = pathname.split('/').filter(segment => segment !== '');
    if (segments.length === 1 && segments[0] === 'khoshmin') {
      return [{ name: 'داشبورد', href: '/khoshmin' }];
    }
    const breadcrumbs: { name: string; href: string }[] = [];
    let accumulatedPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      accumulatedPath += `/${segment}`;
      if (segment === 'khoshmin') {
        breadcrumbs.push({ name: 'پنل مدیریت', href: '/khoshmin' });
        continue;
      }
      let name = '';
      switch (segment) {
        case 'products': name = 'محصولات'; break;
        case 'categories': name = 'دسته‌بندی‌ها'; break;
        case 'media': name = 'فایل منیجر'; break;
        case 'slider': name = 'اسلایدر'; break;
        case 'logo': name = 'لوگو'; break;
        case 'texts': name = 'متن‌ها'; break;
        case 'users': name = user?.role === 'MAIN_ADMIN' ? 'مدیریت کاربران' : 'مدیریت پروفایل'; break;
        case 'customers': name = 'مشتریان'; break;
        case 'projects': name = 'پروژه‌ها'; break;
        case 'education': name = 'آکادمی'; break;
        default:
          if (/^\d+$/.test(segment)) name = `آیتم ${segment}`;
          else name = segment;
      }
      breadcrumbs.push({ name, href: accumulatedPath });
    }
    return breadcrumbs;
  };

  if (pathname === '/login') return <>{children}</>;

  if (!isMounted || isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-600 font-bold">در حال بارگذاری پنل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* هدر دسکتاپ */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="xl:hidden p-2 text-gray-300 hover:text-white transition">
                <Menu size={24} />
              </button>
              <div className="font-black text-lg text-blue-400 whitespace-nowrap">
                خوش‌صنعت <span className="text-white text-xs font-normal mr-2 hidden lg:inline">| {user?.name || 'مدیریت'}</span>
              </div>
            </div>

            <nav className="hidden xl:flex items-center gap-2" ref={dropdownRef}>
              {filteredMenuGroups.map((group) => (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      group.items.some(item => pathname === item.href)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-300 hover:bg-slate-800'
                    }`}
                  >
                    {group.icon}
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === group.id ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === group.id && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[110]">
                      {group.items.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenDropdown(null)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors ${
                            pathname === item.href ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className={pathname === item.href ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a href="/" target="_blank" className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 px-4 py-2 rounded-xl hover:bg-slate-700 hover:text-white transition">
                <Globe size={16} /> مشاهده سایت
              </a>
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-white bg-red-600/90 px-4 py-2 rounded-xl hover:bg-red-600 transition shadow-sm">
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* مسیر یاب */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-8 shadow-sm hidden md:block">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
            {getBreadcrumbs().map((crumb, idx, arr) => (
              <React.Fragment key={crumb.href}>
                {idx > 0 && <ChevronLeft size={14} className="text-gray-300 flex-shrink-0" />}
                {idx === arr.length - 1 ? (
                  <span className="text-blue-600 font-black">{crumb.name}</span>
                ) : (
                  <a href={crumb.href} className="hover:text-gray-900 transition-colors">
                    {crumb.name}
                  </a>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* محتوای اصلی */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* منوی موبایل */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm xl:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-72 bg-[#2D3644] shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-blue-400 font-black text-lg">منوی مدیریت</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white bg-slate-800 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-6 flex-1">
              {filteredMenuGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-black px-2">{group.label}</div>
                  {group.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        pathname === item.href ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-200 hover:bg-slate-700'
                      }`}
                    >
                      {item.icon} {item.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>

            <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Globe size={18} /> مشاهده سایت
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-100 bg-red-600/20 hover:bg-red-600 hover:text-white transition-colors"
              >
                <LogOut size={18} /> خروج از پنل
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .absolute.right-0.top-0.bottom-0.w-72 {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .absolute.right-0.top-0.bottom-0.w-72::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// --------------------------------------------------------------
// خروجی اصلی: Provider را دور کلayout می‌پیچد
// --------------------------------------------------------------
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ModalProvider>
  );
}