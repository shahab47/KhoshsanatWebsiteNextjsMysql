'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ShieldCheck, RefreshCw, Info, Image as ImageIcon, Globe, MousePointer2 } from 'lucide-react';

export default function LogoManager() {
  const [logos, setLogos] = useState<{ [key: string]: string }>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const fetchLogos = async () => {
    const res = await fetch('/api/logo', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setLogos(data);
    }
  };

  useEffect(() => { fetchLogos(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/logo', { method: 'POST', body: formData });
      if (res.ok) {
        await fetchLogos();
      }
    } catch (error) {
      alert('خطا در آپلود');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (type: string) => {
    if (!confirm('آیا از حذف این نسخه از لوگو مطمئن هستید؟ این عمل فایل را از سرور نیز پاک می‌کند.')) return;
    const res = await fetch(`/api/logo?type=${type}`, { method: 'DELETE' });
    if (res.ok) {
      const newLogos = { ...logos };
      delete newLogos[type];
      setLogos(newLogos);
    }
  };

  const logoTypes = [
    {
      id: 'main',
      title: 'لوگوی اصلی (فارسی)',
      icon: <ImageIcon size={20} />,
      dims: '250 × 80 px',
      desc: 'این لوگو در هدر اصلی سایت و بخش‌های فارسی نمایش داده می‌شود.',
      advice: 'از فرمت PNG بدون پس‌زمینه (Transparent) استفاده کنید تا روی تم تیره هدر به خوبی بنشیند.'
    },
    {
      id: 'en',
      title: 'لوگوی انگلیسی (International)',
      icon: <Globe size={20} />,
      dims: '250 × 80 px',
      desc: 'برای بخش‌های انگلیسی یا مکاتباتی که نیاز به هویت بین‌المللی دارند.',
      advice: 'تایپوگرافی انگلیسی باید خوانا و با وزن بصری مشابه لوگوی فارسی باشد.'
    },
    {
      id: 'favicon',
      title: 'نماد سایت (Favicon)',
      icon: <MousePointer2 size={20} />,
      dims: '32 × 32 px',
      desc: 'آیکونی که در تب مرورگر کنار نام سایت نمایش داده می‌شود.',
      advice: 'سعی کنید از ساده‌ترین بخش لوگو یا نماد (Symbol) استفاده کنید. جزئیات زیاد در این ابعاد دیده نمی‌شوند.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* هدر پنل */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-l from-gray-50 to-white">
          <div>
            <h2 className="text-2xl font-black text-gray-800">مدیریت هویت بصری</h2>
            <p className="text-gray-500 mt-1 font-medium">پیکربندی لوگوها و آیکون‌های استاندارد وب‌سایت</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl">
            <ShieldCheck className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {logoTypes.map((type) => (
              <div key={type.id} className="flex flex-col h-full border border-gray-100 rounded-3xl p-6 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    {type.icon}
                  </div>
                  <h3 className="font-bold text-gray-800">{type.title}</h3>
                </div>

                <p className="text-xs text-gray-500 mb-6 leading-relaxed min-h-[40px]">
                  {type.desc}
                </p>

                {/* منطقه نمایش و آپلود */}
                <div className="relative aspect-video w-full rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-6 group bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                  {logos[type.id] ? (
                    <>
                      <img 
                        src={`${logos[type.id]}?t=${new Date().getTime()}`} 
                        alt={type.title} 
                        className="max-h-[70%] w-auto object-contain z-10 drop-shadow-md p-4"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                        <button 
                          onClick={() => handleDelete(type.id)}
                          className="bg-white text-red-600 p-3 rounded-full shadow-xl hover:bg-red-50 transition-transform hover:scale-110"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-gray-200/50 transition-colors">
                      {uploadingType === type.id ? (
                        <RefreshCw className="animate-spin text-blue-500" size={32} />
                      ) : (
                        <>
                          <Upload className="text-gray-300 mb-2" size={32} />
                          <span className="text-xs text-gray-400 font-bold">برای آپلود کلیک کنید</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleUpload(e, type.id)} 
                        accept="image/*"
                        disabled={!!uploadingType}
                      />
                    </label>
                  )}
                </div>

                {/* اطلاعات فنی */}
                <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">ابعاد استاندارد:</span>
                    <span className="text-blue-600 font-black" dir="ltr">{type.dims}</span>
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        {type.advice}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}