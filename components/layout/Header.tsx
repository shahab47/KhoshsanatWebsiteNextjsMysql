// نسخه نهایی Header با پشتیبانی از Next.js Link و عدم نمایش در لاگین و پنل ادمین
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  logoUrl?: string;
}

export default function Header({ logoUrl }: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // مدیریت fallback لوگو به صورت Derived State
  const [logoError, setLogoError] = useState(false);
  const logoSrc = !logoError && logoUrl && logoUrl.trim() !== '' ? logoUrl.trim() : '/Logo.svg';

  const handleImageError = useCallback(() => {
    setLogoError(true);
  }, []);

  // اسکرول صفحه اصلی
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // بستن منوی موبایل با تغییر مسیر بدون cascading render
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setIsMobileMenuOpen(false);
    }
  }, [pathname]);

  // قفل اسکرول هنگام باز بودن منو موبایل
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const currentPath = pathname || '/';
  const isExcludedRoute = currentPath.startsWith('/khoshmin') || currentPath === '/login' || currentPath.startsWith('/login/');
  const isHomePage = currentPath === '/';

  if (isExcludedRoute) return null;

  // منطق فیلتر رنگ لوگو
  let logoFilter = 'none';
  if (!isHomePage) {
    logoFilter = 'brightness(0) invert(1)';
  } else {
    logoFilter = !scrolled ? 'brightness(0) invert(1)' : 'none';
  }

  const navLinks = [
    { name: 'صفحه اصلی', href: '/' },
    { name: 'محصولات و خدمات', href: '/products' },
    { name: 'پروژه‌ها', href: '/projects' },
    { name: 'آموزش', href: '/education' },
    { name: 'درباره ما', href: '/about' },
  ];

  let headerClasses = 'w-full z-40 transition-all duration-300 ';
  if (isHomePage) {
    headerClasses += `fixed top-0 ${scrolled ? 'bg-[#F5F7FA]/92 backdrop-blur-md py-3 border-b border-[#2D3644]/10 shadow-xs' : 'bg-transparent py-4 md:py-6'}`;
  } else {
    headerClasses += `sticky top-0 bg-[#2D3644] py-3 border-b border-white/10 shadow-sm`;
  }

  let defaultTextColor = 'text-white/90';
  let hoverTextColor = 'hover:text-white';
  let activeTextColor = 'text-white font-bold';
  let buttonClasses = 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-xs';

  if (isHomePage && scrolled) {
    defaultTextColor = 'text-[#2D3644]/80';
    hoverTextColor = 'hover:text-[#2D3644]';
    activeTextColor = 'text-[#2D3644] font-bold';
    buttonClasses = 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-xs';
  }

  return (
    <>
      <header className={headerClasses} dir="rtl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="باز کردن منوی ناوبری"
              className={`p-2 -mr-2 ${defaultTextColor} transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] rounded-lg`}
            >
              <Menu size={26} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#2563EB] rounded-lg flex items-center gap-3"
              onClick={(e) => {
                if (currentPath === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img 
                src={logoSrc}
                alt="خوش‌صنعت پایدار" 
                className="h-9 md:h-11 w-auto object-contain transition-all duration-300"
                style={{ filter: logoFilter }}
                onError={handleImageError}
              />
              <span className={`hidden lg:block text-xs font-semibold tracking-wider transition-colors ${isHomePage && scrolled ? 'text-[#6C6C6E]' : 'text-gray-300'}`}>
                KHOSHSANAT
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="ناوبری اصلی">
            {navLinks.map((link) => {
              const isActive = link.href === '/' ? currentPath === '/' : currentPath.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 rounded-md px-1.5 ${isActive ? activeTextColor : defaultTextColor} ${hoverTextColor}`}
                >
                  {link.name}
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] transition-all duration-300 ${isActive ? 'w-full' : 'w-0 hover:w-full'}`}></span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <Link
                href="/contact"
                className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${isHomePage && scrolled ? 'text-[#2D3644] hover:text-[#2563EB]' : 'text-gray-300 hover:text-white'}`}
              >
                تماس با ما
              </Link>
            </div>
            <div className="hidden md:block">
              <Link
                href="/contact"
                className={`${buttonClasses} px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border border-[#2563EB]/40 inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50`}
              >
                <span>درخواست استعلام</span>
              </Link>
            </div>
            <div className="md:hidden w-8"></div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-3/4 max-w-sm h-[100dvh] bg-[#1a1d21]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 md:hidden flex flex-col text-white"
              dir="rtl"
              role="dialog"
              aria-modal="true"
              aria-label="منوی موبایل"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <img 
                  src={logoSrc} 
                  alt="لوگو خوش‌صنعت پایدار" 
                  className="h-10 w-auto"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  onError={handleImageError}
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="بستن منو"
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-ks-blue-500"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-2 p-6 flex-1 overflow-y-auto" aria-label="منوی ناوبری موبایل">
                {navLinks.map((link) => {
                  const isActive = link.href === '/' ? currentPath === '/' : currentPath.startsWith(link.href);
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl font-bold transition-all text-base ${isActive ? 'text-white bg-ks-blue-500 shadow-md' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-6 border-t border-white/10 mt-auto">
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full bg-ks-blue-500 hover:bg-ks-blue-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-md text-center inline-block"
                >
                  تماس با واحد فروش
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}