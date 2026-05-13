'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import GalleryManager, { GalleryItem } from '@/components/GalleryManager';

// ------------------------------------------------------------------
// کامپوننت تنظیمات اسلایدر (بدون تغییر)
// ------------------------------------------------------------------
interface SliderSettings {
  heightDesktop: string;
  heightMobile: string;
  overlayColor: string;
  overlayOpacity: number;
}

function SliderSettingsPanel({ settings, onUpdate }: { settings: SliderSettings | null; onUpdate: (s: SliderSettings) => Promise<void> }) {
  const [local, setLocal] = useState<SliderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setLocal({ ...settings }); }, [settings]);
  if (!local) return null;

  return (
    <div className="mb-8 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border">
      <div className="flex justify-between items-start mb-4">
        <div><h3 className="text-lg font-bold flex gap-2 text-gray-800"><Settings size={20} className="text-blue-600" /> تنظیمات ظاهری اسلایدر اصلی</h3></div>
        <button onClick={async () => { setSaving(true); await onUpdate(local); setSaving(false); }} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2">{saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} ذخیره تنظیمات</button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div><label className="block text-sm font-bold text-gray-800 mb-1">ارتفاع در دسکتاپ</label><input type="text" value={local.heightDesktop} onChange={e => setLocal({ ...local, heightDesktop: e.target.value })} className="w-full border rounded-xl p-2 text-gray-800" /></div>
        <div><label className="block text-sm font-bold text-gray-800 mb-1">ارتفاع در موبایل</label><input type="text" value={local.heightMobile} onChange={e => setLocal({ ...local, heightMobile: e.target.value })} className="w-full border rounded-xl p-2 text-gray-800" /></div>
        <div><label className="block text-sm font-bold text-gray-800 mb-1">رنگ لایه تیره</label><div className="flex gap-2"><input type="color" value={local.overlayColor} onChange={e => setLocal({ ...local, overlayColor: e.target.value })} className="w-12 h-12 border p-1 rounded-lg" /><span className="text-gray-800 font-mono mt-3">{local.overlayColor}</span></div></div>
        <div><label className="block text-sm font-bold text-gray-800 mb-1">شدت لایه تیره</label><div className="flex gap-3"><input type="range" min="0" max="1" step="0.05" value={local.overlayOpacity} onChange={e => setLocal({ ...local, overlayOpacity: parseFloat(e.target.value) })} className="flex-1" /><span className="text-gray-800 mt-2">{Math.round(local.overlayOpacity * 100)}%</span></div></div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// تب یکپارچه برای اسلایدرها (با پشتیبانی از فایل‌های موقتی)
// ------------------------------------------------------------------
function SliderTab({ type, title, description, textMode, aspectRatio, themeColor, uploadTypeFolder, tempItems, setTempItems }: any) {
  const [slides, setSlides] = useState<GalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSlides = async () => {
    const res = await fetch(`/api/slider?type=${type}`, { credentials: 'include' });
    if (res.ok) setSlides(await res.json());
  };

  useEffect(() => { fetchSlides(); }, [type]);

  const handleUploadFiles = async (files: FileList, optimizeFlag: boolean) => {
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('type', uploadTypeFolder);
        formData.append('optimize', optimizeFlag ? 'true' : 'false');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const data = await uploadRes.json();
        if (data.success && data.url) {
          // ایجاد اسلاید در دیتابیس
          const createRes = await fetch('/api/slider', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.url, size: data.finalSize || data.size, type }),
            credentials: 'include',
          });
          if (createRes.ok) {
            const newSlide = await createRes.json();
            // اضافه کردن id اسلاید جدید به لیست موقتی
            setTempItems((prev: string[]) => [...prev, newSlide.slide.id.toString()]);
            await fetchSlides();
          }
        }
      }
    } catch (err: any) { alert(err.message || 'خطا در آپلود'); } 
    finally { setIsUploading(false); }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm('آیا از حذف دائمی این تصویر اطمینان دارید؟')) return;
    try {
      // حذف فایل از MinIO
      if (item.imageUrl) {
        await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE', credentials: 'include' });
      }
      // حذف از دیتابیس
      const res = await fetch(`/api/slider/${item.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        await fetchSlides();
        // حذف از لیست موقتی
        setTempItems((prev: string[]) => prev.filter(id => id !== item.id.toString()));
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async (item: GalleryItem) => {
    const res = await fetch('/api/slider', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item), credentials: 'include',
    });
    if (res.ok) {
      await fetchSlides();
      // پس از هر ویرایش، اسلاید دیگر موقتی محسوب نمی‌شود
      setTempItems((prev: string[]) => prev.filter(id => id !== item.id.toString()));
    } else alert('خطا در ذخیره اطلاعات');
  };

  const handleCropReplace = async (item: GalleryItem, croppedFile: File, optimizeFlag: boolean) => {
    const fd = new FormData();
    fd.append('file', croppedFile);
    fd.append('type', uploadTypeFolder);
    fd.append('optimize', optimizeFlag ? 'true' : 'false');
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
    if (!uploadRes.ok) throw new Error('خطا در آپلود عکس کراپ شده');
    const data = await uploadRes.json();
    if (data.success && data.url) {
      if (item.imageUrl) {
        await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE', credentials: 'include' });
      }
      await handleUpdate({ ...item, imageUrl: data.url, size: data.finalSize || data.size });
    }
  };

  return (
    <GalleryManager 
      title={title}
      description={description}
      items={slides}
      isUploading={isUploading}
      onUpload={handleUploadFiles}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
      onCropReplace={handleCropReplace}
      aspectRatio={aspectRatio}
      textMode={textMode}
      themeColor={themeColor}
      icon={type === 'PRODUCT' ? <ImageIcon className="text-green-500" size={48} /> : undefined}
    />
  );
}

// ------------------------------------------------------------------
// صفحه اصلی مدیریت
// ------------------------------------------------------------------
export default function SliderManager() {
  const [activeTab, setActiveTab] = useState<'main' | 'product'>('main');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [settings, setSettings] = useState<SliderSettings | null>(null);
  const [tempMainIds, setTempMainIds] = useState<string[]>([]);
  const [tempProductIds, setTempProductIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.user) window.location.href = '/khoshmin/login';
        else setIsCheckingAuth(false);
      })
      .catch(() => window.location.href = '/khoshmin/login');

    fetch('/api/slider-settings', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setSettings(data));
  }, []);

  // هشدار هنگام بستن صفحه یا رفرش
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tempMainIds.length > 0 || tempProductIds.length > 0) {
        e.preventDefault();
        e.returnValue = 'فایل‌های جدید آپلود شده ذخیره نشده‌اند. آیا مطمئن هستید؟';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tempMainIds, tempProductIds]);

  const handleTabChange = async (newTab: 'main' | 'product') => {
    const currentTemp = activeTab === 'main' ? tempMainIds : tempProductIds;
    if (currentTemp.length > 0) {
      const confirmExit = window.confirm('شما فایل‌های جدیدی آپلود کرده‌اید اما هنوز هیچ تغییری در متن آنها اعمال نکرده‌اید. آیا مایلید این فایل‌ها از سرور حذف شوند؟');
      if (confirmExit) {
        for (const id of currentTemp) {
          // حذف اسلاید از دیتابیس (و در صورت نیاز خود API باید فایل را از MinIO هم حذف کند)
          await fetch(`/api/slider/${id}`, { method: 'DELETE', credentials: 'include' });
        }
        if (activeTab === 'main') setTempMainIds([]);
        else setTempProductIds([]);
      }
    }
    setActiveTab(newTab);
  };

  const handleUpdateSettings = async (newSettings: SliderSettings) => {
    const res = await fetch('/api/slider-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings), credentials: 'include',
    });
    if (res.ok) { setSettings(newSettings); alert('تنظیمات با موفقیت ذخیره شد'); }
  };

  if (isCheckingAuth) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="bg-white rounded-xl shadow-md p-6" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6 text-gray-800">مدیریت اسلایدرها و گالری‌ها</h2>
      
      <div className="flex gap-4 border-b mb-6">
        <button onClick={() => handleTabChange('main')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'main' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>اسلایدر اصلی صفحه اول</button>
        <button onClick={() => handleTabChange('product')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'product' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-800'}`}>اسلایدر معرفی محصولات</button>
      </div>

      {activeTab === 'main' && (
        <>
          <SliderSettingsPanel settings={settings} onUpdate={handleUpdateSettings} />
          <SliderTab 
            type="MAIN" 
            title="آپلود تصاویر برای اسلایدر اصلی سایت" 
            description="تصاویر را انتخاب کنید. پس از آپلود، می‌توانید با فشردن دکمه کراپ، آنها را دقیقاً در کادر استاندارد برش دهید و با کلیک روی دکمه قلم، متن‌ها را ویرایش کنید." 
            textMode="full" 
            aspectRatio={16/9} 
            themeColor="blue" 
            uploadTypeFolder="sliders" 
            tempItems={tempMainIds}
            setTempItems={setTempMainIds}
          />
        </>
      )}

      {activeTab === 'product' && (
        <SliderTab 
          type="PRODUCT" 
          title="آپلود تصاویر برای گالری محصولات" 
          description="تصاویر محصولات را به صورت گروهی یا تکی آپلود کنید. کراپ در این بخش کاملاً آزاد و بدون محدودیت ابعاد است." 
          textMode="simple" 
          aspectRatio={null} 
          themeColor="green" 
          uploadTypeFolder="product-slider" 
          tempItems={tempProductIds}
          setTempItems={setTempProductIds}
        />
      )}
    </div>
  );
}