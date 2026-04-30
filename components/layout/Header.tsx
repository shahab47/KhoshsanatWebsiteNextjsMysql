'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  logoUrl: string;
}

export default function Header({ logoUrl }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // استیت هوشمند برای ذخیره مسیر کامل (برای تشخیص دقیق منوی فعال)
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updatePath = () => {
        setCurrentPath(window.location.pathname + window.location.hash);
      };
      
      updatePath();
      window.addEventListener('popstate', updatePath);
      window.addEventListener('hashchange', updatePath);
      
      return () => {
        window.removeEventListener('popstate', updatePath);
        window.removeEventListener('hashchange', updatePath);
      };
    }
  }, []);

  // مدیریت اسکرول برای تغییر ظاهر هدر (کوچک شدن هدر)
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // قفل کردن اسکرول صفحه هنگام باز بودن منوی موبایل
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // بررسی وضعیت صفحات برای استایل و نمایش هدر
  const currentPathname = currentPath.split('#')[0] || '/';
  const isAdminRoute = currentPathname.startsWith('/admin');
  const isHomePage = currentPathname === '/';

  // اگر کاربر داخل پنل ادمین بود، هدر اصلی اصلاً رندر نمی‌شود!
  if (isAdminRoute) {
    return null;
  }

  const navLinks = [
    { name: 'صفحه اصلی', href: '/' },
    { name: 'محصولات و خدمات', href: '/products' },
    { name: 'پروژه‌ها', href: '/projects' },
    { name: 'آموزش', href: '/education' },
    { name: 'درباره ما', href: '/#about' },
  ];

  // استایل داینامیک هدر
  // در صفحه اصلی: شیشه‌ای و روی محتوا (fixed)
  // در بقیه صفحات: پس‌زمینه تیره و چسبیده به بالا (sticky)
  // افکت اسکرول (تبدیل py-4 به py-2) برای همه صفحات اعمال می‌شود
  const headerClasses = isHomePage
    ? `fixed top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-gray-900/80 backdrop-blur-lg border-b border-white/10 shadow-lg py-2'
          : 'bg-gray-900/50 backdrop-blur-sm border-b border-transparent py-4'
      }`
    : `sticky top-0 z-50 w-full bg-slate-900 border-b border-white/10 transition-all duration-300 ${
        scrolled ? 'shadow-lg py-2' : 'shadow-sm py-4'
      }`;

  return (
    <>
      <motion.header
        // انیمیشن از بالا افتادن فقط در صفحه اصلی (isHomePage) اجرا می‌شود
        initial={isHomePage ? { y: -100 } : false}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className={headerClasses}
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative min-h-[50px] md:min-h-0">
          
          {/* بخش لوگو */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 z-50 flex items-center"
          >
            <a
              href="/"
              onClick={(e) => {
                if (currentPath === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img src={logoUrl} alt="KS Engineering" className="h-10 md:h-12 w-auto object-contain" />
            </a>
          </motion.div>

          {/* منوی دسکتاپ */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold">
            {navLinks.map((link, index) => {
              // منطق دقیق تشخیص گزینه فعال
              let isActive = false;
              if (link.href === '/') {
                isActive = currentPath === '/';
              } else {
                isActive = currentPath === link.href || currentPath.startsWith(link.href + '/');
              }

              return (
                <motion.div
                  key={link.name}
                  // انیمیشن ظهور منوها فقط در صفحه اصلی
                  initial={isHomePage ? { opacity: 0, y: -20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: isHomePage ? index * 0.1 + 0.3 : 0 }}
                >
                  <a 
                    href={link.href} 
                    onClick={(e) => {
                      const [targetPath, targetHash] = link.href.split('#');
                      const cleanTargetPath = targetPath || '/';

                      if (window.location.pathname === cleanTargetPath) {
                        e.preventDefault(); // جلوگیری از رفرش
                        
                        if (targetHash) {
                          const elem = document.getElementById(targetHash);
                          if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                          window.history.pushState(null, '', link.href);
                          setCurrentPath(link.href);
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          window.history.pushState(null, '', cleanTargetPath);
                          setCurrentPath(cleanTargetPath);
                        }
                      }
                    }}
                    // رنگ سفید خالص برای گزینه فعال، خاکستری برای بقیه
                    className={`relative group py-2 transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {link.name}
                    {/* خط آبی زیرین - همیشه از وسط به طرفین باز می‌شود */}
                    <span 
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-blue-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}
                    ></span>
                  </a>
                </motion.div>
              );
            })}
          </nav>

          {/* دکمه استعلام و آیکون منوی موبایل */}
          <div className="flex w-full md:w-auto justify-end items-center z-40">
            <motion.div
              // انیمیشن ظهور دکمه استعلام فقط در صفحه اصلی
              initial={isHomePage ? { opacity: 0, scale: 0.8 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: isHomePage ? 0.7 : 0 }}
              className="hidden md:flex items-center"
            >
              <a href="/#contact">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(37, 99, 235, 0.6)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border border-blue-500/50 shadow-lg"
                >
                  درخواست استعلام
                </motion.button>
              </a>
            </motion.div>

            <motion.div 
              initial={isHomePage ? { opacity: 0 } : false} 
              animate={{ opacity: 1 }} 
              className="flex md:hidden items-center"
            >
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                aria-label="Toggle menu"
              >
                <Menu size={28} />
              </button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* منوی کشویی موبایل */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 w-3/4 max-w-sm h-[100dvh] bg-gray-900 border-l border-white/10 shadow-2xl z-50 md:hidden flex flex-col overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex flex-col gap-2 p-6 flex-1">
                {navLinks.map((link) => {
                  let isActive = false;
                  if (link.href === '/') {
                    isActive = currentPath === '/';
                  } else {
                    isActive = currentPath === link.href || currentPath.startsWith(link.href + '/');
                  }

                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => {
                        const [targetPath, targetHash] = link.href.split('#');
                        const cleanTargetPath = targetPath || '/';

                        if (window.location.pathname === cleanTargetPath) {
                          e.preventDefault(); // جلوگیری از رفرش
                          
                          if (targetHash) {
                            const elem = document.getElementById(targetHash);
                            if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                            window.history.pushState(null, '', link.href);
                            setCurrentPath(link.href);
                          } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            window.history.pushState(null, '', cleanTargetPath);
                            setCurrentPath(cleanTargetPath);
                          }
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`px-4 py-3 rounded-xl font-bold transition-colors text-lg ${isActive ? 'text-white bg-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {link.name}
                    </a>
                  );
                })}
              </div>
              
              <div className="p-6 border-t border-white/10 mt-auto">
                <a href="/#contact" onClick={() => setIsMobileMenuOpen(false)}>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 text-lg">
                    درخواست استعلام
                  </button>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}