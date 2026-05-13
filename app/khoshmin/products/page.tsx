'use client';
// مسیر فایل: src/app/khoshmin/products/page.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, UploadCloud, Star, Trash2, ArrowRight, Save, ImageIcon,
  Info, Loader2, Edit, Search, Filter, FolderTree, CornerDownLeft, Package,
  LayoutList, XCircle, Crop, X, Check, Settings, Type, Palette, Book, Copy, CheckCheck
} from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor';
import GalleryManager, { GalleryItem } from '../../../components/GalleryManager';
import { useModal } from '@/app/contexts/ModalContext';

// ==================== توابع کمکی ====================
const apiFetch = async (url: string, options?: RequestInit) => {
  if (typeof window !== 'undefined' && (window.location.protocol === 'blob:' || window.location.origin === 'null')) {
    return {
      ok: true,
      json: async () => []
    } as unknown as Response;
  }
  return fetch(url, options);
};

export default function ProfessionalProductsManager() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');

  // استیت کاتالوگ شرکت
  const [companyCatalogFile, setCompanyCatalogFile] = useState<File | null>(null);
  const [companyCatalogName, setCompanyCatalogName] = useState('');
  const [companyCatalogUploading, setCompanyCatalogUploading] = useState(false);
  const [companyCatalogUrl, setCompanyCatalogUrl] = useState('');

  // استیت‌های محصولات
  const [currentView, setCurrentView] = useState<'list' | 'add'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true
  });
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [catalogUrl, setCatalogUrl] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [slugError, setSlugError] = useState('');

  // استیت‌های دسته‌بندی‌ها
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [catView, setCatView] = useState<'list' | 'cat-form' | 'sub-form'>('list');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  const [catFormData, setCatFormData] = useState({
    title: '', slug: '', icon: '', imageUrl: '', catalogUrl: '', gallery: [] as string[], order: 0, isActive: true
  });

  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subFormData, setSubFormData] = useState({
    title: '', description: '', categoryId: '', order: 0, isActive: true
  });

  const [catUploading, setCatUploading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // state برای رهگیری فایل‌های موقت آپلود شده در فرم محصولات
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);
  // state برای رهگیری فایل‌های موقت آپلود شده در فرم دسته‌بندی
  const [tempCatUploadedUrls, setTempCatUploadedUrls] = useState<string[]>([]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await apiFetch('/api/categories');
      setCategories(await res.json());
    } catch (err) { } finally { setLoadingCategories(false); }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiFetch('/api/products');
      setAllProducts(await res.json());
    } catch (err) { } finally { setLoadingProducts(false); }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // جلوگیری از خروج ناخواسته صفحه در صورت وجود فایل‌های موقتی
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tempUploadedUrls.length > 0 || tempCatUploadedUrls.length > 0) {
        e.preventDefault();
        e.returnValue = 'فایل‌های آپلود شده ذخیره نشده‌اند. آیا مطمئن هستید؟';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tempUploadedUrls, tempCatUploadedUrls]);

  const sanitizeSlug = (input: string): string => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    const hasInvalid = regex.test(cleaned);
    cleaned = cleaned.replace(regex, '');
    setSlugError(hasInvalid ? '❌ فقط حروف انگلیسی، اعداد و خط تیره (-) مجاز است.' : '');
    return cleaned.toLowerCase();
  };

  const isSlugDuplicate = allProducts.some(p => p.slug === formData.slug && p.id !== editingId);

  // ==========================================
  // آپلود و مدیریت کاتالوگ جامع شرکت
  // ==========================================
  const handleCompanyCatalogUpload = async () => {
    if (!companyCatalogFile) return;
    setCompanyCatalogUploading(true);
    const fd = new FormData();
    fd.append('file', companyCatalogFile);
    fd.append('type', 'company_catalog');
    fd.append('folder', 'KSCataloge');
    if (companyCatalogName.trim()) fd.append('customName', companyCatalogName.trim());

    try {
      const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('خطا در ارتباط با سرور');
      const data = await res.json();
      setCompanyCatalogUrl(data.url);
      showAlert('کاتالوگ جامع شرکت با موفقیت آپلود شد ✅', 'موفقیت', 'success');
      setCompanyCatalogFile(null);
      setCompanyCatalogName('');
    } catch (err: any) {
      showAlert(`خطا در آپلود ❌\n\n${err.message}`, 'خطا', 'error');
    } finally {
      setCompanyCatalogUploading(false);
    }
  };

  const handleDeleteCompanyCatalog = async () => {
    if (!companyCatalogUrl) return;
    showConfirm({
      title: 'حذف کاتالوگ شرکت',
      message: 'آیا از حذف کاتالوگ کلی شرکت مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/upload?url=${encodeURIComponent(companyCatalogUrl)}`, { method: 'DELETE' });
          if (res.ok) {
            setCompanyCatalogUrl('');
            showAlert('کاتالوگ قبلی با موفقیت حذف شد.', 'موفقیت', 'success');
          } else {
            showAlert('خطا در حذف کاتالوگ از سرور.', 'خطا', 'error');
          }
        } catch (error) {
          showAlert('خطای ارتباط با سرور هنگام حذف کاتالوگ.', 'خطا', 'error');
        }
      }
    });
  };

  // ==========================================
  // توابع دسته‌بندی‌ها
  // ==========================================
  const openNewCategoryForm = () => {
    setEditingCatId(null);
    setCatFormData({ title: '', slug: '', icon: '', imageUrl: '', catalogUrl: '', gallery: [], order: 0, isActive: true });
    setCatView('cat-form');
    setTempCatUploadedUrls([]);
  };

  const editCategory = (cat: any) => {
    setEditingCatId(cat.id);
    let galleryArr = cat.gallery || [];
    if (typeof cat.gallery === 'string') {
      try { galleryArr = JSON.parse(cat.gallery); } catch (e) { }
    }
    setCatFormData({
      title: cat.title, slug: cat.slug, icon: cat.icon || '',
      imageUrl: cat.imageUrl || '', catalogUrl: cat.catalogUrl || '',
      gallery: galleryArr,
      order: cat.order, isActive: cat.isActive
    });
    setCatView('cat-form');
    setTempCatUploadedUrls([]);
  };

  const handleCategoryGalleryUpload = async (files: FileList | File[], optimize: boolean) => {
    setCatUploading(true);
    const newUrls: string[] = [];
    let newImageUrl = catFormData.imageUrl;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'categories');
      fd.append('optimize', optimize ? 'true' : 'false');

      if (file.type === 'application/pdf') {
        fd.append('folder', 'KSCataloge');
      }

      try {
        const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
          if (file.type !== 'application/pdf' && !newImageUrl) newImageUrl = data.url;
          setTempCatUploadedUrls(prev => [...prev, data.url]);
        }
      } catch (err) { }
    }

    setCatFormData(prev => ({
      ...prev,
      gallery: [...prev.gallery, ...newUrls],
      imageUrl: newImageUrl
    }));
    setCatUploading(false);
  };

  const handleSetCategoryCatalog = async (item: GalleryItem) => {
    if (!catFormData.slug) {
      showAlert('ابتدا نامک دسته‌بندی را وارد کنید.', 'خطا', 'error');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const targetName = `KS-${catFormData.slug}-${dateStr}.pdf`;

    if (item.imageUrl.endsWith(targetName)) {
      setCatFormData(prev => ({ ...prev, catalogUrl: item.imageUrl }));
      return;
    }

    setCatUploading(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUrl: item.imageUrl, targetName, folder: 'KSCataloge' })
      });
      const data = await res.json();
      if (res.ok) {
        setCatFormData(prev => ({
          ...prev,
          gallery: prev.gallery.map(url => url === item.imageUrl ? data.url : url),
          catalogUrl: data.url
        }));
        setTempCatUploadedUrls(prev => [...prev.filter(u => u !== item.imageUrl), data.url]);
      } else {
        showAlert(data.message, 'خطا', 'error');
      }
    } catch (err) {
      showAlert('خطا در تغییر نام کاتالوگ', 'خطا', 'error');
    } finally {
      setCatUploading(false);
    }
  };

  const handleCatGalleryDelete = async (item: GalleryItem) => {
    setCatFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter(u => u !== item.imageUrl),
      imageUrl: prev.imageUrl === item.imageUrl ? '' : prev.imageUrl,
      catalogUrl: prev.catalogUrl === item.imageUrl ? '' : prev.catalogUrl
    }));
    setTempCatUploadedUrls(prev => prev.filter(url => url !== item.imageUrl));
    try {
      await apiFetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
    } catch (err) { }
  };

  const handleSaveCategory = async () => {
    if (!catFormData.title || !catFormData.slug) {
      showAlert('عنوان و نامک دسته‌بندی الزامی است.', 'خطا', 'error');
      return;
    }
    setSaving(true);
    const method = editingCatId ? 'PUT' : 'POST';
    const payload = editingCatId ? { id: editingCatId, ...catFormData } : catFormData;
    try {
      const res = await apiFetch('/api/categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        fetchCategories();
        setCatView('list');
        setTempCatUploadedUrls([]);
        showAlert('دسته‌بندی با موفقیت ذخیره شد.', 'موفقیت', 'success');
      } else {
        showAlert('خطا در ذخیره دسته‌بندی.', 'خطا', 'error');
      }
    } catch (error) {
      showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    showConfirm({
      title: 'حذف دسته‌بندی',
      message: 'آیا از حذف دسته‌بندی مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/categories?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchCategories();
            fetchProducts();
            showAlert('دسته‌بندی با موفقیت حذف شد.', 'موفقیت', 'success');
          } else {
            showAlert('خطا در حذف دسته‌بندی.', 'خطا', 'error');
          }
        } catch (err) {
          showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
        }
      }
    });
  };

  // تابع برای خروج از فرم دسته‌بندی با بررسی فایل‌های موقتی
  const exitCategoryForm = async () => {
    if (tempCatUploadedUrls.length > 0) {
      showConfirm({
        title: 'خروج بدون ذخیره',
        message: 'شما فایل‌های جدیدی آپلود کرده‌اید اما ذخیره نکرده‌اید. آیا مایلید این فایل‌ها از سرور حذف شوند؟',
        type: 'warning',
        confirmText: 'بله، حذف شوند',
        cancelText: 'خیر، بمانند',
        onConfirm: async () => {
          for (const url of tempCatUploadedUrls) {
            await apiFetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
          }
          setTempCatUploadedUrls([]);
          setCatView('list');
        },
        onCancel: () => { }
      });
    } else {
      setCatView('list');
    }
  };

  // ==========================================
  // توابع زیرمجموعه‌ها
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
    setSaving(true);
    const method = editingSubId ? 'PUT' : 'POST';
    const payload = editingSubId ? { id: editingSubId, ...subFormData } : subFormData;
    try {
      const res = await apiFetch('/api/subcategories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        fetchCategories();
        setCatView('list');
        showAlert('زیرمجموعه با موفقیت ذخیره شد.', 'موفقیت', 'success');
      } else {
        showAlert('خطا در ذخیره زیرمجموعه.', 'خطا', 'error');
      }
    } catch (error) {
      showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubcategory = async (id: number) => {
    showConfirm({
      title: 'حذف زیرمجموعه',
      message: 'آیا از حذف این زیرمجموعه مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/subcategories?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchCategories();
            fetchProducts();
            showAlert('زیرمجموعه با موفقیت حذف شد.', 'موفقیت', 'success');
          } else {
            showAlert('خطا در حذف زیرمجموعه.', 'خطا', 'error');
          }
        } catch (err) {
          showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
        }
      }
    });
  };

  // ==========================================
  // توابع محصولات
  // ==========================================
  const handleEditProduct = (product: any) => {
    let catId = '';
    for (const cat of categories) {
      if (cat.subcategories?.some((s: any) => s.id === product.subcategoryId)) { catId = cat.id.toString(); break; }
    }
    let parsedGallery: string[] = [];
    if (typeof product.gallery === 'string') {
      try { parsedGallery = JSON.parse(product.gallery); } catch (e) { }
    } else if (Array.isArray(product.gallery)) parsedGallery = product.gallery;

    setSelectedCategory(catId);
    setEditingId(product.id);
    setFormData({
      title: product.title, slug: product.slug, shortDesc: product.shortDesc || '',
      description: product.description, subcategoryId: product.subcategoryId.toString(), order: product.order, isActive: product.isActive
    });
    setPrimaryImage(product.imageUrl);
    setCatalogUrl(product.catalogUrl || null);
    setGalleryUrls(parsedGallery || []);
    setCurrentView('add');
    setSlugError('');
    setTempUploadedUrls([]);
  };

  const handleDeleteProduct = async (id: number) => {
    showConfirm({
      title: 'حذف محصول',
      message: 'آیا از حذف این محصول مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setAllProducts(prev => prev.filter(p => p.id !== id));
            showAlert('محصول با موفقیت حذف شد.', 'موفقیت', 'success');
          } else {
            showAlert('خطا در حذف محصول.', 'خطا', 'error');
          }
        } catch (err) {
          showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
        }
      }
    });
  };

  const handleProductGalleryUpload = async (files: FileList | File[], optimize: boolean) => {
    setUploading(true);
    const newUrls: string[] = [];
    let newPrimaryImage = primaryImage;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf';
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'products');
      fd.append('optimize', optimize ? 'true' : 'false');

      if (isPdf) fd.append('folder', 'KSCataloge');

      try {
        const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
          if (!isPdf && !newPrimaryImage) newPrimaryImage = data.url;
          setTempUploadedUrls(prev => [...prev, data.url]);
        }
      } catch (err) { }
    }

    setGalleryUrls(prev => [...prev, ...newUrls]);
    if (newPrimaryImage !== primaryImage) setPrimaryImage(newPrimaryImage);
    setUploading(false);
  };

  const handleSetProductCatalog = async (item: GalleryItem) => {
    if (!formData.slug) {
      showAlert('ابتدا نامک محصول را وارد کنید.', 'خطا', 'error');
      return;
    }

    const targetName = `ks-cat-${formData.slug}.pdf`;

    if (item.imageUrl.endsWith(targetName)) {
      setCatalogUrl(item.imageUrl);
      return;
    }

    setUploading(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUrl: item.imageUrl, targetName, folder: 'KSCataloge' })
      });
      const data = await res.json();
      if (res.ok) {
        setGalleryUrls(prev => prev.map(url => url === item.imageUrl ? data.url : url));
        setCatalogUrl(data.url);
        setTempUploadedUrls(prev => [...prev.filter(u => u !== item.imageUrl), data.url]);
      } else {
        showAlert(data.message, 'خطا', 'error');
      }
    } catch (err) {
      showAlert('خطا در تغییر نام فایل کاتالوگ', 'خطا', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleProductGalleryDelete = async (item: GalleryItem) => {
    setGalleryUrls(prev => prev.filter(url => url !== item.imageUrl));
    if (primaryImage === item.imageUrl) setPrimaryImage(null);
    if (catalogUrl === item.imageUrl) setCatalogUrl(null);
    setTempUploadedUrls(prev => prev.filter(url => url !== item.imageUrl));
    try {
      await apiFetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
    } catch (err) { }
  };

  const handleSaveProduct = async () => {
    if (isSlugDuplicate || slugError || !selectedCategory || !formData.subcategoryId || !formData.title || !formData.slug) {
      showAlert('اطلاعات فرم ناقص یا نامعتبر است.', 'خطا', 'error');
      return;
    }
    setSaving(true);
    const payload = { ...formData, imageUrl: primaryImage, catalogUrl: catalogUrl, gallery: galleryUrls };
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/products/${editingId}` : '/api/products';

    try {
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        showAlert('محصول ذخیره شد ✅', 'موفقیت', 'success');
        fetchProducts();
        setCurrentView('list');
        setTempUploadedUrls([]);
      } else {
        showAlert('خطا در ذخیره محصول.', 'خطا', 'error');
      }
    } catch (err) {
      showAlert('خطا در ارتباط با سرور.', 'خطا', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetProductForm = async () => {
    if (tempUploadedUrls.length > 0) {
      showConfirm({
        title: 'خروج بدون ذخیره',
        message: 'شما فایل‌های جدیدی آپلود کرده‌اید اما ذخیره نکرده‌اید. آیا مایلید این فایل‌ها از سرور حذف شوند؟',
        type: 'warning',
        confirmText: 'بله، حذف شوند',
        cancelText: 'خیر، بمانند',
        onConfirm: async () => {
          for (const url of tempUploadedUrls) {
            await apiFetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
          }
          setTempUploadedUrls([]);
          setEditingId(null);
          setFormData({ title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true });
          setGalleryUrls([]);
          setPrimaryImage(null);
          setCatalogUrl(null);
          setSelectedCategory('');
          setSlugError('');
        },
        onCancel: () => { }
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true });
      setGalleryUrls([]);
      setPrimaryImage(null);
      setCatalogUrl(null);
      setSelectedCategory('');
      setSlugError('');
    }
  };

  const activeSubcategories = categories.find(c => c.id.toString() === selectedCategory)?.subcategories || [];
  const filterSubcategories = categories.find(c => c.id.toString() === filterCategory)?.subcategories || [];
  const displayedProducts = allProducts.filter(p => {
    let match = true;
    if (searchQuery && !p.title.includes(searchQuery)) match = false;
    if (filterSubcategory) { if (p.subcategoryId.toString() !== filterSubcategory) match = false; }
    else if (filterCategory) {
      const subIds = filterSubcategories.map((s: any) => s.id);
      if (!subIds.includes(p.subcategoryId)) match = false;
    }
    return match;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 text-gray-800" dir="rtl">

      {/* نوار آپلود کاتالوگ شرکت */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto text-gray-700 font-bold whitespace-nowrap">
          <Book className="text-blue-500" /> کاتالوگ جامع شرکت
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
          <input type="text" placeholder="نام فایل (پیش‌فرض: نام اصلی فایل)" value={companyCatalogName} onChange={e => setCompanyCatalogName(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 flex-1 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50" />
          <input type="file" accept="application/pdf" id="company-catalog-input" className="hidden" onChange={e => setCompanyCatalogFile(e.target.files?.[0] || null)} />
          <label htmlFor="company-catalog-input" className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition text-center whitespace-nowrap border border-blue-100">
            {companyCatalogFile ? companyCatalogFile.name : 'انتخاب فایل PDF'}
          </label>
          <button onClick={handleCompanyCatalogUpload} disabled={!companyCatalogFile || companyCatalogUploading} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {companyCatalogUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} آپلود
          </button>
        </div>
        {companyCatalogUrl && (
          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
            <button onClick={() => { navigator.clipboard.writeText(companyCatalogUrl); showAlert('کپی شد!', 'موفقیت', 'success'); }} className="px-3 py-2 text-gray-500 hover:text-blue-600 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-xs font-bold transition">
              <Copy size={16} /> کپی
            </button>
            <button onClick={handleDeleteCompanyCatalog} className="px-3 py-2 text-red-500 hover:text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold transition">
              <Trash2 size={16} /> حذف
            </button>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">مدیریت محصولات و دسته‌ها</h2>
        <div className="flex flex-wrap items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit gap-2 mt-4">
          <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>
            <FolderTree size={20} /> مدیریت دسته‌بندی‌ها
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Package size={20} /> مدیریت محصولات
          </button>
        </div>
      </div>

      {activeTab === 'categories' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {catView === 'list' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-700">ساختار دسته‌ها</h3>
                <div className="flex gap-2">
                  <button onClick={openNewCategoryForm} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <Plus size={16} /> سرشاخه جدید
                  </button>
                  <button onClick={() => openNewSubcategoryForm()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                    <Plus size={16} /> زیرمجموعه جدید
                  </button>
                </div>
              </div>
              {loadingCategories ? (
                <div className="flex justify-center py-20 text-blue-500"><Loader2 className="animate-spin" size={40} /></div>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border">
                            {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold bg-gray-50">{cat.title.charAt(0)}</div>}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-800 text-lg flex items-center gap-2">
                              {cat.title}
                              {cat.catalogUrl && <span title="دارای کاتالوگ"><Book size={14} className="text-purple-500 inline" /></span>}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono mt-1">/{cat.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openNewSubcategoryForm(cat.id)} className="text-xs bg-white border px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:text-blue-600 transition">+ افزودن زیرمجموعه</button>
                          <button onClick={() => editCategory(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
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
                            <Info size={14} /> بدون زیرمجموعه.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {catView === 'cat-form' && (
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="col-span-1 lg:col-span-2 flex justify-between items-center border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">{editingCatId ? 'ویرایش سرشاخه' : 'ایجاد سرشاخه جدید'}</h3>
                <button onClick={exitCategoryForm} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">عنوان سرشاخه *</label>
                  <input type="text" className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" value={catFormData.title} onChange={e => setCatFormData({ ...catFormData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">نامک (Slug) *</label>
                  <input type="text" dir="ltr" className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-gray-50" value={catFormData.slug} onChange={e => setCatFormData({ ...catFormData, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">اولویت نمایش</label>
                  <input type="number" className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" value={catFormData.order} onChange={e => setCatFormData({ ...catFormData, order: parseInt(e.target.value) })} />
                </div>
                <div className="pt-4">
                  <button onClick={handleSaveCategory} disabled={saving || catUploading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2">
                    {(saving || catUploading) ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره سرشاخه
                  </button>
                </div>
              </div>

              {/* گالری دسته بندی */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6 flex flex-col min-h-[400px]">
                <h4 className="font-bold text-gray-700 mb-4 text-sm flex items-center gap-2"><ImageIcon size={18} /> فایل‌ها و کاتالوگ دسته</h4>
                {!catFormData.slug ? (
                  <div className="text-center p-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex-1 flex items-center justify-center">
                    ابتدا نامک دسته‌بندی را وارد کنید.
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <GalleryManager
                      title="آپلود فایل"
                      description="برای تغییر نام فایل PDF به استاندارد، روی دکمه 📖 کلیک کنید."
                      items={catFormData.gallery.map((url, i) => ({ id: i, imageUrl: url, size: null }))}
                      isUploading={catUploading}
                      onUpload={handleCategoryGalleryUpload}
                      onDelete={handleCatGalleryDelete}
                      hasPrimaryImage={true}
                      primaryImageUrl={catFormData.imageUrl}
                      onSetPrimary={(item) => setCatFormData({ ...catFormData, imageUrl: item.imageUrl })}
                      hasCatalog={true}
                      catalogUrl={catFormData.catalogUrl}
                      onSetCatalog={handleSetCategoryCatalog}
                      allowCopyLink={true}
                    />
                  </div>
                )}
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
                  <select className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={subFormData.categoryId} onChange={e => setSubFormData({ ...subFormData, categoryId: e.target.value })}>
                    <option value="">انتخاب سرشاخه...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">عنوان زیرمجموعه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-3" value={subFormData.title} onChange={e => setSubFormData({ ...subFormData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">توضیحات (اختیاری)</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-3 resize-none" value={subFormData.description} onChange={e => setSubFormData({ ...subFormData, description: e.target.value })} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600 mb-1">اولویت نمایش</label>
                    <input type="number" className="w-full border border-gray-200 rounded-xl p-3" value={subFormData.order} onChange={e => setSubFormData({ ...subFormData, order: parseInt(e.target.value) })} />
                  </div>
                  <div className="flex-1 flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded" checked={subFormData.isActive} onChange={e => setSubFormData({ ...subFormData, isActive: e.target.checked })} />
                      <span className="font-bold text-sm text-gray-700">فعال باشد</span>
                    </label>
                  </div>
                </div>
                <button onClick={handleSaveSubcategory} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-6 flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره زیرمجموعه
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {currentView === 'list' ? (
            <div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <button onClick={() => { setCurrentView('add'); resetProductForm(); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex justify-center gap-2">
                  <Plus size={20} /> محصول جدید
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {displayedProducts.map(product => (
                  <div key={product.id} className="p-4 border-b flex justify-between items-center hover:bg-gray-50">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-lg overflow-hidden border">
                        {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" alt="prod" /> : <div className="w-full h-full bg-gray-100" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">
                          {product.title}
                          {product.catalogUrl && <span title="دارای کاتالوگ"><Book size={14} className="inline text-purple-500 mr-2" /></span>}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{product.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditProduct(product)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit size={18} /></button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setCurrentView('list'); resetProductForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition"><ArrowRight size={24} /></button>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{editingId ? 'ویرایش محصول' : 'ایجاد محصول جدید'}</h2>
                </div>
                <button onClick={handleSaveProduct} disabled={saving || uploading} className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 ${saving ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره محصول
                </button>
              </div>

              {/* فرم محصول: چیدمان ۲ ستونه برابر */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* ستون مشخصات اصلی */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-start">
                  <h3 className="text-lg font-bold text-gray-700 border-b pb-3">مشخصات اصلی</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">سرشاخه *</label>
                      <select className="w-full border rounded-xl p-3 bg-gray-50" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">انتخاب کنید...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">زیرمجموعه *</label>
                      <select className="w-full border rounded-xl p-3 bg-gray-50" value={formData.subcategoryId} onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })} disabled={!selectedCategory}>
                        <option value="">انتخاب کنید</option>
                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نام محصول *</label>
                    <input type="text" className="w-full border rounded-xl p-3" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نامک (Slug) *</label>
                    <input type="text" dir="ltr" className="w-full border rounded-xl p-3 font-mono" value={formData.slug} onChange={e => setFormData({ ...formData, slug: sanitizeSlug(e.target.value) })} />
                  </div>
                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="block text-sm font-bold text-gray-600">توضیح کوتاه</label>
                    <textarea className="w-full border rounded-xl p-4 resize-none flex-1 min-h-[120px]" value={formData.shortDesc} onChange={e => setFormData({ ...formData, shortDesc: e.target.value })} />
                  </div>
                </div>

                {/* ستون گالری محصول */}
                <div className="space-y-8 flex flex-col">
                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-[450px]">
                    <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">تصاویر و کاتالوگ PDF</h3>

                    {(!formData.slug || isSlugDuplicate) ? (
                      <div className="flex-1 flex items-center justify-center p-6 bg-red-50 rounded-xl text-center border border-red-100">
                        <p className="text-sm text-red-600 font-bold">برای آپلود فایل، ابتدا نامک معتبر وارد کنید.</p>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 flex flex-col">
                        <GalleryManager
                          title="آپلود فایل"
                          description="بعد از آپلود، با زدن دکمه 📖 فایل به نام استاندارد کاتالوگ تغییر پیدا می‌کند."
                          items={galleryUrls.map((url, i) => ({ id: i, imageUrl: url, size: null }))}
                          isUploading={uploading}
                          onUpload={handleProductGalleryUpload}
                          onDelete={handleProductGalleryDelete}
                          hasPrimaryImage={true}
                          primaryImageUrl={primaryImage}
                          onSetPrimary={(item) => setPrimaryImage(item.imageUrl)}
                          hasCatalog={true}
                          catalogUrl={catalogUrl}
                          onSetCatalog={handleSetProductCatalog}
                          allowCopyLink={true}
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-3">تنظیمات انتشار</h3>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input type="number" placeholder="اولویت نمایش" className="w-full border rounded-xl p-3" value={formData.order} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })} />
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                          <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                          <span className="text-sm font-black text-gray-700">این محصول فعال باشد</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">توضیحات کامل محصول *</h3>
                <HitmanTextEditor value={formData.description} onChange={(html: string) => setFormData({ ...formData, description: html })} slug={formData.slug} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}