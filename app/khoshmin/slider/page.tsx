'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Settings, Loader2, Save, ImageIcon, X, AlertTriangle } from 'lucide-react';
import GalleryManager, { GalleryItem } from '@/components/GalleryManager';

// ------------------------------------------------------------------
// کامپوننت مودال عمومی (Promise-based)
// ------------------------------------------------------------------
interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  options: ModalOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, options, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen || !options) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" dir="rtl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h3 className="text-xl font-bold text-gray-800">{options.title}</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>
        <div className="mb-6 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
          {options.message}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold"
          >
            {options.cancelText || 'خیر'}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
          >
            {options.confirmText || 'بله'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook برای مدیریت مودال به صورت Promise
function useConfirmModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ModalOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = (options: ModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  const handleCancel = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  return {
    confirm,
    modalComponent: (
      <ConfirmModal
        isOpen={modalState.isOpen}
        options={modalState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  };
}

// ------------------------------------------------------------------
// کامپوننت تنظیمات اسلایدر
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
  useEffect(() => {
    if (settings) setLocal({ ...settings });
  }, [settings]);
  if (!local) return null;

  return (
    <div className="mb-8 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold flex gap-2 text-gray-800">
            <Settings size={20} className="text-blue-600" /> تنظیمات ظاهری اسلایدر اصلی
          </h3>
        </div>
        <button
          onClick={async () => {
            setSaving(true);
            await onUpdate(local);
            setSaving(false);
          }}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} ذخیره تنظیمات
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">ارتفاع در دسکتاپ</label>
          <input type="text" value={local.heightDesktop} onChange={e => setLocal({ ...local, heightDesktop: e.target.value })} className="w-full border rounded-xl p-2 text-gray-800" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">ارتفاع در موبایل</label>
          <input type="text" value={local.heightMobile} onChange={e => setLocal({ ...local, heightMobile: e.target.value })} className="w-full border rounded-xl p-2 text-gray-800" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">رنگ لایه تیره</label>
          <div className="flex gap-2">
            <input type="color" value={local.overlayColor} onChange={e => setLocal({ ...local, overlayColor: e.target.value })} className="w-12 h-12 border p-1 rounded-lg" />
            <span className="text-gray-800 font-mono mt-3">{local.overlayColor}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">شدت لایه تیره</label>
          <div className="flex gap-3">
            <input type="range" min="0" max="1" step="0.05" value={local.overlayOpacity} onChange={e => setLocal({ ...local, overlayOpacity: parseFloat(e.target.value) })} className="flex-1" />
            <span className="text-gray-800 mt-2">{Math.round(local.overlayOpacity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// تب یکپارچه برای اسلایدرها (با پشتیبانی از مودال)
// ------------------------------------------------------------------
interface SliderTabProps {
  type: 'MAIN' | 'PRODUCT';
  title: string;
  description: string;
  textMode: 'full' | 'simple';
  aspectRatio: number | null;
  themeColor: string;
  uploadTypeFolder: string;
  tempItems: string[];
  setTempItems: React.Dispatch<React.SetStateAction<string[]>>;
  confirmDelete: (message: string) => Promise<boolean>; // تابع برای تأیید حذف
}

function SliderTab({
  type,
  title,
  description,
  textMode,
  aspectRatio,
  themeColor,
  uploadTypeFolder,
  tempItems,
  setTempItems,
  confirmDelete,
}: SliderTabProps) {
  const [slides, setSlides] = useState<GalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSlides = async () => {
    const res = await fetch(`/api/slider?type=${type}`, { credentials: 'include' });
    if (res.ok) setSlides(await res.json());
  };

  useEffect(() => {
    fetchSlides();
  }, [type]);

  const handleUploadFiles = async (files: FileList | File[], optimizeFlag: boolean) => {
    setIsUploading(true);
    try {
      const fileArray = files instanceof FileList ? Array.from(files) : files;
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadTypeFolder);
        formData.append('optimize', optimizeFlag ? 'true' : 'false');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const data = await uploadRes.json();
        if (data.success && data.url) {
          const createRes = await fetch('/api/slider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.url, size: data.finalSize || data.size, type }),
            credentials: 'include',
          });
          if (createRes.ok) {
            const newSlide = await createRes.json();
            setTempItems(prev => [...prev, newSlide.slide.id.toString()]);
            await fetchSlides();
          }
        }
      }
    } catch (err: any) {
      alert(err.message || 'خطا در آپلود');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    const confirmed = await confirmDelete(`آیا از حذف دائمی تصویر "${item.title || 'بدون عنوان'}" اطمینان دارید؟`);
    if (!confirmed) return;

    try {
      if (item.imageUrl) {
        await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE', credentials: 'include' });
      }
      const res = await fetch(`/api/slider/${item.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        await fetchSlides();
        setTempItems(prev => prev.filter(id => id !== item.id.toString()));
      } else {
        alert('خطا در حذف از دیتابیس');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleUpdate = async (item: GalleryItem) => {
    const res = await fetch('/api/slider', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
      credentials: 'include',
    });
    if (res.ok) {
      await fetchSlides();
      setTempItems(prev => prev.filter(id => id !== item.id.toString()));
    } else {
      alert('خطا در ذخیره اطلاعات');
    }
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

  const { confirm, modalComponent } = useConfirmModal();

  // تأییدیه‌های حذف را به تب‌ها می‌دهیم
  const confirmDelete = async (message: string): Promise<boolean> => {
    return confirm({ title: 'تأیید حذف', message, confirmText: 'بله', cancelText: 'خیر' });
  };

  useEffect(() => {
    fetch('/api/auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.user) window.location.href = '/khoshmin/login';
        else setIsCheckingAuth(false);
      })
      .catch(() => (window.location.href = '/khoshmin/login'));

    fetch('/api/slider-settings', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => data && setSettings(data));
  }, []);

  // هشدار هنگام بستن صفحه (مرورگر فقط اجازه confirm می‌دهد، نمی‌توان از مودال سفارشی استفاده کرد)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tempMainIds.length > 0 || tempProductIds.length > 0) {
        e.preventDefault();
        e.returnValue = 'تغییرات ذخیره نشده‌اند. آیا مطمئن هستید؟';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tempMainIds, tempProductIds]);

  const deleteTempItems = async (tab: 'main' | 'product') => {
    const ids = tab === 'main' ? tempMainIds : tempProductIds;
    for (const id of ids) {
      await fetch(`/api/slider/${id}`, { method: 'DELETE', credentials: 'include' });
    }
    if (tab === 'main') setTempMainIds([]);
    else setTempProductIds([]);
  };

  const requestTabChange = async (newTab: 'main' | 'product') => {
    const currentTemp = activeTab === 'main' ? tempMainIds : tempProductIds;
    if (currentTemp.length === 0) {
      setActiveTab(newTab);
      return;
    }

    const userConfirmed = await confirm({
      title: 'ذخیره تغییرات',
      message: `شما ${currentTemp.length} فایل جدید آپلود کرده‌اید اما هنوز متنی برای آنها وارد نکرده‌اید.\nآیا می‌خواهید این فایل‌ها حذف شوند؟\n(انتخاب «خیر» به معنای نگهداری فایل‌ها و عدم نمایش دوباره این پیام است)`,
      confirmText: 'بله، حذف شود',
      cancelText: 'خیر، نگهداری شود',
    });

    if (userConfirmed) {
      // حذف فایل‌ها
      await deleteTempItems(activeTab);
    } else {
      // نگهداری فایل‌ها: فقط لیست موقتی را خالی می‌کنیم تا دیگر اخطار ندهد
      if (activeTab === 'main') setTempMainIds([]);
      else setTempProductIds([]);
    }
    setActiveTab(newTab);
  };

  const handleUpdateSettings = async (newSettings: SliderSettings) => {
    const res = await fetch('/api/slider-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
      credentials: 'include',
    });
    if (res.ok) {
      setSettings(newSettings);
      alert('تنظیمات با موفقیت ذخیره شد');
    } else {
      alert('خطا در ذخیره تنظیمات');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6 text-gray-800">مدیریت اسلایدرها و گالری‌ها</h2>

      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => requestTabChange('main')}
          className={`pb-2 px-4 font-bold transition-colors ${
            activeTab === 'main'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          اسلایدر اصلی صفحه اول
        </button>
        <button
          onClick={() => requestTabChange('product')}
          className={`pb-2 px-4 font-bold transition-colors ${
            activeTab === 'product'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          اسلایدر معرفی محصولات
        </button>
      </div>

      {activeTab === 'main' && (
        <>
          <SliderSettingsPanel settings={settings} onUpdate={handleUpdateSettings} />
          <SliderTab
            type="MAIN"
            title="آپلود تصاویر برای اسلایدر اصلی سایت"
            description="تصاویر را انتخاب کنید. پس از آپلود، می‌توانید با فشردن دکمه کراپ، آنها را دقیقاً در کادر استاندارد برش دهید و با کلیک روی دکمه قلم، متن‌ها را ویرایش کنید."
            textMode="full"
            aspectRatio={16 / 9}
            themeColor="blue"
            uploadTypeFolder="sliders"
            tempItems={tempMainIds}
            setTempItems={setTempMainIds}
            confirmDelete={confirmDelete}
          />
        </>
      )}

      {activeTab === 'product' && (
        <SliderTab
          type="PRODUCT"
          title="آپلود تصاویر برای گالری محصولات"
          description="تصاویر محصولات را به صورت گروهی یا تکی آپلود کنید. کراپ در این بخش کاملاً آزاد و بدون محدودیت ابعاد است."
          textMode="full"
          aspectRatio={null}
          themeColor="green"
          uploadTypeFolder="product-slider"
          tempItems={tempProductIds}
          setTempItems={setTempProductIds}
          confirmDelete={confirmDelete}
        />
      )}

      {modalComponent}
    </div>
  );
}