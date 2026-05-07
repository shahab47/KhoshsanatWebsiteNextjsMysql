'use client';
// مسیر فایل: src/app/admin/products/page.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, UploadCloud, Star, Trash2, ArrowRight, Save, ImageIcon,
  Info, Loader2, Edit, Search, Filter, FolderTree, CornerDownLeft, Package,
  LayoutList, XCircle, Crop, X, Check, Settings, Type, Palette
} from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor';

// ==================== Crop Modal (قابل استفاده برای دسته‌بندی و محصولات) ====================
interface CropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropConfirm: (croppedFile: File, optimize: boolean) => Promise<void>;
  aspectRatio?: number | null;
}

function CropModal({ isOpen, imageSrc, onClose, onCropConfirm, aspectRatio = 1 }: CropModalProps) {
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
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <Crop size={20} className="text-blue-500" />
            {aspectRatio ? 'برش با نسبت ثابت' : 'برش آزاد'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg">
          {aspectRatio ? 'نسبت ابعاد برش ثابت (1:1) است.' : 'می‌توانید هر ناحیه دلخواه را انتخاب کنید.'}
        </p>
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
          <label className="flex items-center gap-2 cursor-pointer text-gray-700">
            <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="w-5 h-5 rounded" />
            <span className="text-sm font-medium">بهینه‌سازی خودکار (کاهش حجم و کیفیت برای وب)</span>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 text-gray-800 bg-gray-100 rounded-xl hover:bg-gray-200">لغو</button>
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

// ==================== تابع کمکی برای فرمت حجم ====================
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return 'نامشخص';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ==================== تابع کمکی برای جلوگیری از خطای واکشی ====================
const apiFetch = async (url: string, options?: RequestInit) => {
  if (typeof window !== 'undefined' && (window.location.protocol === 'blob:' || window.location.origin === 'null')) {
    return {
      ok: true,
      json: async () => {
        if (url.includes('upload')) return { success: true, url: 'https://via.placeholder.com/150', size: 15000 };
        if (url.includes('categories')) return [];
        return [];
      }
    } as unknown as Response;
  }
  return fetch(url, options);
};

export default function ProfessionalProductsManager() {
  // --- استیت تب‌های اصلی ---
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');

  // ==========================================
  // بخش استیت‌های محصولات
  // ==========================================
  const [currentView, setCurrentView] = useState<'list' | 'add'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true
  });
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [slugError, setSlugError] = useState('');

  // استیت‌های جدید برای کراپ تصاویر محصولات
  const [productCropOpen, setProductCropOpen] = useState(false);
  const [productCropImageUrl, setProductCropImageUrl] = useState<string | null>(null);
  const [productCropIndex, setProductCropIndex] = useState<number>(-1);
  const [productCropUploading, setProductCropUploading] = useState(false);

  // ==========================================
  // بخش استیت‌های دسته‌بندی‌ها با قابلیت تصویر
  // ==========================================
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [catView, setCatView] = useState<'list' | 'cat-form' | 'sub-form'>('list');
  
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState({
    title: '', slug: '', icon: '', imageUrl: '', imageSize: null as number | null, order: 0, isActive: true
  });

  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subFormData, setSubFormData] = useState({
    title: '', description: '', categoryId: '', order: 0, isActive: true
  });

  // استیت‌های مربوط به آپلود و کراپ تصویر دسته‌بندی
  const [catUploading, setCatUploading] = useState(false);
  const [catOptimize, setCatOptimize] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentCropImageSrc, setCurrentCropImageSrc] = useState<string | null>(null);
  const [tempCategoryImageUrl, setTempCategoryImageUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // توابع دریافت اطلاعات (Fetch)
  // ==========================================
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await apiFetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiFetch('/api/products');
      const data = await res.json();
      setAllProducts(data);
    } catch (err) {
      console.error("خطا در دریافت محصولات", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // ==========================================
  // توابع اعتبارسنجی Slug
  // ==========================================
  const sanitizeSlug = (input: string): string => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    const hasInvalid = regex.test(cleaned);
    cleaned = cleaned.replace(regex, '');
    
    if (hasInvalid) {
      setSlugError('❌ فقط حروف انگلیسی، اعداد و خط تیره (-) مجاز است.');
    } else {
      setSlugError('');
    }
    return cleaned.toLowerCase();
  };

  const isSlugDuplicate = allProducts.some(p => p.slug === formData.slug && p.id !== editingId);

  // ==========================================
  // توابع مدیریت دسته‌بندی‌ها (با پشتیبانی از تصویر)
  // ==========================================
  const openNewCategoryForm = () => {
    setEditingCatId(null);
    setCatFormData({ title: '', slug: '', icon: '', imageUrl: '', imageSize: null, order: 0, isActive: true });
    setCatView('cat-form');
  };

  const editCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setCatFormData({
      title: cat.title, slug: cat.slug, icon: cat.icon || '',
      imageUrl: cat.imageUrl || '', imageSize: cat.imageSize || null,
      order: cat.order, isActive: cat.isActive
    });
    setCatView('cat-form');
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCatUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'categories');
      formDataUpload.append('optimize', catOptimize ? 'true' : 'false');
      
      const res = await apiFetch('/api/upload', { method: 'POST', body: formDataUpload });
      if (!res.ok) throw new Error('خطا در آپلود');
      const data = await res.json();
      
      if (data.success && data.url) {
        if (catFormData.imageUrl) {
          try {
            await apiFetch(`/api/upload?url=${encodeURIComponent(catFormData.imageUrl)}`, { method: 'DELETE' });
          } catch (err) { console.warn('خطا در حذف تصویر قدیمی:', err); }
        }
        setCatFormData(prev => ({
          ...prev,
          imageUrl: data.url,
          imageSize: data.size || null,
        }));
      } else {
        throw new Error('آپلود ناموفق');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در آپلود تصویر دسته‌بندی');
    } finally {
      setCatUploading(false);
      e.target.value = '';
    }
  };

  const handleCategoryCropRequest = () => {
    if (!catFormData.imageUrl) return;
    setTempCategoryImageUrl(catFormData.imageUrl);
    setCurrentCropImageSrc(catFormData.imageUrl);
    setCropModalOpen(true);
  };

  const handleCropConfirmForCategory = async (croppedFile: File, optimize: boolean) => {
    setCatUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', croppedFile);
      formDataUpload.append('type', 'categories');
      formDataUpload.append('optimize', optimize ? 'true' : 'false');
      
      const res = await apiFetch('/api/upload', { method: 'POST', body: formDataUpload });
      if (!res.ok) throw new Error('خطا در آپلود');
      const data = await res.json();
      
      if (data.success && data.url) {
        const oldUrl = catFormData.imageUrl;
        if (oldUrl && oldUrl !== tempCategoryImageUrl) {
          try {
            await apiFetch(`/api/upload?url=${encodeURIComponent(oldUrl)}`, { method: 'DELETE' });
          } catch (err) { console.warn('خطا در حذف تصویر قدیمی:', err); }
        }
        setCatFormData(prev => ({
          ...prev,
          imageUrl: data.url,
          imageSize: data.size || null,
        }));
      } else {
        throw new Error('آپلود ناموفق');
      }
    } catch (err) {
      console.error(err);
      alert('خطا در برش و آپلود تصویر دسته‌بندی');
    } finally {
      setCatUploading(false);
      setCropModalOpen(false);
      setCurrentCropImageSrc(null);
      setTempCategoryImageUrl(null);
    }
  };

  const handleDeleteCategoryImage = async () => {
    if (!catFormData.imageUrl) return;
    if (!confirm('آیا از حذف تصویر دسته‌بندی مطمئن هستید؟')) return;
    
    try {
      const res = await apiFetch(`/api/upload?url=${encodeURIComponent(catFormData.imageUrl)}`, { method: 'DELETE' });
      if (!res.ok) console.warn('حذف فایل از سرور با مشکل مواجه شد');
      setCatFormData(prev => ({ ...prev, imageUrl: '', imageSize: null }));
    } catch (err) {
      console.error(err);
      alert('خطا در حذف تصویر');
    }
  };

  const handleSaveCategory = async () => {
    if (!catFormData.title || !catFormData.slug) return alert('عنوان و نامک دسته‌بندی الزامی است.');

    const slugRegex = /^[a-zA-Z0-9\-]+$/;
    if (!slugRegex.test(catFormData.slug)) {
      return alert('خطا: نامک (Slug) فقط باید شامل حروف انگلیسی، اعداد و خط تیره (-) باشد.');
    }

    setSaving(true);
    const method = editingCatId ? 'PUT' : 'POST';
    const payload = editingCatId ? { id: editingCatId, ...catFormData } : catFormData;

    try {
      const res = await apiFetch('/api/categories', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(editingCatId ? 'دسته‌بندی آپدیت شد.' : 'دسته‌بندی جدید ایجاد شد.');
        fetchCategories();
        setCatView('list');
      } else {
        const err = await res.json(); alert(err.error);
      }
    } catch (error) { alert('خطا در ارتباط با سرور'); }
    finally { setSaving(false); }
  };

  const handleDeleteCategory = async (id: number, imageUrl?: string) => {
    if (!confirm('اخطار مهم: با حذف این دسته‌بندی، تمامی زیرمجموعه‌ها و محصولات داخل آن نیز پاک خواهند شد! آیا مطمئن هستید؟')) return;
    try {
      const res = await apiFetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        fetchProducts();
      }
    } catch (err) { alert('خطا در حذف دسته‌بندی'); }
  };

  // ==========================================
  // توابع مدیریت زیرمجموعه‌ها
  // ==========================================
  const openNewSubcategoryForm = (catId?: number) => {
    setEditingSubId(null);
    setSubFormData({ title: '', description: '', categoryId: catId ? catId.toString() : '', order: 0, isActive: true });
    setCatView('sub-form');
  };

  const editSubcategory = (sub: any, catId: number) => {
    setEditingSubId(sub.id);
    setSubFormData({ title: sub.title, description: sub.description || '', categoryId: catId.toString(), order: sub.order, isActive: sub.isActive });
    setCatView('sub-form');
  };

  const handleSaveSubcategory = async () => {
    if (!subFormData.title || !subFormData.categoryId) return alert('عنوان و انتخاب دسته اصلی الزامی است.');
    setSaving(true);
    const method = editingSubId ? 'PUT' : 'POST';
    const payload = editingSubId ? { id: editingSubId, ...subFormData } : subFormData;

    try {
      const res = await apiFetch('/api/subcategories', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('زیرمجموعه با موفقیت ذخیره شد.');
        fetchCategories();
        setCatView('list');
      } else {
        const err = await res.json(); alert(err.error);
      }
    } catch (error) { alert('خطا در ارتباط با سرور'); }
    finally { setSaving(false); }
  };

  const handleDeleteSubcategory = async (id: number) => {
    if (!confirm('اخطار: محصولات این زیرمجموعه نیز حذف خواهند شد! ادامه می‌دهید؟')) return;
    try {
      const res = await apiFetch(`/api/subcategories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        fetchProducts();
      }
    } catch (err) { alert('خطا در حذف زیرمجموعه'); }
  };

  // ==========================================
  // توابع محصولات
  // ==========================================
  const activeSubcategories = categories.find(c => c.id.toString() === selectedCategory)?.subcategories || [];
  const filterSubcategories = categories.find(c => c.id.toString() === filterCategory)?.subcategories || [];

  const displayedProducts = allProducts.filter(p => {
    let match = true;
    if (searchQuery && !p.title.includes(searchQuery)) match = false;
    if (filterSubcategory) {
      if (p.subcategoryId.toString() !== filterSubcategory) match = false;
    } else if (filterCategory) {
      const subIds = filterSubcategories.map((s: any) => s.id);
      if (!subIds.includes(p.subcategoryId)) match = false;
    }
    return match;
  });

  const getCategoryPath = (subId: number) => {
    for (const cat of categories) {
      const sub = cat.subcategories?.find((s: any) => s.id === subId);
      if (sub) return `${cat.title} / ${sub.title}`;
    }
    return 'نامشخص';
  };

  const handleEditProduct = (product: any) => {
    let catId = '';
    for (const cat of categories) {
      if (cat.subcategories?.some((s: any) => s.id === product.subcategoryId)) {
        catId = cat.id.toString();
        break;
      }
    }
    let parsedGallery: string[] = [];
    if (typeof product.gallery === 'string') {
      try { parsedGallery = JSON.parse(product.gallery); } catch(e){}
    } else if (Array.isArray(product.gallery)) parsedGallery = product.gallery;

    setSelectedCategory(catId);
    setEditingId(product.id);
    setFormData({
      title: product.title, slug: product.slug, shortDesc: product.shortDesc || '',
      description: product.description, subcategoryId: product.subcategoryId.toString(),
      order: product.order, isActive: product.isActive
    });
    setPrimaryImage(product.imageUrl);
    setGalleryUrls(parsedGallery || []);
    setCurrentView('add');
    setSlugError('');
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟ عکس‌های آن از سرور پاک خواهند شد.')) return;
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) setAllProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  // آپلود اولیه تصاویر محصول (بدون کراپ)
  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData.slug || isSlugDuplicate) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    
    const usedIndices = galleryUrls.map(url => {
       try {
           const parts = url.split('/');
           const filename = parts[parts.length - 1]; 
           const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')); 
           const prefix = `${formData.slug}-`;
           if (nameWithoutExt.startsWith(prefix)) {
               const idx = parseInt(nameWithoutExt.substring(prefix.length));
               if (!isNaN(idx)) return idx;
           }
       } catch (e) {}
       return -1;
    }).filter(i => i !== -1);

    let nextIndex = 1;
    const newUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      while (usedIndices.includes(nextIndex)) {
          nextIndex++;
      }
      usedIndices.push(nextIndex);

      const customName = `${formData.slug}-${nextIndex}`;

      const fd = new FormData(); 
      fd.append('file', files[i]); 
      fd.append('type', 'products'); 
      fd.append('customName', customName);
      
      try {
        const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) continue;
        
        const data = await res.json();
        const rawUrl = data.url || data.fileUrl || data.filepath;
        
        if (rawUrl) {
          if (rawUrl.startsWith('http')) {
            newUrls.push(rawUrl);
          } else {
            newUrls.push(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
          }
        }
      } catch (err) { console.error(err); }
    }
    
    setGalleryUrls(prev => [...prev, ...newUrls]);
    e.target.value = '';
    setUploading(false);
  };

  const removeImage = async (urlToRemove: string) => {
    setGalleryUrls(prev => prev.filter(url => url !== urlToRemove));
    if (primaryImage === urlToRemove) setPrimaryImage(null);
    try { await apiFetch(`/api/upload?url=${encodeURIComponent(urlToRemove)}`, { method: 'DELETE' }); } catch (err) {}
  };

  const handleProductCropRequest = (index: number, url: string) => {
    setProductCropIndex(index);
    setProductCropImageUrl(url);
    setProductCropOpen(true);
  };

  const handleProductCropConfirm = async (croppedFile: File, optimize: boolean) => {
    if (productCropIndex === -1) return;
    setProductCropUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', croppedFile);
      formDataUpload.append('type', 'products');
      formDataUpload.append('optimize', optimize ? 'true' : 'false');
      const res = await apiFetch('/api/upload', { method: 'POST', body: formDataUpload });
      if (!res.ok) throw new Error('خطا در آپلود');
      const data = await res.json();
      if (!data.success || !data.url) throw new Error('آپلود ناموفق');
      
      const oldUrl = galleryUrls[productCropIndex];
      setGalleryUrls(prev => {
        const newUrls = [...prev];
        newUrls[productCropIndex] = data.url;
        return newUrls;
      });
      if (primaryImage === oldUrl) {
        setPrimaryImage(data.url);
      }
      try {
        await apiFetch(`/api/upload?url=${encodeURIComponent(oldUrl)}`, { method: 'DELETE' });
      } catch (err) { console.warn('خطا در حذف فایل قدیمی:', err); }
      
      alert('تصویر با موفقیت برش خورد و جایگزین شد.');
    } catch (err) {
      console.error(err);
      alert('خطا در برش و آپلود تصویر');
    } finally {
      setProductCropUploading(false);
      setProductCropOpen(false);
      setProductCropImageUrl(null);
      setProductCropIndex(-1);
    }
  };

  const handleSaveProduct = async () => {
    if (isSlugDuplicate) {
      alert('خطا در ثبت محصول! ❌\n\nاین نامک (Slug) تکراری است و قبلاً برای محصول دیگری استفاده شده است.');
      return;
    }
    if (slugError) {
      alert('خطا در ثبت محصول! ❌\n\nنامک (Slug) حاوی کاراکترهای غیرمجاز است. فقط حروف انگلیسی، اعداد و خط تیره مجاز می‌باشند.');
      return;
    }

    const missingFields: string[] = [];
    if (!selectedCategory) missingFields.push('سرشاخه اصلی (دسته‌بندی)');
    if (!formData.subcategoryId) missingFields.push('زیرمجموعه (دسته دوم)');
    if (!formData.title) missingFields.push('نام کامل محصول');
    if (!formData.slug) missingFields.push('نامک انگلیسی (Slug)');
    if (!formData.description) missingFields.push('توضیحات کامل محصول');
    if (!primaryImage) missingFields.push('تصویر اصلی محصول (انتخاب یک تصویر با علامت ⭐️)');

    if (missingFields.length > 0) {
      alert(`خطا در ثبت محصول! ❌\n\nلطفاً فیلدهای زیر را تکمیل کنید:\n\n- ${missingFields.join('\n- ')}`);
      return;
    }

    const slugRegex = /^[a-zA-Z0-9\-]+$/;
    if (!slugRegex.test(formData.slug)) {
      alert('خطا! نامک (Slug) نامعتبر است. فقط از حروف انگلیسی، اعداد و خط تیره (-) استفاده کنید.');
      return;
    }

    setSaving(true);
    const payload = { ...formData, imageUrl: primaryImage, gallery: galleryUrls };
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    
    try {
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert('محصول با موفقیت ذخیره شد ✅');
        fetchProducts();
        setCurrentView('list');
      } else {
        const errData = await res.json(); alert(errData.error);
      }
    } catch (err) { alert('خطا در ارتباط با سرور'); } 
    finally { setSaving(false); }
  };

  const resetProductForm = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true });
    setGalleryUrls([]); setPrimaryImage(null); setSelectedCategory('');
    setSlugError('');
  };

  // ========================================================
  // رندرها (UI)
  // ========================================================

  return (
    <div className="max-w-7xl mx-auto pb-20 text-gray-800" dir="rtl">
      
      {/* هدر و تب‌های مدیریت */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">مدیریت جامع کاتالوگ</h2>
        <p className="text-gray-500 mb-6">ساختار دسته‌بندی‌ها و محصولات سایت را در این بخش مدیریت کنید.</p>
        
        <div className="flex flex-wrap items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit gap-2">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <FolderTree size={20} />
            مدیریت دسته‌بندی‌ها
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <Package size={20} />
            مدیریت محصولات
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* تب دسته‌بندی‌ها (بدون تغییر) */}
      {/* ========================================================= */}
      {activeTab === 'categories' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {catView === 'list' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-700">ساختار دسته‌ها</h3>
                <div className="flex gap-2">
                  <button onClick={openNewCategoryForm} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2">
                    <Plus size={16} /> سرشاخه جدید
                  </button>
                  <button onClick={() => openNewSubcategoryForm()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2">
                    <Plus size={16} /> زیرمجموعه جدید
                  </button>
                </div>
              </div>

              {loadingCategories ? (
                <div className="flex justify-center py-20 text-blue-500"><Loader2 className="animate-spin" size={40} /></div>
              ) : categories.length === 0 ? (
                <div className="text-center bg-white py-16 rounded-2xl border border-gray-100 shadow-sm">
                  <FolderTree className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 font-bold">هنوز هیچ دسته‌بندی ایجاد نشده است.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm flex-shrink-0">
                            {cat.imageUrl ? (
                              <img src={cat.imageUrl} alt={cat.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-lg bg-gray-50">
                                {cat.title.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-800 text-lg flex items-center gap-2">
                              {cat.title}
                              {!cat.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">غیرفعال</span>}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono mt-1">/{cat.slug}</p>
                            {cat.imageSize && (
                              <p className="text-[10px] text-gray-400 mt-0.5">حجم: {formatFileSize(cat.imageSize)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openNewSubcategoryForm(cat.id)} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:text-blue-600 hover:border-blue-200 transition">
                            + افزودن زیرمجموعه
                          </button>
                          <button onClick={() => editCategory(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteCategory(cat.id, cat.imageUrl)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>

                      <div className="p-4 bg-white pl-10">
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cat.subcategories.map((sub: any) => (
                              <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-blue-50 bg-blue-50/30 hover:bg-blue-50 transition group">
                                <div className="flex items-center gap-2">
                                  <CornerDownLeft size={16} className="text-blue-300" />
                                  <span className="text-sm font-bold text-gray-700">{sub.title}</span>
                                  {!sub.isActive && <XCircle size={14} className="text-red-400" />}
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => editSubcategory(sub, cat.id)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit size={14} /></button>
                                  <button onClick={() => handleDeleteSubcategory(sub.id)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Info size={14} /> بدون زیرمجموعه. برای ایجاد محصول باید زیرمجموعه بسازید.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {catView === 'cat-form' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">{editingCatId ? 'ویرایش سرشاخه' : 'ایجاد سرشاخه جدید'}</h3>
                <button onClick={() => setCatView('list')} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">عنوان سرشاخه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={catFormData.title} onChange={e => setCatFormData({...catFormData, title: e.target.value})} placeholder="مثال: قطعات فولادی" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">نامک (Slug - انگلیسی) *</label>
                  <input 
                    type="text" 
                    dir="ltr" 
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-800 bg-white" 
                    value={catFormData.slug} 
                    onChange={e => setCatFormData({...catFormData, slug: e.target.value.replace(/\s+/g, '-').toLowerCase()})} 
                    placeholder="steel-parts" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">تصویر دسته‌بندی (اختیاری)</label>
                  <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition cursor-pointer group mb-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCategoryImageUpload} 
                      disabled={catUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center">
                      <UploadCloud className="text-gray-400 group-hover:text-blue-500" size={40} />
                      <p className="text-sm text-gray-600 font-bold mt-2">
                        {catUploading ? 'در حال آپلود...' : 'انتخاب تصویر (بدون کراپ اولیه)'}
                      </p>
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <input type="checkbox" checked={catOptimize} onChange={(e) => setCatOptimize(e.target.checked)} />
                        <span>بهینه‌سازی خودکار</span>
                      </label>
                    </div>
                  </div>
                  
                  {catFormData.imageUrl && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200 group/image">
                      <img src={catFormData.imageUrl} alt="category" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={handleCategoryCropRequest}
                          className="p-1.5 rounded-full bg-white text-green-600 hover:bg-green-50"
                          title="برش تصویر"
                        >
                          <Crop size={14} />
                        </button>
                        <button 
                          onClick={handleDeleteCategoryImage}
                          className="p-1.5 rounded-full bg-white text-red-500 hover:bg-red-50"
                          title="حذف تصویر"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {catFormData.imageSize && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                          {formatFileSize(catFormData.imageSize)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600 mb-1">اولویت نمایش</label>
                    <input type="number" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={catFormData.order} onChange={e => setCatFormData({...catFormData, order: parseInt(e.target.value)})} />
                  </div>
                  <div className="flex-1 flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded" checked={catFormData.isActive} onChange={e => setCatFormData({...catFormData, isActive: e.target.checked})} />
                      <span className="font-bold text-sm text-gray-700">دسته فعال باشد</span>
                    </label>
                  </div>
                </div>
                <button onClick={handleSaveCategory} disabled={saving || catUploading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition mt-6 flex justify-center items-center gap-2">
                  {(saving || catUploading) ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره سرشاخه
                </button>
              </div>
            </div>
          )}

          {catView === 'sub-form' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">{editingSubId ? 'ویرایش زیرمجموعه' : 'ایجاد زیرمجموعه جدید'}</h3>
                <button onClick={() => setCatView('list')} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">سرشاخه اصلی *</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800" value={subFormData.categoryId} onChange={e => setSubFormData({...subFormData, categoryId: e.target.value})}>
                    <option value="">انتخاب سرشاخه...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">عنوان زیرمجموعه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={subFormData.title} onChange={e => setSubFormData({...subFormData, title: e.target.value})} placeholder="مثال: نبشی‌ها" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">توضیحات (اختیاری)</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 bg-white" value={subFormData.description} onChange={e => setSubFormData({...subFormData, description: e.target.value})} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600 mb-1">اولویت نمایش</label>
                    <input type="number" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={subFormData.order} onChange={e => setSubFormData({...subFormData, order: parseInt(e.target.value)})} />
                  </div>
                  <div className="flex-1 flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded" checked={subFormData.isActive} onChange={e => setSubFormData({...subFormData, isActive: e.target.checked})} />
                      <span className="font-bold text-sm text-gray-700">فعال باشد</span>
                    </label>
                  </div>
                </div>
                <button onClick={handleSaveSubcategory} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition mt-6 flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره زیرمجموعه
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* تب محصولات */}
      {/* ========================================================= */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {currentView === 'list' ? (
            <>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <button onClick={() => { setCurrentView('add'); resetProductForm(); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 md:ml-4">
                  <Plus size={20} /> محصول جدید
                </button>
                
                <div className="flex-1 w-full relative">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="جستجو در نام محصولات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800" />
                </div>

                <div className="w-full md:w-48">
                  <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800">
                    <option value="">همه سرشاخه‌ها</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} disabled={!filterCategory} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-gray-800">
                    <option value="">همه زیرمجموعه‌ها</option>
                    {filterSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-20 text-blue-500"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold">در حال بارگذاری...</p></div>
                ) : displayedProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                          <th className="p-4 font-bold w-24">تصویر</th>
                          <th className="p-4 font-bold">نام محصول</th>
                          <th className="p-4 font-bold hidden md:table-cell">دسته‌بندی</th>
                          <th className="p-4 font-bold text-center">وضعیت</th>
                          <th className="p-4 font-bold text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedProducts.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                              <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-800">{product.title}</p>
                              <p className="text-xs text-gray-400 font-mono mt-1">{product.slug}</p>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                {getCategoryPath(product.subcategoryId)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.isActive ? 'فعال' : 'غیرفعال'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleEditProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <LayoutList size={60} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-500 font-bold mb-4">محصولی در این دسته‌بندی یافت نشد.</p>
                    {allProducts.length === 0 && <button onClick={() => { setCurrentView('add'); resetProductForm(); }} className="text-blue-600 font-bold underline">افزودن اولین محصول</button>}
                  </div>
                )}
              </div>
            </>
          ) : (
            // فرم افزودن/ویرایش محصول با چیدمان جدید (ادیتور در عرض کامل صفحه)
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button onClick={() => { setCurrentView('list'); resetProductForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition"><ArrowRight size={24} /></button>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{editingId ? 'ویرایش محصول' : 'ایجاد محصول جدید'}</h2>
                </div>
                <button onClick={handleSaveProduct} disabled={saving || uploading} className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition shadow-md ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {saving ? 'در حال بررسی و ثبت...' : 'ذخیره محصول'}
                </button>
              </div>

              {/* ========== چیدمان اصلی دو ستونه برای اطلاعات و تصاویر ========== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* ستون اطلاعات اولیه */}
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-gray-700 border-b pb-3">مشخصات اصلی</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">سرشاخه *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">انتخاب کنید...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">زیرمجموعه (الزامی) *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800" value={formData.subcategoryId} onChange={e => setFormData({...formData, subcategoryId: e.target.value})} disabled={!selectedCategory}>
                        <option value="">ابتدا سرشاخه را انتخاب کنید</option>
                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نام کامل محصول *</label>
                    <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نامک (Slug) *</label>
                    <input 
                      type="text" 
                      dir="ltr" 
                      className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-800 transition-colors ${
                        (isSlugDuplicate || slugError) ? 'bg-red-50 border-red-400' : 'bg-white border-gray-200'
                      }`} 
                      value={formData.slug} 
                      onChange={e => {
                        const rawValue = e.target.value;
                        const sanitized = sanitizeSlug(rawValue);
                        setFormData({...formData, slug: sanitized});
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text/plain');
                        const sanitized = sanitizeSlug(pastedText);
                        if (sanitized) {
                          setFormData({...formData, slug: sanitized});
                        }
                      }}
                    />
                    {slugError && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                        <XCircle size={14} /> {slugError}
                      </p>
                    )}
                    {isSlugDuplicate && !slugError && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                        <XCircle size={14} /> این نامک قبلاً استفاده شده است! لطفاً برای جلوگیری از تداخل، آن را تغییر دهید.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">توضیح کوتاه</label>
                    <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 bg-white" value={formData.shortDesc} onChange={e => setFormData({...formData, shortDesc: e.target.value})} />
                  </div>
                </div>

                {/* ستون گالری و تنظیمات */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">گالری تصاویر</h3>
                    
                    {(!formData.slug || isSlugDuplicate) ? (
                      <div className="relative border-2 border-dashed border-red-200 rounded-2xl p-8 text-center bg-red-50 mb-6 transition-all">
                        <div className="flex flex-col items-center">
                          <Info className="text-red-400 mb-2" size={40} />
                          <p className="text-sm text-red-600 font-bold mt-2">
                            {!formData.slug 
                              ? "برای آپلود تصویر، ابتدا باید نامک (Slug) محصول را وارد کنید."
                              : "نامک وارد شده تکراری است! برای جلوگیری از تداخل عکس‌ها، ابتدا نامک را تغییر دهید."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition cursor-pointer group mb-6">
                        <input id="product-image-upload" type="file" multiple accept="image/*" onChange={handleMultiUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="flex flex-col items-center">
                          <UploadCloud className="text-gray-400 group-hover:text-blue-500" size={40} />
                          <p className="text-sm text-gray-600 font-bold mt-2">آپلود تصاویر (بدون کراپ اولیه)</p>
                        </div>
                        {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
                      </div>
                    )}

                    {galleryUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {galleryUrls.map((url, i) => {
                          const isPrimary = primaryImage === url;
                          return (
                            <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isPrimary ? 'border-amber-400' : 'border-gray-100'}`}>
                              <img src={url} className="w-full h-full object-cover" alt="img" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => setPrimaryImage(url)} className={`p-1.5 rounded-full ${isPrimary ? 'bg-amber-400 text-white' : 'bg-white text-gray-600'}`}>
                                  <Star size={14} fill={isPrimary ? "white" : "none"} />
                                </button>
                                <button onClick={() => handleProductCropRequest(i, url)} className="p-1.5 rounded-full bg-white text-green-600 hover:bg-green-50">
                                  <Crop size={14} />
                                </button>
                                <button onClick={() => removeImage(url)} className="p-1.5 rounded-full bg-white text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-xl"><ImageIcon className="mx-auto text-gray-300 mb-2" size={24} /><p className="text-xs text-gray-400">بدون تصویر</p></div>
                    )}
                    <p className="text-xs text-gray-500 mt-4 text-center">پس از آپلود، می‌توانید با کلیک روی دکمه برش، هر تصویر را به دلخواه کراپ کنید.</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-700 mb-4">تنظیمات انتشار</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">اولویت نمایش (عدد بزرگتر = بالاتر)</label>
                      <input type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition border border-gray-100 mt-4">
                      <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                      <span className="text-sm font-black text-gray-700">این محصول در سایت فعال باشد</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ========== بخش جداگانه برای ادیتور متنی (تمام عرض) ========== */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">توضیحات کامل محصول *</h3>
                <HitmanTextEditor 
                  value={formData.description} 
                  onChange={(html: string) => setFormData({...formData, description: html})}
                  slug={formData.slug}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* مودال کراپ برای تصویر دسته‌بندی (برش آزاد) */}
      <CropModal
        isOpen={cropModalOpen}
        imageSrc={currentCropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setCurrentCropImageSrc(null);
          setTempCategoryImageUrl(null);
        }}
        onCropConfirm={handleCropConfirmForCategory}
        aspectRatio={null}
      />

      {/* مودال کراپ برای تصاویر محصولات (برش آزاد) */}
      <CropModal
        isOpen={productCropOpen}
        imageSrc={productCropImageUrl}
        onClose={() => {
          setProductCropOpen(false);
          setProductCropImageUrl(null);
          setProductCropIndex(-1);
        }}
        onCropConfirm={handleProductCropConfirm}
        aspectRatio={null}
      />
    </div>
  );
}