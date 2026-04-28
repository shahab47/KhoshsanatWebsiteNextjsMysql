// src/app/admin/page.tsx
import React from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Type, Briefcase,Package } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6">داشبورد مدیریت خوش‌صنعت</h2>
      
      <p className="text-gray-600 mb-8 text-lg">
        به پنل مدیریت سایت خوش آمدید. برای ویرایش بخش‌های مختلف، از منوی سمت راست استفاده کنید یا روی کارت‌های زیر کلیک کنید.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


        <Link 
  href="/admin/products" 
  className="flex items-center gap-4 p-6 border rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all group"
>
  <div className="bg-orange-100 p-4 rounded-full text-orange-600 group-hover:scale-110 transition-transform">
    <Package size={32} />
  </div>
  <div>
    <h3 className="text-xl font-bold text-gray-800 mb-1">مدیریت محصولات</h3>
    <p className="text-xs text-gray-500 mt-1">دسته‌بندی، زیرمجموعه و محصولات</p>
  </div>
</Link>
        
        {/* کارت ورود به بخش اسلایدر */}
        <Link 
          href="/admin/slider" 
          className="flex items-center gap-4 p-6 border rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
        >
          <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
            <ImageIcon size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">مدیریت اسلایدر</h3>
            <p className="text-xs text-gray-500 mt-1">آپلود و حذف تصاویر صفحه اصلی</p>
          </div>
        </Link>

        {/* کارت ورود به بخش لوگو */}
        <Link 
          href="/admin/logo" 
          className="flex items-center gap-4 p-6 border rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all group"
        >
          <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:scale-110 transition-transform">
            <Briefcase size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">مدیریت لوگو</h3>
            <p className="text-xs text-gray-500 mt-1">تغییر هویت بصری سایت</p>
          </div>
        </Link>

        {/* کارت ورود به بخش متن‌ها */}
        <Link 
          href="/admin/texts" 
          className="flex items-center gap-4 p-6 border rounded-xl hover:bg-green-50 hover:border-green-300 transition-all group"
        >
          <div className="bg-green-100 p-4 rounded-full text-green-600 group-hover:scale-110 transition-transform">
            <Type size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">مدیریت متن‌ها</h3>
            <p className="text-xs text-gray-500 mt-1">ویرایش تیترها و توضیحات</p>
          </div>
        </Link>

      </div>
    </div>
  );
}