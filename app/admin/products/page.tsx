'use client';

import React, { useState, useEffect } from 'react';
import { Plus, UploadCloud, Star, Trash2, ArrowRight, Save, Image as ImageIcon, Info, Loader2, Edit, Search, Filter } from 'lucide-react';

export default function ProfessionalProductsManager() {
  const [currentView, setCurrentView] = useState<'list' | 'add'>('list');
  
  // --- اطلاعات فرم محصول (برای ثبت یا ویرایش) ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true
  });
  
  // --- مدیریت تصاویر ---
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  
  // --- داده‌های دیتابیس و وضعیت‌ها ---
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // --- استیت‌های فیلتر و جستجو (لیست محصولات) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');

  // --- لودینگ‌ها ---
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // 1. دریافت دسته‌بندی‌ها (که زیرمجموعه‌ها را هم داخل خود دارند)
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  // 2. دریافت تمام محصولات
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setAllProducts(data);
    } catch (err) {
      console.error("خطا در دریافت محصولات", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (currentView === 'list') {
      fetchProducts();
    }
  }, [currentView]);

  // --- استخراج زیرمجموعه‌ها بر اساس دسته انتخاب شده (بدون نیاز به API مجدد) ---
  // برای فرم افزودن/ویرایش
  const activeSubcategories = categories.find(c => c.id.toString() === selectedCategory)?.subcategories || [];
  // برای فیلتر لیست
  const filterSubcategories = categories.find(c => c.id.toString() === filterCategory)?.subcategories || [];

  // --- فیلتر کردن محصولات در سمت کلاینت (بسیار سریع) ---
  const displayedProducts = allProducts.filter(p => {
    let match = true;
    
    // فیلتر جستجوی متنی
    if (searchQuery && !p.title.includes(searchQuery)) match = false;
    
    // فیلتر زیرمجموعه
    if (filterSubcategory) {
      if (p.subcategoryId.toString() !== filterSubcategory) match = false;
    } 
    // فیلتر دسته اصلی (اگر زیرمجموعه انتخاب نشده بود)
    else if (filterCategory) {
      const subIds = filterSubcategories.map((s: any) => s.id);
      if (!subIds.includes(p.subcategoryId)) match = false;
    }

    return match;
  });

  // تولید مسیر دسته‌بندی برای نمایش در جدول
  const getCategoryPath = (subId: number) => {
    for (const cat of categories) {
      const sub = cat.subcategories?.find((s: any) => s.id === subId);
      if (sub) return `${cat.title} / ${sub.title}`;
    }
    return 'دسته‌بندی نامشخص';
  };

  // --- منطق ورود به حالت ویرایش ---
  const handleEditProduct = (product: any) => {
    // پیدا کردن دسته اصلی از روی زیرمجموعه
    let catId = '';
    for (const cat of categories) {
      if (cat.subcategories?.some((s: any) => s.id === product.subcategoryId)) {
        catId = cat.id.toString();
        break;
      }
    }

    // پارس کردن گالری
    let parsedGallery: string[] = [];
    if (typeof product.gallery === 'string') {
      try { parsedGallery = JSON.parse(product.gallery); } catch(e){}
    } else if (Array.isArray(product.gallery)) {
      parsedGallery = product.gallery;
    }

    setSelectedCategory(catId);
    setEditingId(product.id);
    setFormData({
      title: product.title,
      slug: product.slug,
      shortDesc: product.shortDesc || '',
      description: product.description,
      subcategoryId: product.subcategoryId.toString(),
      order: product.order,
      isActive: product.isActive
    });
    setPrimaryImage(product.imageUrl);
    setGalleryUrls(parsedGallery || []);
    
    setCurrentView('add');
  };

  // --- منطق حذف کل محصول ---
  const handleDeleteProduct = async (id: number) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟ تمام عکس‌های آن از سرور پاک خواهند شد.')) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // بروزرسانی لیست
        setAllProducts(prev => prev.filter(p => p.id !== id));
      } else {
        alert('خطا در حذف محصول');
      }
    } catch (err) {
      console.error(err);
      alert('خطای ارتباط با سرور');
    }
  };


  // --- مدیریت آپلود گروهی ---
  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      fd.append('type', 'products'); 
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          console.error(`ارور سرور در آپلود عکس ${i + 1}`);
          continue;
        }
        const data = await res.json();
        
        const rawUrl = data.url || data.fileUrl || data.filepath || data.path || data.imageUrl || data.slide?.imageUrl || data.product?.imageUrl || (typeof data === 'string' ? data : null);
        if (rawUrl) {
          const finalUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          newUrls.push(finalUrl);
        }
      } catch (err) {
        console.error("خطا در آپلود عکس شماره " + (i + 1), err);
      }
    }

    setGalleryUrls(prev => [...prev, ...newUrls]);
    e.target.value = '';
    setUploading(false);
  };

  const removeImage = async (urlToRemove: string) => {
    setGalleryUrls(prev => prev.filter(url => url !== urlToRemove));
    if (primaryImage === urlToRemove) setPrimaryImage(null);

    try {
      await fetch(`/api/upload?url=${encodeURIComponent(urlToRemove)}`, { method: 'DELETE' });
    } catch (err) {
      console.error("خطا در درخواست حذف فیزیکی فایل:", err);
    }
  };

  // ذخیره در دیتابیس (بررسی اینکه POST است یا PUT)
  const handleSaveProduct = async () => {
    if (!formData.title || !formData.slug || !formData.subcategoryId || !primaryImage) {
      alert('تکمیل تمامی موارد ستاره‌دار و انتخاب تصویر اصلی الزامی است.');
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      imageUrl: primaryImage,
      gallery: galleryUrls, 
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/products/${editingId}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingId ? 'محصول با موفقیت بروزرسانی شد.' : 'محصول با موفقیت در سیستم ثبت شد.');
        setCurrentView('list');
        resetForm();
      } else {
        const errData = await res.json();
        alert(`خطا: ${errData.error}`);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', shortDesc: '', description: '', subcategoryId: '', order: 0, isActive: true });
    setGalleryUrls([]);
    setPrimaryImage(null);
    setSelectedCategory('');
  };

  const openNewProductForm = () => {
    resetForm();
    setCurrentView('add');
  };

  // ========================================================
  // رابط کاربری: فرم افزودن / ویرایش محصول
  // ========================================================
  if (currentView === 'add') {
    return (
      <div className="max-w-6xl mx-auto pb-20" dir="rtl">
        <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={() => { setCurrentView('list'); resetForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition">
              <ArrowRight size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingId ? 'ویرایش محصول' : 'ایجاد محصول جدید'}
            </h2>
          </div>
          <button 
            onClick={handleSaveProduct}
            disabled={saving || uploading}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition shadow-lg ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {saving ? 'در حال ثبت...' : (editingId ? 'بروزرسانی محصول' : 'انتشار محصول')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-700 border-b pb-3">مشخصات فنی و محتوا</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">دسته‌بندی اصلی *</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    <option value="">انتخاب کنید...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">زیرمجموعه تخصصی *</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" value={formData.subcategoryId} onChange={e => setFormData({...formData, subcategoryId: e.target.value})} disabled={!selectedCategory}>
                    <option value="">انتخاب کنید...</option>
                    {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-600">نام کامل محصول *</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="مثال: نبشی منقطع ۵ سانتی‌متری" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-600">نامک (Slug) *</label>
                <input type="text" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="steel-bracket-5cm" />
                <div className="flex items-start gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg mt-2">
                  <Info size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    نامک همان آدرس صفحه محصول در وب‌سایت است. فقط از حروف انگلیسی، اعداد و خط تیره (-) استفاده کنید. این فیلد برای سئو سایت بسیار حیاتی است.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-600">توضیح کوتاه</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={formData.shortDesc} onChange={e => setFormData({...formData, shortDesc: e.target.value})} placeholder="یک معرفی ۱-۲ خطی..." />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-600">توضیحات کامل محصول *</label>
                <textarea rows={8} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="جزئیات فنی، کاربردها و مزایای محصول را اینجا بنویسید..." />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">مدیریت تصاویر</h3>
              
              <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:bg-gray-50 transition cursor-pointer group mb-6">
                <input type="file" multiple accept="image/*" onChange={handleMultiUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center">
                  <UploadCloud className="text-gray-400 group-hover:text-blue-500 transition-colors" size={48} />
                  <p className="text-sm text-gray-500 font-bold mt-3">آپلود عکس‌های گالری</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG حداکثر ۲ مگابایت</p>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                )}
              </div>

              {galleryUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {galleryUrls.map((url, index) => {
                    const isPrimary = primaryImage === url;
                    return (
                      <div key={index} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isPrimary ? 'border-amber-400 ring-4 ring-amber-50' : 'border-gray-100'}`}>
                        <img src={url} className="w-full h-full object-cover" alt="gallery" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button onClick={() => setPrimaryImage(url)} className={`p-2 rounded-full shadow-lg ${isPrimary ? 'bg-amber-400 text-white' : 'bg-white text-gray-600 hover:text-amber-500'}`}>
                            <Star size={18} fill={isPrimary ? "white" : "none"} />
                          </button>
                          <button onClick={() => removeImage(url)} className="p-2 rounded-full bg-white text-gray-600 hover:text-red-600 shadow-lg">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        {isPrimary && (
                          <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                            تصویر اصلی
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                  <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs text-gray-400">هنوز عکسی آپلود نشده است</p>
                </div>
              )}
              
              {galleryUrls.length > 0 && !primaryImage && (
                <div className="mt-4 p-3 bg-amber-50 border-r-4 border-amber-400 text-[11px] text-amber-800 font-bold animate-pulse">
                   لطفاً با کلیک روی آیکون ستاره، یکی از تصاویر را به عنوان تصویر اصلی انتخاب کنید.
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
               <h3 className="font-bold text-gray-700">تنظیمات انتشار</h3>
               <div className="space-y-1">
                  <label className="text-xs text-gray-500">اولویت نمایش (عدد بزرگتر = نمایش بالاتر)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
               </div>
               <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded-lg" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  <span className="text-sm font-bold text-gray-700">نمایش در سایت</span>
               </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // رابط کاربری: نمای لیست محصولات (همراه با فیلترها و جدول)
  // ========================================================
  return (
    <div className="max-w-7xl mx-auto" dir="rtl">
      
      {/* هدر بخش مدیریت */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">کاتالوگ محصولات</h2>
          <p className="text-gray-500 mt-1">مدیریت، فیلتر و ویرایش محصولات ثبت شده</p>
        </div>
        <button 
          onClick={openNewProductForm} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <Plus size={20} />
          محصول جدید
        </button>
      </div>

      {/* باکس فیلترها */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-500 md:pl-4 md:border-l">
          <Filter size={20} />
          <span className="font-bold text-sm">فیلترها:</span>
        </div>
        
        <div className="flex-1 w-full relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="جستجو در نام محصولات..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="w-full md:w-48">
          <select 
            value={filterCategory} 
            onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }}
            className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">همه دسته‌ها</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className="w-full md:w-48">
          <select 
            value={filterSubcategory} 
            onChange={(e) => setFilterSubcategory(e.target.value)}
            disabled={!filterCategory}
            className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
          >
            <option value="">همه زیرمجموعه‌ها</option>
            {filterSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      </div>

      {/* جدول نمایش محصولات */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-bold">در حال بارگذاری محصولات...</p>
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-sm">
                  <th className="p-4 font-semibold w-24">تصویر</th>
                  <th className="p-4 font-semibold">نام محصول</th>
                  <th className="p-4 font-semibold hidden md:table-cell">دسته‌بندی</th>
                  <th className="p-4 font-semibold text-center">وضعیت</th>
                  <th className="p-4 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{product.title}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{product.slug}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                        {getCategoryPath(product.subcategoryId)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="ویرایش محصول"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="حذف محصول"
                        >
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
            <ImageIcon size={60} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-600">محصولی یافت نشد!</h3>
            <p className="text-sm text-gray-400 mt-2">با این فیلترها یا در این سیستم هیچ محصولی وجود ندارد.</p>
            {allProducts.length === 0 && (
              <button onClick={openNewProductForm} className="mt-6 text-blue-600 font-bold hover:underline">
                تعریف اولین محصول
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}