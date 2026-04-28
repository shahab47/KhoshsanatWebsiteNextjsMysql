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

  // اسکرول
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // قفل اسکرول منوی موبایل
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

  const navLinks = [
    { name: 'صفحه اصلی', href: '/' },
    { name: 'محصولات و خدمات', href: 'products' },
    { name: 'پروژه‌ها', href: '#projects' },
    { name: 'آموزش', href: '#education' },
    { name: 'درباره ما', href: '#about' },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className={`fixed top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-gray-900/80 backdrop-blur-lg border-b border-white/10 shadow-lg py-2'
            : 'bg-gray-900/50 backdrop-blur-sm border-b border-transparent py-4'
        }`}
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative min-h-[50px] md:min-h-0">
          {/* لوگو */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 z-50 flex items-center"
          >
            <a
              href="/"
              onClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img src={logoUrl} alt="KS Engineering" className="h-10 md:h-12 w-auto object-contain" />
            </a>
          </motion.div>

          {/* منوی دسکتاپ */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-300">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <a href={link.href} className="relative group py-2 hover:text-white transition-colors">
                  {link.name}
                  <span className="absolute right-1/2 bottom-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full group-hover:right-0"></span>
                </a>
              </motion.div>
            ))}
          </nav>

          {/* دکمه استعلام و منوی موبایل */}
          <div className="flex w-full md:w-auto justify-end items-center z-40">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="hidden md:flex items-center"
            >
              <a href="#contact">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(37, 99, 235, 0.6)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border border-blue-500/50 shadow-lg"
                >
                  درخواست استعلام
                </motion.button>
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex md:hidden items-center">
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

      {/* منوی موبایل (بدون تغییر) */}
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
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-2 p-6 flex-1">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-gray-300 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl font-bold transition-colors text-lg"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
              <div className="p-6 border-t border-white/10 mt-auto">
                <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>
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