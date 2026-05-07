'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [logos, setLogos] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetch('/api/logo', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setLogos(data))
      .catch(err => console.error('خطا در دریافت لوگو:', err));
  }, []);

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const currentPathname = currentPath.split('#')[0] || '/';
  const isAdminRoute = currentPathname.startsWith('/admin');
  const isHomePage = currentPathname === '/';

  if (isAdminRoute) return null;

  const logoSvgUrl = logos['main-svg'] || logos['main'] ;

  let logoFilter = 'none';
  if (!isHomePage) {
    logoFilter = 'brightness(0) invert(1)';
  } else {
    if (!scrolled) {
      logoFilter = 'brightness(0) invert(1)';
    } else {
      logoFilter = 'none';
    }
  }

  const mobileLogoFilter = 'none';

  const navLinks = [
    { name: 'صفحه اصلی', href: '/' },
    { name: 'محصولات و خدمات', href: '/products' },
    { name: 'پروژه‌ها', href: '/projects' },
    { name: 'آموزش', href: '/education' },
    { name: 'درباره ما', href: '/#about' },
  ];

  let headerClasses = 'w-full z-40 transition-all duration-300 ';
  if (isHomePage) {
    headerClasses += `fixed top-0 ${scrolled ? 'bg-white py-2 md:py-3' : 'bg-transparent py-4 md:py-5'}`;
  } else {
    headerClasses += `sticky top-0 bg-[#2D3644] py-2 md:py-3`;
  }

  let defaultTextColor = 'text-white';
  let hoverTextColor = 'hover:text-gray-300';
  let activeTextColor = 'text-white';
  let buttonClasses = 'bg-blue-600 hover:bg-blue-500 text-white';

  if (isHomePage && scrolled) {
    defaultTextColor = 'text-gray-800';
    hoverTextColor = 'hover:text-gray-600';
    activeTextColor = 'text-gray-900';
    buttonClasses = 'bg-blue-600 hover:bg-blue-700 text-white';
  } else if (!isHomePage) {
    defaultTextColor = 'text-white';
    hoverTextColor = 'hover:text-gray-300';
    activeTextColor = 'text-white';
    buttonClasses = 'bg-blue-600 hover:bg-blue-500 text-white';
  }

  const linkClasses = `${defaultTextColor} ${hoverTextColor} transition-colors`;

  return (
    <>
      <header className={headerClasses} dir="rtl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* سمت چپ: دکمه همبرگر (فقط موبایل) */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 -mr-2 ${defaultTextColor} ${hoverTextColor} transition-colors focus:outline-none`}
              aria-label="Toggle menu"
            >
              <Menu size={28} />
            </button>
          </div>

          {/* لوگو (در دسکتاپ سمت چپ، در موبایل وسط) */}
          <div className="flex items-center">
            <a
              href="/"
              onClick={(e) => {
                if (currentPath === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex-shrink-0"
            >
              <img 
                src={logoSvgUrl} 
                alt="KS Engineering" 
                className="h-10 md:h-12 w-auto object-contain transition-all duration-300"
                style={{ filter: logoFilter }}
              />
            </a>
          </div>

          {/* منوی دسکتاپ */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold">
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
                      e.preventDefault();
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
                  className={`relative group py-2 ${linkClasses} ${isActive ? activeTextColor : ''}`}
                >
                  {link.name}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-blue-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}
                  ></span>
                </a>
              );
            })}
          </nav>

          {/* سمت راست: دکمه دسکتاپ و فضای خالی برای موبایل */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <button
                onClick={() => router.push('/contact')}
                className={`${buttonClasses} px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border border-blue-500/50 shadow-lg`}
              >
                درخواست استعلام
              </button>
            </div>
            {/* فضای خالی در موبایل برای متعادل کردن چپ و راست (با عرض همبرگر) */}
            <div className="md:hidden w-10"></div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <div
              className="fixed top-0 right-0 w-3/4 max-w-sm h-[100dvh] bg-[#EFF6FF] shadow-2xl z-50 md:hidden flex flex-col overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2563EB]/20">
                <img 
                  src={logoSvgUrl} 
                  alt="Logo" 
                  className="h-10 w-auto"
                  style={{ filter: mobileLogoFilter }}
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-white/80 hover:bg-white rounded-full text-[#2D3644] transition-colors shadow-sm"
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
                          e.preventDefault();
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
                      className={`px-4 py-3 rounded-xl font-bold transition-all text-lg ${
                        isActive 
                          ? 'text-white bg-[#2563EB] shadow-md' 
                          : 'text-[#2D3644] hover:text-[#2563EB] hover:bg-[#2563EB]/10'
                      }`}
                    >
                      {link.name}
                    </a>
                  );
                })}
              </div>
              <div className="p-6 border-t border-[#2563EB]/20 mt-auto">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push('/contact');
                  }}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-[#2563EB]/30 text-lg flex items-center justify-center"
                >
                  تماس با واحد فروش
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}