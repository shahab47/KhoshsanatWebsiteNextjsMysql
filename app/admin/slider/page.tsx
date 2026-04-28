// src/app/admin/slider/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, UploadCloud } from 'lucide-react';

interface Slide { id: number; imageUrl: string; }

export default function SliderManager() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);

  // خواندن عکس‌ها از دیتابیس هنگام لود صفحه
  const fetchSlides = async () => {
    const res = await fetch('/api/slider');
    if (res.ok) {
      const data = await res.json();
      setSlides(data);
    }
  };

  useEffect(() => { fetchSlides(); }, []);

  // آپلود گروهی عکس‌ها
  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    // ارسال فایل‌ها یکی‌یکی به API قبلی شما
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      await fetch('/api/upload', { method: 'POST', body: formData });
    }

    setUploading(false);
    fetchSlides(); // بروزرسانی گالری
    
    // خالی کردن اینپوت
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // حذف عکس
  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این تصویر مطمئن هستید؟')) return;
    
    await fetch(`/api/slider/${id}`, { method: 'DELETE' });
    fetchSlides(); // بروزرسانی گالری بعد از حذف
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6">مدیریت تصاویر اسلایدر</h2>
      
      {/* بخش آپلود گروهی */}
      <div className="mb-10 p-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl text-center relative">
        <UploadCloud className="mx-auto text-blue-500 mb-3" size={48} />
        <p className="text-blue-800 font-medium mb-2">برای آپلود کلیک کنید یا عکس‌ها را اینجا رها کنید</p>
        <p className="text-sm text-blue-600 mb-4">می‌توانید چندین عکس را همزمان انتخاب کنید</p>
        <input 
          id="file-upload" 
          type="file" 
          multiple // این کلمه جادویی امکان انتخاب چند فایل را می‌دهد
          accept="image/*" 
          onChange={handleMultiUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
        {uploading && <div className="text-blue-700 font-bold mt-4 animate-pulse">در حال آپلود تصاویر...</div>}
      </div>

      {/* گالری تصاویر موجود */}
      <h3 className="text-xl font-semibold mb-4">تصاویر فعلی روی سایت</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {slides.map((slide) => (
          <div key={slide.id} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <img src={slide.imageUrl} alt="اسلاید" className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => handleDelete(slide.id)}
                className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transform hover:scale-110 transition"
                title="حذف تصویر"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {slides.length === 0 && <p className="text-gray-500 col-span-full">هیچ تصویری در دیتابیس یافت نشد.</p>}
      </div>
    </div>
  );
}