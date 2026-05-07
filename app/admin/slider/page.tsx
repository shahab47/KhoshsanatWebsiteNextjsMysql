'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, UploadCloud, Edit, Save, Settings, Loader2, Crop, X, Check, Palette, Type, Image as ImageIcon, CropIcon } from 'lucide-react';

// ==================== Types ====================
interface Slide {
  id: number;
  imageUrl: string;
  size: number | null;
  title: string | null;
  subtitle: string | null;
  titleColor: string;
  titleFontSize: string;
  subtitleColor: string;
  subtitleFontSize: string;
  type: 'MAIN' | 'PRODUCT';
}

interface SliderSettings {
  heightDesktop: string;
  heightMobile: string;
  overlayColor: string;
  overlayOpacity: number;
}

// ==================== Helpers ====================
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'نامشخص';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSizeStatus(bytes: number | null | undefined): { text: string; color: string } {
  if (!bytes) return { text: 'نامشخص', color: 'text-gray-400' };
  if (bytes < 300 * 1024) return { text: 'حجم عالی', color: 'text-green-600' };
  if (bytes < 800 * 1024) return { text: 'حجم قابل قبول', color: 'text-yellow-600' };
  return { text: 'حجم بالا (کند کردن سایت)', color: 'text-red-600' };
}

// ==================== Crop Modal ====================
interface CropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropConfirm: (croppedFile: File, optimize: boolean) => Promise<void>;
  aspectRatio?: number | null;
}

function CropModal({ isOpen, imageSrc, onClose, onCropConfirm, aspectRatio = 16 / 9 }: CropModalProps) {
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imageSrc && aspectRatio !== null) {
      const img = imgRef.current;
      const updateDefaultCrop = () => {
        const displayWidth = img.clientWidth;
        const displayHeight = img.clientHeight;
        if (displayWidth > 0 && displayHeight > 0) {
          let w = Math.min(displayWidth, displayHeight * aspectRatio);
          let h = w / aspectRatio;
          if (h > displayHeight) {
            h = displayHeight;
            w = h * aspectRatio;
          }
          const x = (displayWidth - w) / 2;
          const y = (displayHeight - h) / 2;
          setCropRect({ x, y, w, h });
        }
      };
      if (img.complete) updateDefaultCrop();
      else img.onload = updateDefaultCrop;
    }
  }, [imageSrc, aspectRatio]);

  const adjustRect = (x: number, y: number, w: number, h: number) => {
    if (aspectRatio === null) {
      const img = imgRef.current;
      if (!img) return { x: 0, y: 0, w: 0, h: 0 };
      const maxX = img.clientWidth - w;
      const maxY = img.clientHeight - h;
      const newX = Math.max(0, Math.min(x, maxX));
      const newY = Math.max(0, Math.min(y, maxY));
      return { x: newX, y: newY, w, h };
    } else {
      let newW = w, newH = h;
      if (newW / newH > aspectRatio) newW = newH * aspectRatio;
      else newH = newW / aspectRatio;
      const img = imgRef.current;
      if (!img) return { x: 0, y: 0, w: 0, h: 0 };
      const maxX = img.clientWidth - newW;
      const maxY = img.clientHeight - newH;
      const newX = Math.max(0, Math.min(x, maxX));
      const newY = Math.max(0, Math.min(y, maxY));
      return { x: newX, y: newY, w: newW, h: newH };
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setStartPos({ x: mouseX, y: mouseY });
    setIsDrawing(true);
    setCropRect({ x: mouseX, y: mouseY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;
    currentX = Math.min(Math.max(currentX, 0), imgRef.current.clientWidth);
    currentY = Math.min(Math.max(currentY, 0), imgRef.current.clientHeight);
    let w = currentX - startPos.x;
    let h = currentY - startPos.y;
    let newRect;
    if (w < 0) {
      w = -w;
      newRect = adjustRect(currentX, startPos.y, w, h);
    } else if (h < 0) {
      h = -h;
      newRect = adjustRect(startPos.x, currentY, w, h);
    } else {
      newRect = adjustRect(startPos.x, startPos.y, w, h);
    }
    setCropRect(newRect);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleCropConfirm = async () => {
    if (!imgRef.current) return;
    if (cropRect.w < 10 || cropRect.h < 10) {
      alert('لطفاً ناحیه معتبری برای برش انتخاب کنید');
      return;
    }
    setIsUploading(true);
    try {
      const img = imgRef.current;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      const realCropX = cropRect.x * scaleX;
      const realCropY = cropRect.y * scaleY;
      const realCropW = cropRect.w * scaleX;
      const realCropH = cropRect.h * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = realCropW;
      canvas.height = realCropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error();

      ctx.drawImage(img, realCropX, realCropY, realCropW, realCropH, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
      const croppedFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      await onCropConfirm(croppedFile, optimize);
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطا در برش تصویر');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-[rgb(39,39,39)]">
            <Crop size={20} className="text-blue-500" />
            {aspectRatio ? 'برش با نسبت 16:9' : 'برش آزاد'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-[rgb(39,39,39)]" /></button>
        </div>
        <p className="text-sm text-[rgb(39,39,39)] mb-4 bg-blue-50 p-3 rounded-lg">{aspectRatio ? 'نسبت ابعاد برش ثابت (16:9) است.' : 'می‌توانید هر ناحیه دلخواه را انتخاب کنید.'}</p>
        <div className="relative overflow-auto bg-gray-100 rounded-2xl flex justify-center items-center border-2 border-dashed border-gray-300 p-2"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="relative inline-block">
            <img ref={imgRef} src={imageSrc!} alt="crop preview" className="max-w-full max-h-[60vh] object-contain pointer-events-none" draggable={false} />
            {cropRect.w > 0 && cropRect.h > 0 && (
              <div className="absolute border-2 border-blue-500 bg-blue-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }} />
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <label className="flex items-center gap-2 cursor-pointer text-[rgb(39,39,39)]">
            <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="w-5 h-5 rounded" />
            <span className="text-sm font-medium">بهینه‌سازی خودکار (کاهش حجم و کیفیت برای وب)</span>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 text-[rgb(39,39,39)] bg-gray-100 rounded-xl hover:bg-gray-200">لغو</button>
            <button onClick={handleCropConfirm} disabled={isUploading} className="px-6 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2">
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              {isUploading ? 'در حال آپلود...' : 'تأیید برش و آپلود'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Edit Modal برای اسلایدر اصلی ====================
function EditMainSlideModal({ isOpen, slide, onClose, onSave }: any) {
  const [formData, setFormData] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (slide) setFormData({ ...slide }); }, [slide]);
  if (!isOpen || !formData) return null;

  const parseFontSize = (v: string | undefined) => parseFloat(v || '1.25') || 1.25;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[rgb(39,39,39)]"><Edit size={20} className="text-blue-500" /> ویرایش اسلاید اصلی</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-[rgb(39,39,39)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="block text-sm font-bold mb-1 text-[rgb(39,39,39)]">عنوان اصلی</label><input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold mb-1 flex gap-1 text-[rgb(39,39,39)]"><Palette size={16} /> رنگ عنوان</label><input type="color" value={formData.titleColor || '#ffffff'} onChange={e => setFormData({ ...formData, titleColor: e.target.value })} className="w-full h-12 border rounded-xl p-1" /></div>
            <div><label className="block text-sm font-bold mb-1 flex gap-1 text-[rgb(39,39,39)]"><Type size={16} /> سایز عنوان (rem)</label><input type="number" step="0.25" min="0.5" max="8" value={parseFontSize(formData.titleFontSize)} onChange={e => setFormData({ ...formData, titleFontSize: e.target.value + 'rem' })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" /></div>
          </div>
          <div><label className="block text-sm font-bold mb-1 text-[rgb(39,39,39)]">زیرنویس</label><textarea value={formData.subtitle || ''} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold mb-1 flex gap-1 text-[rgb(39,39,39)]"><Palette size={16} /> رنگ زیرنویس</label><input type="color" value={formData.subtitleColor || '#d1d5db'} onChange={e => setFormData({ ...formData, subtitleColor: e.target.value })} className="w-full h-12 border rounded-xl p-1" /></div>
            <div><label className="block text-sm font-bold mb-1 flex gap-1 text-[rgb(39,39,39)]"><Type size={16} /> سایز زیرنویس (rem)</label><input type="number" step="0.25" min="0.5" max="4" value={parseFontSize(formData.subtitleFontSize)} onChange={e => setFormData({ ...formData, subtitleFontSize: e.target.value + 'rem' })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-xl text-[rgb(39,39,39)]">لغو</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2">{saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Edit Modal ساده برای اسلایدر محصولات ====================
function EditProductSlideModal({ isOpen, slide, onClose, onSave }: any) {
  const [formData, setFormData] = useState<Slide | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (slide) setFormData({ ...slide }); }, [slide]);
  if (!isOpen || !formData) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[rgb(39,39,39)]"><Edit size={20} className="text-blue-500" /> ویرایش اسلاید محصول</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-[rgb(39,39,39)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="block text-sm font-bold mb-1 text-[rgb(39,39,39)]">عنوان (اختیاری)</label><input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" /></div>
          <div><label className="block text-sm font-bold mb-1 text-[rgb(39,39,39)]">زیرنویس (اختیاری)</label><textarea value={formData.subtitle || ''} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} className="w-full border rounded-xl p-3 text-[rgb(39,39,39)]" rows={2} /></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-xl text-[rgb(39,39,39)]">لغو</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2">{saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== SliderSettingsPanel ====================
function SliderSettingsPanel({ settings, onUpdate }: { settings: SliderSettings | null; onUpdate: (s: SliderSettings) => Promise<void> }) {
  const [local, setLocal] = useState<SliderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setLocal({ ...settings }); }, [settings]);
  if (!local) return null;
  return (
    <div className="mb-8 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border">
      <div className="flex justify-between items-start mb-4">
        <div><h3 className="text-lg font-bold flex gap-2 text-[rgb(39,39,39)]"><Settings size={20} className="text-blue-600" /> تنظیمات ظاهری اسلایدر اصلی</h3></div>
        <button onClick={async () => { setSaving(true); await onUpdate(local); setSaving(false); }} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2">{saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} ذخیره</button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div><label className="block text-sm font-bold text-[rgb(39,39,39)] mb-1">ارتفاع دسکتاپ</label><input type="text" value={local.heightDesktop} onChange={e => setLocal({ ...local, heightDesktop: e.target.value })} className="w-full border rounded-xl p-2 text-[rgb(39,39,39)]" /></div>
        <div><label className="block text-sm font-bold text-[rgb(39,39,39)] mb-1">ارتفاع موبایل</label><input type="text" value={local.heightMobile} onChange={e => setLocal({ ...local, heightMobile: e.target.value })} className="w-full border rounded-xl p-2 text-[rgb(39,39,39)]" /></div>
        <div><label className="block text-sm font-bold text-[rgb(39,39,39)] mb-1">رنگ لایه تیره</label><div className="flex gap-2"><input type="color" value={local.overlayColor} onChange={e => setLocal({ ...local, overlayColor: e.target.value })} className="w-12 h-12 border p-1" /><span className="text-[rgb(39,39,39)]">{local.overlayColor}</span></div></div>
        <div><label className="block text-sm font-bold text-[rgb(39,39,39)] mb-1">شدت لایه تیره</label><div className="flex gap-3"><input type="range" min="0" max="1" step="0.05" value={local.overlayOpacity} onChange={e => setLocal({ ...local, overlayOpacity: parseFloat(e.target.value) })} className="flex-1" /><span className="text-[rgb(39,39,39)]">{Math.round(local.overlayOpacity * 100)}%</span></div></div>
      </div>
    </div>
  );
}

// ==================== تب اسلایدر اصلی ====================
function MainSliderTab() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [settings, setSettings] = useState<SliderSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentCropSlide, setCurrentCropSlide] = useState<Slide | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);

  const fetchSlides = async () => {
    const res = await fetch('/api/slider?type=MAIN');
    if (res.ok) setSlides(await res.json());
  };
  const fetchSettings = async () => {
    const res = await fetch('/api/slider-settings');
    if (res.ok) setSettings(await res.json());
  };
  useEffect(() => { fetchSlides(); fetchSettings(); }, []);

  const uploadAndCreateSlide = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'sliders');
    formData.append('optimize', optimize ? 'true' : 'false');
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('upload failed');
    const data = await uploadRes.json();
    if (data.success && data.url) {
      const saveRes = await fetch('/api/slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.url, size: data.size, type: 'MAIN' }),
      });
      if (!saveRes.ok) throw new Error('save failed');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAndCreateSlide(files[i]);
      }
      await fetchSlides();
    } catch (err) {
      console.error(err);
      alert('خطا در آپلود یکی از تصاویر');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // آپدیت تابع حذف: ابتدا فایل از MinIO حذف شود، سپس رکورد از دیتابیس
  const handleDelete = async (id: number, imageUrl: string) => {
    if (!confirm('حذف شود؟')) return;

    // 1. حذف فایل فیزیکی از MinIO (فضای ابری)
    try {
      const deleteFileRes = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });
      if (!deleteFileRes.ok) {
        console.warn('حذف فایل از MinIO با مشکل مواجه شد، اما ادامه می‌دهیم');
      }
    } catch (err) {
      console.error('خطا در حذف فایل از MinIO:', err);
    }

    // 2. حذف رکورد از دیتابیس
    const res = await fetch(`/api/slider/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchSlides();
    } else {
      alert('خطا در حذف از دیتابیس');
    }
  };

  const handleUpdateSlide = async (updatedSlide: Slide) => {
    const res = await fetch('/api/slider', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSlide),
    });
    if (res.ok) fetchSlides();
    else alert('خطا');
  };

  const handleUpdateSettings = async (newSettings: SliderSettings) => {
    const res = await fetch('/api/slider-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) });
    if (res.ok) { await fetchSettings(); alert('ذخیره شد'); }
  };

  const openCropForSlide = (slide: Slide) => {
    setCurrentCropSlide(slide);
    setCropModalOpen(true);
  };

  const handleCropConfirm = async (croppedFile: File, optimizeFlag: boolean) => {
    if (!currentCropSlide) return;
    const formData = new FormData();
    formData.append('file', croppedFile);
    formData.append('type', 'sliders');
    formData.append('optimize', optimizeFlag ? 'true' : 'false');
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('upload failed');
    const data = await uploadRes.json();
    if (data.success && data.url) {
      await handleUpdateSlide({ ...currentCropSlide, imageUrl: data.url, size: data.size });
      await fetchSlides();
    }
  };

  return (
    <div>
      <SliderSettingsPanel settings={settings} onUpdate={handleUpdateSettings} />
      <div className="mb-10 p-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl text-center relative">
        <UploadCloud className="mx-auto text-blue-500 mb-3" size={48} />
        <p className="text-blue-800 font-medium">آپلود تصاویر (بدون کراپ اولیه)</p>
        <p className="text-sm text-blue-600 mt-2">پس از آپلود، می‌توانید هر اسلاید را جداگانه کراپ کنید.</p>
        <label className="inline-flex items-center gap-2 my-2 text-[rgb(39,39,39)]"><input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} /><span>بهینه‌سازی خودکار</span></label>
        <input type="file" multiple accept="image/*" onChange={handleFileSelect} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        {uploading && <div className="text-blue-700 mt-4 animate-pulse">در حال آپلود...</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {slides.map(slide => (
          <div key={slide.id} className="relative group rounded-xl overflow-hidden border shadow-sm bg-white">
            <img src={slide.imageUrl} className="w-full h-44 object-cover" alt="" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
              <button onClick={() => openCropForSlide(slide)} className="bg-green-500 p-2 rounded-full" title="کراپ مجدد"><CropIcon size={18} className="text-white" /></button>
              <button onClick={() => { setSelectedSlide(slide); setEditModalOpen(true); }} className="bg-blue-500 p-2 rounded-full"><Edit size={18} className="text-white" /></button>
              {/* پاس دادن imageUrl به تابع حذف */}
              <button onClick={() => handleDelete(slide.id, slide.imageUrl)} className="bg-red-500 p-2 rounded-full"><Trash2 size={18} className="text-white" /></button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs opacity-0 group-hover:opacity-100">
              <p className="truncate font-bold">{slide.title || 'بدون عنوان'}</p>
            </div>
            <div className="p-2 text-xs border-t bg-gray-50 flex justify-between"><span className="text-[rgb(39,39,39)]">حجم: {formatFileSize(slide.size)}</span><span className={getSizeStatus(slide.size).color}>{getSizeStatus(slide.size).text}</span></div>
          </div>
        ))}
        {slides.length === 0 && <div className="col-span-full text-center py-10 text-[rgb(39,39,39)]">اسلایدی وجود ندارد.</div>}
      </div>
      <CropModal isOpen={cropModalOpen} imageSrc={currentCropSlide?.imageUrl || null} onClose={() => { setCropModalOpen(false); setCurrentCropSlide(null); }} onCropConfirm={handleCropConfirm} aspectRatio={16/9} />
      <EditMainSlideModal isOpen={editModalOpen} slide={selectedSlide} onClose={() => setEditModalOpen(false)} onSave={handleUpdateSlide} />
    </div>
  );
}

// ==================== تب اسلایدر محصولات ====================
function ProductSliderTab() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentCropSlide, setCurrentCropSlide] = useState<Slide | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);

  const fetchSlides = async () => {
    const res = await fetch('/api/slider?type=PRODUCT');
    if (res.ok) setSlides(await res.json());
  };
  useEffect(() => { fetchSlides(); }, []);

  const uploadAndCreateSlide = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product-slider');
    formData.append('optimize', optimize ? 'true' : 'false');
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error();
    const data = await uploadRes.json();
    if (data.success && data.url) {
      const saveRes = await fetch('/api/slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.url, size: data.size, type: 'PRODUCT' }),
      });
      if (!saveRes.ok) throw new Error();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAndCreateSlide(files[i]);
      }
      await fetchSlides();
    } catch (err) {
      alert('خطا در آپلود');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // آپدیت تابع حذف برای تب محصولات
  const handleDelete = async (id: number, imageUrl: string) => {
    if (!confirm('حذف شود؟')) return;

    // حذف از MinIO
    try {
      const deleteFileRes = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, { method: 'DELETE' });
      if (!deleteFileRes.ok) console.warn('حذف از MinIO ناموفق');
    } catch (err) {
      console.error(err);
    }

    // حذف از دیتابیس
    const res = await fetch(`/api/slider/${id}`, { method: 'DELETE' });
    if (res.ok) fetchSlides();
    else alert('خطا در حذف از دیتابیس');
  };

  const handleUpdateSlide = async (updatedSlide: Slide) => {
    const res = await fetch('/api/slider', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSlide),
    });
    if (res.ok) fetchSlides();
    else alert('خطا');
  };

  const openCropForSlide = (slide: Slide) => {
    setCurrentCropSlide(slide);
    setCropModalOpen(true);
  };

  const handleCropConfirm = async (croppedFile: File, optimizeFlag: boolean) => {
    if (!currentCropSlide) return;
    const formData = new FormData();
    formData.append('file', croppedFile);
    formData.append('type', 'product-slider');
    formData.append('optimize', optimizeFlag ? 'true' : 'false');
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error();
    const data = await uploadRes.json();
    if (data.success && data.url) {
      await handleUpdateSlide({ ...currentCropSlide, imageUrl: data.url, size: data.size });
      await fetchSlides();
    }
  };

  return (
    <div>
      <div className="mb-10 p-8 border-2 border-dashed border-green-300 bg-green-50 rounded-xl text-center relative">
        <ImageIcon className="mx-auto text-green-600 mb-3" size={48} />
        <p className="text-green-800 font-medium">آپلود تصاویر برای گالری محصولات (بدون کراپ اولیه)</p>
        <label className="inline-flex items-center gap-2 my-2 text-[rgb(39,39,39)]"><input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} /><span>بهینه‌سازی خودکار</span></label>
        <input type="file" multiple accept="image/*" onChange={handleFileSelect} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        {uploading && <div className="text-green-700 mt-4 animate-pulse">در حال آپلود...</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {slides.map(slide => (
          <div key={slide.id} className="relative group rounded-xl overflow-hidden border shadow-sm bg-white">
            <img src={slide.imageUrl} className="w-full h-44 object-cover" alt="" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
              <button onClick={() => openCropForSlide(slide)} className="bg-green-500 p-2 rounded-full" title="کراپ مجدد"><CropIcon size={18} className="text-white" /></button>
              <button onClick={() => { setSelectedSlide(slide); setEditModalOpen(true); }} className="bg-blue-500 p-2 rounded-full"><Edit size={18} className="text-white" /></button>
              <button onClick={() => handleDelete(slide.id, slide.imageUrl)} className="bg-red-500 p-2 rounded-full"><Trash2 size={18} className="text-white" /></button>
            </div>
            <div className="p-2 text-xs border-t bg-gray-50 flex justify-between"><span className="text-[rgb(39,39,39)]">حجم: {formatFileSize(slide.size)}</span><span className={getSizeStatus(slide.size).color}>{getSizeStatus(slide.size).text}</span></div>
          </div>
        ))}
        {slides.length === 0 && <div className="col-span-full text-center py-10 text-[rgb(39,39,39)]">تصویری وجود ندارد.</div>}
      </div>
      <CropModal isOpen={cropModalOpen} imageSrc={currentCropSlide?.imageUrl || null} onClose={() => { setCropModalOpen(false); setCurrentCropSlide(null); }} onCropConfirm={handleCropConfirm} aspectRatio={null} />
      <EditProductSlideModal isOpen={editModalOpen} slide={selectedSlide} onClose={() => setEditModalOpen(false)} onSave={handleUpdateSlide} />
    </div>
  );
}

// ==================== کامپوننت اصلی ====================
export default function SliderManager() {
  const [activeTab, setActiveTab] = useState<'main' | 'product'>('main');
  return (
    <div className="bg-white rounded-xl shadow-md p-6" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4 mb-6 text-[rgb(39,39,39)]">مدیریت اسلایدر</h2>
      <div className="flex gap-4 border-b mb-6">
        <button onClick={() => setActiveTab('main')} className={`pb-2 px-4 font-bold ${activeTab === 'main' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-[rgb(39,39,39)]'}`}>اسلایدر اصلی</button>
        <button onClick={() => setActiveTab('product')} className={`pb-2 px-4 font-bold ${activeTab === 'product' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-[rgb(39,39,39)]'}`}>اسلایدر محصولات</button>
      </div>
      {activeTab === 'main' && <MainSliderTab />}
      {activeTab === 'product' && <ProductSliderTab />}
    </div>
  );
}