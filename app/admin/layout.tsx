// src/app/admin/layout.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Image as ImageIcon, Type, LayoutDashboard, Briefcase } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 flex" dir="rtl">
      {/* سایدبار (منوی کناری) */}
      <aside className={`bg-ks-dark text-white w-64 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full z-50 md:relative md:translate-x-0 md:w-20'}`}>
        <div className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className={`font-bold text-xl ${!isSidebarOpen && 'md:hidden'}`}>مدیریت سایت</h2>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden">
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <LayoutDashboard size={20} />
            <span className={`${!isSidebarOpen && 'md:hidden'}`}>داشبورد</span>
          </Link>
          <Link href="/admin/slider" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <ImageIcon size={20} />
            <span className={`${!isSidebarOpen && 'md:hidden'}`}>مدیریت اسلایدر</span>
          </Link>
          <Link href="/admin/logo" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <Briefcase size={20} />
            <span className={`${!isSidebarOpen && 'md:hidden'}`}>مدیریت لوگو</span>
          </Link>
          <Link href="/admin/texts" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
            <Type size={20} />
            <span className={`${!isSidebarOpen && 'md:hidden'}`}>مدیریت متن‌ها</span>
          </Link>
        </nav>
      </aside>

      {/* بخش محتوای اصلی */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex items-center">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 hover:text-black">
            <Menu size={24} />
          </button>
          <h1 className="mr-4 font-semibold text-gray-800">خوش‌صنعت | پنل مدیریت</h1>
        </header>
        <div className="p-6 overflow-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}