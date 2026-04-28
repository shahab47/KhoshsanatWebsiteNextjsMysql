import React from 'react';
import Link from 'next/link';
// آیکون‌های برند از اینجا حذف شدند
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0f1114] pt-20 pb-8 px-6 border-t border-gray-800 text-gray-400">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 text-right">
        
        {/* ستون اول: درباره شرکت */}
        <div className="lg:col-span-1">
          <img src="/logo.png" alt="KS Logo" className="h-12 mb-6 grayscale hover:grayscale-0 transition-all" />
          <p className="text-sm leading-relaxed mb-6">
            شرکت مهندسی و معماری خوش صنعت پایدار، پیشرو در طراحی، ساخت و نصب سازه‌های فولادی صنعتی و ساختمانی با رعایت بالاترین استانداردهای بین‌المللی.
          </p>
          <div className="flex gap-4">
            {/* آیکون لینکدین */}
            <Link href="#" className="p-2 bg-ks-gray rounded-md hover:bg-ks-blue hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </Link>
            {/* آیکون اینستاگرام */}
            <Link href="#" className="p-2 bg-ks-gray rounded-md hover:bg-ks-blue hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            {/* آیکون توییتر */}
            <Link href="#" className="p-2 bg-ks-gray rounded-md hover:bg-ks-blue hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </Link>
          </div>
        </div>

        {/* ستون دوم: دسترسی سریع */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6">دسترسی سریع</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/" className="hover:text-ks-blue transition-colors">صفحه اصلی</Link></li>
            <li><Link href="#products" className="hover:text-ks-blue transition-colors">محصولات ما</Link></li>
            <li><Link href="#projects" className="hover:text-ks-blue transition-colors">گالری پروژه‌ها</Link></li>
            <li><Link href="#contact" className="hover:text-ks-blue transition-colors">ثبت سفارش و استعلام</Link></li>
          </ul>
        </div>

        {/* ستون سوم: خدمات */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6">خدمات مهندسی</h4>
          <ul className="space-y-3 text-sm">
            <li>مشاوره معماری و سازه</li>
            <li>ساخت اسکلت فلزی (سوله و برج)</li>
            <li>شاپ دراوینگ تخصصی</li>
            <li>کنترل کیفیت و تست جوش</li>
          </ul>
        </div>

        {/* ستون چهارم: ارتباط با ما */}
        <div>
          <h4 className="text-white font-bold text-lg mb-6">ارتباط با ما</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-ks-blue shrink-0 mt-0.5" />
              <span>تهران، شهرک صنعتی، خیابان مهندسان، پلاک ۱۲</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-ks-blue shrink-0" />
              <span dir="ltr">+98 935 18 77 305</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-ks-blue shrink-0" />
              <span>info@ks-engineering.com</span>
            </li>
          </ul>
        </div>

      </div>

      {/* بخش کپی‌رایت پایین فوتر */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <p>تمامی حقوق مادی و معنوی این سایت متعلق به شرکت خوش صنعت پایدار می‌باشد.</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-white transition-colors">قوانین و مقررات</Link>
          <Link href="#" className="hover:text-white transition-colors">حریم خصوصی</Link>
        </div>
      </div>
    </footer>
  );
}