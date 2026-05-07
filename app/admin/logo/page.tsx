'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ShieldCheck, RefreshCw, Info, Image as ImageIcon, Globe, MousePointer2, Moon, Sun, Palette, Code, Type, Maximize2 } from 'lucide-react';

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
      } else {
        alert('خطا در آپلود');
      }
    } catch (error) {
      alert('خطا در ارتباط با سرور');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (type: string) => {
    if (!confirm('آیا از حذف این نسخه از لوگو مطمئن هستید؟ فایل از روی سرور نیز پاک می‌شود.')) return;
    const res = await fetch(`/api/logo?type=${type}`, { method: 'DELETE' });
    if (res.ok) {
      const newLogos = { ...logos };
      delete newLogos[type];
      setLogos(newLogos);
    } else {
      alert('خطا در حذف لوگو');
    }
  };

  // تعریف انواع لوگو با دسته‌بندی
  const logoGroups = [
    {
      title: 'لوگوی اصلی (فارسی) - سایز استاندارد',
      types: [
        { id: 'main', title: 'رنگی', icon: <Palette size={20} />, dims: '250×80 px', desc: 'لوگوی تمام‌رنگ برای هدر اصلی', advice: 'PNG شفاف یا SVG' },
        { id: 'main-white', title: 'سفید', icon: <Sun size={20} />, dims: '250×80 px', desc: 'نسخه سفید برای پس‌زمینه تیره', advice: 'مناسب هدر دارک' },
        { id: 'main-black', title: 'مشکی', icon: <Moon size={20} />, dims: '250×80 px', desc: 'نسخه مشکی برای پس‌زمینه روشن', advice: 'تک‌رنگ مشکی' },
        { id: 'main-svg', title: 'SVG برداری', icon: <Code size={20} />, dims: 'بدون محدودیت', desc: 'فایل برداری لوگو', advice: 'کیفیت در هر ابعادی' }
      ]
    },
    {
      title: 'لوگوی اصلی (فارسی) - سایز بزرگ (High-Res)',
      types: [
        { id: 'main-large', title: 'رنگی بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px یا SVG', desc: 'نسخه با رزولوشن بالا برای هدرهای بزرگ یا چاپ', advice: 'حداقل عرض 500 پیکسل، ترجیحاً SVG' },
        { id: 'main-white-large', title: 'سفید بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px', desc: 'نسخه سفید با کیفیت بالا', advice: 'مناسب برای نمایشگرهای 4K' },
        { id: 'main-black-large', title: 'مشکی بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px', desc: 'نسخه مشکی با کیفیت بالا', advice: 'برای چاپ روی بنرها' }
      ]
    },
    {
      title: 'لوگوی انگلیسی - سایز استاندارد',
      types: [
        { id: 'en', title: 'انگلیسی رنگی', icon: <Globe size={20} />, dims: '250×80 px', desc: 'لوگوی انگلیسی صفحات بین‌المللی', advice: 'هماهنگ با برند' },
        { id: 'en-black', title: 'انگلیسی مشکی', icon: <Type size={20} />, dims: '250×80 px', desc: 'نسخه تک‌رنگ مشکی', advice: 'مناسب چاپ' },
        { id: 'en-white', title: 'انگلیسی سفید', icon: <Sun size={20} />, dims: '250×80 px', desc: 'نسخه سفید برای زمینه تیره', advice: 'هدرهای تیره' }
      ]
    },
    {
      title: 'لوگوی انگلیسی - سایز بزرگ (High-Res)',
      types: [
        { id: 'en-large', title: 'انگلیسی رنگی بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px', desc: 'رزولوشن بالا برای صفحات بین‌المللی', advice: 'کیفیت بالا برای نمایشگرهای بزرگ' },
        { id: 'en-black-large', title: 'انگلیسی مشکی بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px', desc: 'نسخه مشکی با کیفیت بالا', advice: 'برای بنرهای تبلیغاتی' },
        { id: 'en-white-large', title: 'انگلیسی سفید بزرگ', icon: <Maximize2 size={20} />, dims: '500×160 px', desc: 'نسخه سفید بزرگ', advice: 'مناسب پس‌زمینه تیره بزرگ' }
      ]
    },
    {
      title: 'سایر',
      types: [
        { id: 'favicon', title: 'Favicon', icon: <MousePointer2 size={20} />, dims: '32×32 px', desc: 'آیکون مرورگر', advice: 'PNG یا ICO شفاف' }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-l from-gray-50 to-white">
          <div>
            <h2 className="text-2xl font-black text-gray-800">مدیریت هویت بصری</h2>
            <p className="text-gray-500 mt-1 font-medium">آپلود لوگو در سایز استاندارد و بزرگ (رنگی، سفید، مشکی، انگلیسی)</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl">
            <ShieldCheck className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="p-8">
          {logoGroups.map((group, idx) => (
            <div key={idx} className="mb-12 last:mb-0">
              <h3 className="text-xl font-bold text-gray-700 border-r-4 border-blue-500 pr-4 mb-6">{group.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {group.types.map((type) => (
                  <div key={type.id} className="flex flex-col h-full border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        {type.icon}
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">{type.title}</h4>
                    </div>

                    <p className="text-xs text-gray-500 mb-4 leading-relaxed min-h-[40px]">
                      {type.desc}
                    </p>

                    <div className="relative aspect-video w-full rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-4 group bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                      {logos[type.id] ? (
                        <>
                          <img 
                            src={`${logos[type.id]}?t=${new Date().getTime()}`} 
                            alt={type.title} 
                            className="max-h-[70%] w-auto object-contain z-10 drop-shadow-md p-2"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                            <button 
                              onClick={() => handleDelete(type.id)}
                              className="bg-white text-red-600 p-2 rounded-full shadow-xl hover:bg-red-50 transition-transform hover:scale-110"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-gray-200/50 transition-colors">
                          {uploadingType === type.id ? (
                            <RefreshCw className="animate-spin text-blue-500" size={28} />
                          ) : (
                            <>
                              <Upload className="text-gray-400 mb-1" size={28} />
                              <span className="text-[11px] text-gray-400 font-medium">آپلود</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleUpload(e, type.id)} 
                            accept="image/*, .svg"
                            disabled={!!uploadingType}
                          />
                        </label>
                      )}
                    </div>

                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">ابعاد پیشنهادی:</span>
                        <span className="text-blue-600 font-mono text-[11px]" dir="ltr">{type.dims}</span>
                      </div>
                      <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/50">
                        <div className="flex items-start gap-1.5">
                          <Info size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] text-blue-700 leading-relaxed">
                            {type.advice}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}