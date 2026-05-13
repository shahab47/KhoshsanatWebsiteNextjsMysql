'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, UploadCloud, Loader2, FileText, File as FileIcon, Copy, CheckCheck, Star, Crop, X, Book, Edit2 } from 'lucide-react';

export interface GalleryItem {
  id: number | string;
  imageUrl: string;
  size?: number | null;
  title?: string | null;
  subtitle?: string | null;
  titleColor?: string;
  titleFontSize?: string;
  subtitleColor?: string;
  subtitleFontSize?: string;
  [key: string]: any;
}

export interface GalleryManagerProps {
  title: string;
  description: string;
  items: GalleryItem[];
  isUploading: boolean;
  onUpload: (files: FileList | File[], optimize: boolean) => void;
  onDelete: (item: GalleryItem) => void;
  onUpdate?: (item: GalleryItem) => void;
  onCropReplace?: (item: GalleryItem, croppedFile: File, optimize: boolean) => void;
  aspectRatio?: number | null;
  themeColor?: string;
  icon?: React.ReactNode;
  textMode?: 'simple' | 'full';
  hasPrimaryImage?: boolean;
  primaryImageUrl?: string | null;
  onSetPrimary?: (item: GalleryItem) => void;
  hasCatalog?: boolean;
  catalogUrl?: string | null;
  onSetCatalog?: (item: GalleryItem) => void;
  allowCopyLink?: boolean;
  acceptedTypes?: string;
  multiple?: boolean;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'نامشخص';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSizeStatus(bytes: number | null | undefined): { text: string; color: string } {
  if (!bytes) return { text: 'نامشخص', color: 'text-gray-400' };
  if (bytes < 300 * 1024) return { text: 'عالی', color: 'text-green-600' };
  if (bytes < 800 * 1024) return { text: 'خوب', color: 'text-yellow-600' };
  return { text: 'بالا', color: 'text-red-600' };
}

const cleanUrl = (url: string) => url.split('?')[0];
const isImageFile = (url?: string) => /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(cleanUrl(url || ''));
const isPdfFile = (url?: string) => /\.(pdf)$/i.test(cleanUrl(url || ''));
const getFileName = (url: string) => cleanUrl(url).split('/').pop() || 'فایل نامشخص';

export default function GalleryManager({
  title,
  description,
  items,
  isUploading,
  onUpload,
  onDelete,
  onCropReplace,
  onUpdate,
  aspectRatio,
  themeColor = '#2563EB',
  icon,
  textMode = 'simple',
  hasPrimaryImage = false,
  primaryImageUrl,
  onSetPrimary,
  hasCatalog = false,
  catalogUrl,
  onSetCatalog,
  allowCopyLink = false,
  acceptedTypes = "image/*,application/pdf,text/plain,.zip,.rar",
  multiple = true
}: GalleryManagerProps) {
  const [optimize, setOptimize] = useState(true);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [cropModal, setCropModal] = useState<{ item: GalleryItem; img: HTMLImageElement; imgWidth: number; imgHeight: number; scale: number } | null>(null);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const dragStart = useRef({ x: 0, y: 0, startRect: { x: 0, y: 0, w: 0, h: 0 } });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fetchedSizes, setFetchedSizes] = useState<Record<string, number>>({});

  // مودال ویرایش متن
  const [editModal, setEditModal] = useState<{ item: GalleryItem } | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    subtitle: '',
    titleColor: '#ffffff',
    titleFontSize: '3rem',
    subtitleColor: '#d1d5db',
    subtitleFontSize: '1.25rem'
  });

  // گرفتن حجم فایل‌ها
  useEffect(() => {
    items.forEach(item => {
      if (!item.size && !fetchedSizes[item.imageUrl] && item.imageUrl) {
        fetch(item.imageUrl, { method: 'HEAD' })
          .then(res => {
            if (res.ok) {
              const length = res.headers.get('content-length');
              if (length) setFetchedSizes(prev => ({ ...prev, [item.imageUrl]: parseInt(length, 10) }));
            }
          })
          .catch(() => {});
      }
    });
  }, [items, fetchedSizes]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files, optimize);
      e.target.value = '';
    }
  };

  const handleCopyLink = (e: React.MouseEvent, url: string, id: string | number) => {
    e.stopPropagation();
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => alert('خطا در کپی لینک'));
  };

  // حذف بدون کانفرم – والد خودش تصمیم می‌گیرد
  const handleDeleteClick = (item: GalleryItem) => {
    onDelete(item);
  };

  // منطق برش (بدون تغییر)
  const openCropModal = (item: GalleryItem) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let displayWidth = img.width;
      let displayHeight = img.height;
      let scale = 1;
      const maxSize = 500;
      if (displayWidth > maxSize) {
        scale = maxSize / displayWidth;
        displayWidth = maxSize;
        displayHeight = img.height * scale;
      }
      if (displayHeight > maxSize) {
        scale = maxSize / displayHeight;
        displayHeight = maxSize;
        displayWidth = img.width * scale;
      }
      const canvas = document.createElement('canvas');
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, displayWidth, displayHeight);
      const resizedImg = new Image();
      resizedImg.onload = () => {
        setCropModal({ item, img: resizedImg, imgWidth: displayWidth, imgHeight: displayHeight, scale });
        setCropRect({ x: displayWidth * 0.1, y: displayHeight * 0.1, w: displayWidth * 0.8, h: displayHeight * 0.8 });
      };
      resizedImg.src = canvas.toDataURL();
    };
    img.src = item.imageUrl;
  };

  const getHandleFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const handleSize = 8;
    const near = (val: number, target: number) => Math.abs(val - target) < handleSize;
    if (near(mouseX, cropRect.x) && near(mouseY, cropRect.y)) return 'nw';
    if (near(mouseX, cropRect.x + cropRect.w) && near(mouseY, cropRect.y)) return 'ne';
    if (near(mouseX, cropRect.x) && near(mouseY, cropRect.y + cropRect.h)) return 'sw';
    if (near(mouseX, cropRect.x + cropRect.w) && near(mouseY, cropRect.y + cropRect.h)) return 'se';
    if (near(mouseX, cropRect.x + cropRect.w / 2) && near(mouseY, cropRect.y)) return 'n';
    if (near(mouseX, cropRect.x + cropRect.w / 2) && near(mouseY, cropRect.y + cropRect.h)) return 's';
    if (near(mouseX, cropRect.x) && near(mouseY, cropRect.y + cropRect.h / 2)) return 'w';
    if (near(mouseX, cropRect.x + cropRect.w) && near(mouseY, cropRect.y + cropRect.h / 2)) return 'e';
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const handle = getHandleFromMouse(e);
    if (handle) {
      setResizeHandle(handle);
      dragStart.current = { x: mouseX, y: mouseY, startRect: { ...cropRect } };
      setIsDragging(true);
    } else if (mouseX >= cropRect.x && mouseX <= cropRect.x + cropRect.w && mouseY >= cropRect.y && mouseY <= cropRect.y + cropRect.h) {
      setResizeHandle(null);
      dragStart.current = { x: mouseX - cropRect.x, y: mouseY - cropRect.y, startRect: cropRect };
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    if (resizeHandle) {
      let { x, y, w, h } = dragStart.current.startRect;
      const dx = mouseX - dragStart.current.x;
      const dy = mouseY - dragStart.current.y;
      switch (resizeHandle) {
        case 'nw': x += dx; w -= dx; y += dy; h -= dy; break;
        case 'ne': w += dx; y += dy; h -= dy; break;
        case 'sw': x += dx; w -= dx; h += dy; break;
        case 'se': w += dx; h += dy; break;
        case 'n': y += dy; h -= dy; break;
        case 's': h += dy; break;
        case 'w': x += dx; w -= dx; break;
        case 'e': w += dx; break;
      }
      if (w < 10) w = 10;
      if (h < 10) h = 10;
      if (x < 0) { w += x; x = 0; }
      if (y < 0) { h += y; y = 0; }
      if (x + w > canvasRef.current.width) w = canvasRef.current.width - x;
      if (y + h > canvasRef.current.height) h = canvasRef.current.height - y;
      setCropRect({ x, y, w, h });
    } else {
      let newX = mouseX - dragStart.current.x;
      let newY = mouseY - dragStart.current.y;
      newX = Math.min(Math.max(newX, 0), canvasRef.current.width - cropRect.w);
      newY = Math.min(Math.max(newY, 0), canvasRef.current.height - cropRect.h);
      setCropRect(prev => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleMouseUp = () => { setIsDragging(false); setResizeHandle(null); };

  const applyCrop = () => {
    if (!cropModal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = cropModal.img;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropRect.w;
    croppedCanvas.height = cropRect.h;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx?.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    croppedCanvas.toBlob(blob => {
      if (blob && onCropReplace) {
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        onCropReplace(cropModal.item, file, optimize);
      }
      setCropModal(null);
    }, 'image/jpeg');
  };

  useEffect(() => {
    if (cropModal && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = cropModal.imgWidth;
      canvasRef.current.height = cropModal.imgHeight;
      ctx?.drawImage(cropModal.img, 0, 0);
      const draw = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(cropModal.img, 0, 0);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvasRef.current.width, cropRect.y);
        ctx.fillRect(0, cropRect.y + cropRect.h, canvasRef.current.width, canvasRef.current.height - (cropRect.y + cropRect.h));
        ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
        ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvasRef.current.width - (cropRect.x + cropRect.w), cropRect.h);
        ctx.fillStyle = 'white';
        const hs = 6;
        ctx.fillRect(cropRect.x - hs/2, cropRect.y - hs/2, hs, hs);
        ctx.fillRect(cropRect.x + cropRect.w - hs/2, cropRect.y - hs/2, hs, hs);
        ctx.fillRect(cropRect.x - hs/2, cropRect.y + cropRect.h - hs/2, hs, hs);
        ctx.fillRect(cropRect.x + cropRect.w - hs/2, cropRect.y + cropRect.h - hs/2, hs, hs);
        ctx.fillRect(cropRect.x + cropRect.w/2 - hs/2, cropRect.y - hs/2, hs, hs);
        ctx.fillRect(cropRect.x + cropRect.w/2 - hs/2, cropRect.y + cropRect.h - hs/2, hs, hs);
        ctx.fillRect(cropRect.x - hs/2, cropRect.y + cropRect.h/2 - hs/2, hs, hs);
        ctx.fillRect(cropRect.x + cropRect.w - hs/2, cropRect.y + cropRect.h/2 - hs/2, hs, hs);
      };
      draw();
      const interval = setInterval(draw, 50);
      return () => clearInterval(interval);
    }
  }, [cropModal, cropRect]);

  // مودال ویرایش متن
  const openEditModal = (item: GalleryItem) => {
    setEditData({
      title: item.title || '',
      subtitle: item.subtitle || '',
      titleColor: item.titleColor || '#ffffff',
      titleFontSize: item.titleFontSize || '3rem',
      subtitleColor: item.subtitleColor || '#d1d5db',
      subtitleFontSize: item.subtitleFontSize || '1.25rem',
    });
    setEditModal({ item });
  };

  const saveEdit = () => {
    if (!editModal || !onUpdate) return;
    const updated = { ...editModal.item, ...editData };
    onUpdate(updated);
    setEditModal(null);
  };

  return (
    <div dir="rtl" className="flex flex-col h-full w-full min-h-0">
      <div className="shrink-0 mb-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl p-3 transition hover:bg-white/60">
        <input type="file" multiple={multiple} accept={acceptedTypes} onChange={handleFileSelect} disabled={isUploading} ref={fileInputRef} className="hidden" />
        <div onClick={() => !isUploading && fileInputRef.current?.click()} className="cursor-pointer">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm text-blue-800 shrink-0">
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : (icon || <UploadCloud size={24} />)}
              </div>
              <div>
                <p className="text-blue-800 font-bold text-sm">{isUploading ? 'در حال آپلود...' : title}</p>
                <p className="text-blue-600 text-[11px] leading-tight">{description}</p>
              </div>
            </div>
            <div className="flex justify-start sm:justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-white/70 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                <span className="text-blue-600">بهینه‌سازی حجم</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full">
        <div className="h-full w-full flex flex-nowrap gap-4 overflow-x-auto pb-4 snap-x items-start">
          {items.map((item, index) => {
            const isImg = isImageFile(item.imageUrl);
            const isPdf = isPdfFile(item.imageUrl);
            const isPrimary = hasPrimaryImage && primaryImageUrl === item.imageUrl;
            const isCatalog = hasCatalog && catalogUrl === item.imageUrl;
            const currentId = item.id || `temp-${index}`;
            const finalSize = item.size || fetchedSizes[item.imageUrl] || null;
            const sizeStatus = getSizeStatus(finalSize);
            const fileName = getFileName(item.imageUrl);

            return (
              <div key={currentId} className="flex flex-col items-center gap-2 shrink-0 snap-start" style={{ width: '130px' }}>
                <div className={`relative group w-full aspect-square rounded-xl overflow-hidden border shadow-sm bg-white hover:shadow-md transition-all ${isPrimary ? 'border-[3px] border-amber-500 shadow-amber-200' : isCatalog ? 'border-[3px] border-purple-500 shadow-purple-200' : 'border-gray-200'}`}>
                  <div className={`absolute top-1.5 left-1.5 flex flex-col gap-1.5 z-30 transition-opacity ${isPrimary || isCatalog ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                    {allowCopyLink && (
                      <button onClick={(e) => handleCopyLink(e, item.imageUrl, currentId)} className="bg-white/90 backdrop-blur p-1.5 rounded-full text-gray-700 hover:text-blue-600 shadow-sm" title="کپی لینک">
                        {copiedId === currentId ? <CheckCheck size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                    {isImg && onCropReplace && (
                      <button onClick={() => openCropModal(item)} className="bg-white/90 backdrop-blur p-1.5 rounded-full text-gray-700 hover:text-green-600 shadow-sm" title="برش تصویر">
                        <Crop size={12} />
                      </button>
                    )}
                    {hasPrimaryImage && onSetPrimary && isImg && (
                      <button onClick={(e) => { e.stopPropagation(); onSetPrimary(item); }} 
                        className={`p-1.5 rounded-full backdrop-blur shadow-sm transition ${isPrimary ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/90 text-gray-500 hover:text-amber-500'}`} title="تنظیم به عنوان تصویر اصلی">
                        <Star size={12} fill={isPrimary ? "currentColor" : "none"} />
                      </button>
                    )}
                    {hasCatalog && onSetCatalog && isPdf && (
                      <button onClick={(e) => { e.stopPropagation(); onSetCatalog(item); }} 
                        className={`p-1.5 rounded-full backdrop-blur shadow-sm transition ${isCatalog ? 'bg-purple-600 text-white shadow-md' : 'bg-white/90 text-gray-500 hover:text-purple-600'}`} title="تنظیم به عنوان فایل کاتالوگ">
                        <Book size={12} fill={isCatalog ? "currentColor" : "none"} />
                      </button>
                    )}
                    {textMode === 'full' && isImg && onUpdate && (
                      <button onClick={() => openEditModal(item)} className="bg-white/90 backdrop-blur p-1.5 rounded-full text-gray-700 hover:text-blue-600 shadow-sm" title="ویرایش متن">
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteClick(item)} className="bg-white/90 backdrop-blur p-1.5 rounded-full text-gray-700 hover:text-red-600 shadow-sm" title="حذف">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="relative w-full h-full bg-gray-100">
                    {isImg ? (
                      <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="preview" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50 pb-5">
                        {isPdf ? <FileText size={28} className={isCatalog ? "text-purple-500" : ""} /> : <FileIcon size={28} />}
                        <span className="text-[10px] mt-2 font-bold text-gray-500">{isPdf ? 'PDF' : 'فایل'}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-1.5 text-[10px] flex justify-between items-center z-20 border-t border-gray-100">
                    <span className="text-gray-600 font-medium truncate">{formatFileSize(finalSize)}</span>
                    <span className={`font-bold ${sizeStatus.color}`}>{sizeStatus.text}</span>
                  </div>
                </div>
                <div className="w-full px-1 flex justify-center">
                  <p className="text-[11px] font-bold text-gray-700 truncate max-w-full text-center" dir="ltr" title={fileName}>
                    {fileName}
                  </p>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="w-full flex items-center justify-center py-8 text-gray-400 text-xs font-bold bg-gray-50/50 rounded-xl border border-dashed border-gray-200 h-full">
              فایلی آپلود نشده است.
            </div>
          )}
        </div>
      </div>

      {/* مودال برش */}
      {cropModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[90vw] max-h-[90vh] overflow-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">برش تصویر</h3>
              <button onClick={() => setCropModal(null)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
            </div>
            <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={{ maxWidth: '100%', cursor: 'crosshair' }} />
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={applyCrop} className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition">تأیید برش</button>
              <button onClick={() => setCropModal(null)} className="bg-gray-200 px-5 py-2 rounded-lg text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال ویرایش متن */}
      {editModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-4">ویرایش متن اسلاید</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">عنوان</label>
                <input type="text" className="w-full border rounded-lg p-2" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">زیرنویس</label>
                <input type="text" className="w-full border rounded-lg p-2" value={editData.subtitle} onChange={e => setEditData({...editData, subtitle: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">رنگ عنوان</label>
                  <input type="color" value={editData.titleColor} onChange={e => setEditData({...editData, titleColor: e.target.value})} className="w-full h-10" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">سایز عنوان</label>
                  <input type="text" placeholder="مثلاً 3rem" value={editData.titleFontSize} onChange={e => setEditData({...editData, titleFontSize: e.target.value})} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">رنگ زیرنویس</label>
                  <input type="color" value={editData.subtitleColor} onChange={e => setEditData({...editData, subtitleColor: e.target.value})} className="w-full h-10" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">سایز زیرنویس</label>
                  <input type="text" placeholder="مثلاً 1.25rem" value={editData.subtitleFontSize} onChange={e => setEditData({...editData, subtitleFontSize: e.target.value})} className="w-full border rounded-lg p-2" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 bg-gray-200 rounded-lg">انصراف</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}