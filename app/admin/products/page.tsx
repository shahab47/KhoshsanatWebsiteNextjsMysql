'use client';

import React, { useState, useEffect } from 'react';
import { Plus, UploadCloud, Star, Trash2, ArrowRight, Save, Image as ImageIcon, Info, Loader2, Edit, Search, Filter, FolderTree, CornerDownLeft, Package, LayoutList, CheckCircle2, XCircle } from 'lucide-react';

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

  // ==========================================
  // بخش استیت‌های دسته‌بندی‌ها
  // ==========================================
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // view برای دسته‌بندی: list | cat-form | sub-form
  const [catView, setCatView] = useState<'list' | 'cat-form' | 'sub-form'>('list');
  
  // استیت فرم دسته اصلی
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState({
    title: '', slug: '', icon: '', order: 0, isActive: true
  });

  // استیت فرم زیرمجموعه
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subFormData, setSubFormData] = useState({
    title: '', description: '', categoryId: '', order: 0, isActive: true
  });

  // لودینگ‌های عمومی
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // توابع دریافت اطلاعات (Fetch)
  // ==========================================
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
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
    fetchCategories();
    fetchProducts();
  }, []);

  // ==========================================
  // توابع مدیریت دسته‌بندی‌ها (Categories)
  // ==========================================
  const openNewCategoryForm = () => {
    setEditingCatId(null);
    setCatFormData({ title: '', slug: '', icon: '', order: 0, isActive: true });
    setCatView('cat-form');
  };

  const editCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setCatFormData({ title: cat.title, slug: cat.slug, icon: cat.icon || '', order: cat.order, isActive: cat.isActive });
    setCatView('cat-form');
  };

  const handleSaveCategory = async () => {
    if (!catFormData.title || !catFormData.slug) return alert('عنوان و نامک دسته‌بندی الزامی است.');
    setSaving(true);
    const method = editingCatId ? 'PUT' : 'POST';
    const payload = editingCatId ? { id: editingCatId, ...catFormData } : catFormData;

    try {
      const res = await fetch('/api/categories', {
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

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('اخطار مهم: با حذف این دسته‌بندی، تمامی زیرمجموعه‌ها و محصولات داخل آن نیز برای همیشه از دیتابیس پاک خواهند شد! آیا مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        fetchProducts(); // محصولات هم آپدیت شوند چون ممکن است پاک شده باشند
      }
    } catch (err) { alert('خطا در حذف دسته‌بندی'); }
  };

  // ==========================================
  // توابع مدیریت زیرمجموعه‌ها (Subcategories)
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
      const res = await fetch('/api/subcategories', {
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
      const res = await fetch(`/api/subcategories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        fetchProducts();
      }
    } catch (err) { alert('خطا در حذف زیرمجموعه'); }
  };

  // ==========================================
  // توابع محصولات (از قبل نوشته شده)
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
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟ عکس‌های آن از سرور پاک خواهند شد.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) setAllProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData(); fd.append('file', files[i]); fd.append('type', 'products'); 
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) continue;
        const data = await res.json();
        const rawUrl = data.url || data.fileUrl || data.filepath;
        if (rawUrl) newUrls.push(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
      } catch (err) { console.error(err); }
    }
    setGalleryUrls(prev => [...prev, ...newUrls]);
    e.target.value = '';
    setUploading(false);
  };

  const removeImage = async (urlToRemove: string) => {
    setGalleryUrls(prev => prev.filter(url => url !== urlToRemove));
    if (primaryImage === urlToRemove) setPrimaryImage(null);
    try { await fetch(`/api/upload?url=${encodeURIComponent(urlToRemove)}`, { method: 'DELETE' }); } catch (err) {}
  };

  const handleSaveProduct = async () => {
    if (!formData.title || !formData.slug || !formData.subcategoryId || !primaryImage) {
      return alert('تکمیل تمامی موارد ستاره‌دار و انتخاب تصویر اصلی الزامی است.');
    }
    setSaving(true);
    const payload = { ...formData, imageUrl: primaryImage, gallery: galleryUrls };
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert('عملیات موفق بود');
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
  };


  // ========================================================
  // رندرها (UI)
  // ========================================================

  return (
    <div className="max-w-7xl mx-auto pb-20" dir="rtl">
      
      {/* هدر و تب‌های مدیریت */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">مدیریت جامع کاتالوگ</h2>
        <p className="text-gray-500 mb-6">ساختار دسته‌بندی‌ها و محصولات سایت را در این بخش مدیریت کنید.</p>
        
        {/* نوار تب‌ها */}
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
      {/* تب دسته‌بندی‌ها */}
      {/* ========================================================= */}
      {activeTab === 'categories' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {catView === 'list' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-700">ساختار دسته‌ها</h3>
                <div className="flex gap-2">
                  <button onClick={() => openNewCategoryForm()} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2">
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
                      {/* ردیف دسته اصلی */}
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-600 border border-gray-100 font-bold text-lg">
                            {cat.title.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-800 text-lg flex items-center gap-2">
                              {cat.title}
                              {!cat.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">غیرفعال</span>}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono mt-1">/{cat.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openNewSubcategoryForm(cat.id)} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:text-blue-600 hover:border-blue-200 transition">
                            + افزودن زیرمجموعه
                          </button>
                          <button onClick={() => editCategory(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 transition"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>

                      {/* ردیف زیرمجموعه‌ها */}
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

          {/* فرم ثبت/ویرایش دسته اصلی */}
          {catView === 'cat-form' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">{editingCatId ? 'ویرایش سرشاخه' : 'ایجاد سرشاخه جدید'}</h3>
                <button onClick={() => setCatView('list')} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">عنوان سرشاخه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={catFormData.title} onChange={e => setCatFormData({...catFormData, title: e.target.value})} placeholder="مثال: قطعات فولادی" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">نامک (Slug - انگلیسی) *</label>
                  <input type="text" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900" value={catFormData.slug} onChange={e => setCatFormData({...catFormData, slug: e.target.value})} placeholder="steel-parts" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600 mb-1">اولویت نمایش</label>
                    <input type="number" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={catFormData.order} onChange={e => setCatFormData({...catFormData, order: parseInt(e.target.value)})} />
                  </div>
                  <div className="flex-1 flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded" checked={catFormData.isActive} onChange={e => setCatFormData({...catFormData, isActive: e.target.checked})} />
                      <span className="font-bold text-sm text-gray-700">دسته فعال باشد</span>
                    </label>
                  </div>
                </div>
                <button onClick={handleSaveCategory} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition mt-6 flex justify-center items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره سرشاخه
                </button>
              </div>
            </div>
          )}

          {/* فرم ثبت/ویرایش زیرمجموعه */}
          {catView === 'sub-form' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">{editingSubId ? 'ویرایش زیرمجموعه' : 'ایجاد زیرمجموعه جدید'}</h3>
                <button onClick={() => setCatView('list')} className="text-gray-500 hover:text-gray-800"><XCircle size={24} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">سرشاخه اصلی *</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900" value={subFormData.categoryId} onChange={e => setSubFormData({...subFormData, categoryId: e.target.value})}>
                    <option value="">انتخاب سرشاخه...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">عنوان زیرمجموعه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={subFormData.title} onChange={e => setSubFormData({...subFormData, title: e.target.value})} placeholder="مثال: نبشی‌ها" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">توضیحات (اختیاری)</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" value={subFormData.description} onChange={e => setSubFormData({...subFormData, description: e.target.value})} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-600 mb-1">اولویت نمایش</label>
                    <input type="number" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={subFormData.order} onChange={e => setSubFormData({...subFormData, order: parseInt(e.target.value)})} />
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
              {/* باکس فیلترها (ویو محصولات) */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <button onClick={() => { setCurrentView('add'); resetProductForm(); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 md:ml-4">
                  <Plus size={20} /> محصول جدید
                </button>
                
                <div className="flex-1 w-full relative">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="جستجو در نام محصولات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900" />
                </div>

                <div className="w-full md:w-48">
                  <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900">
                    <option value="">همه سرشاخه‌ها</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} disabled={!filterCategory} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 text-gray-900">
                    <option value="">همه زیرمجموعه‌ها</option>
                    {filterSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              </div>

              {/* جدول محصولات */}
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
                              <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white"><img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /></div>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-800">{product.title}</p>
                              <p className="text-xs text-gray-400 font-mono mt-1">{product.slug}</p>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">{getCategoryPath(product.subcategoryId)}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.isActive ? 'فعال' : 'غیرفعال'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleEditProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
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
            // فرم افزودن/ویرایش محصول
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button onClick={() => { setCurrentView('list'); resetProductForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition"><ArrowRight size={24} /></button>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">{editingId ? 'ویرایش محصول' : 'ایجاد محصول جدید'}</h2>
                </div>
                <button onClick={handleSaveProduct} disabled={saving || uploading} className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition shadow-md ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {saving ? 'در حال ثبت...' : 'ذخیره محصول'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ستون اطلاعات متنی */}
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-gray-700 border-b pb-3">مشخصات اصلی</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">سرشاخه *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">انتخاب کنید...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-2">زیرمجموعه (الزامی) *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900" value={formData.subcategoryId} onChange={e => setFormData({...formData, subcategoryId: e.target.value})} disabled={!selectedCategory}>
                        <option value="">ابتدا سرشاخه را انتخاب کنید</option>
                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نام کامل محصول *</label>
                    <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">نامک (Slug) *</label>
                    <input type="text" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">توضیح کوتاه</label>
                    <textarea rows={2} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" value={formData.shortDesc} onChange={e => setFormData({...formData, shortDesc: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-600">توضیحات کامل محصول *</label>
                    <textarea rows={8} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                </div>

                {/* ستون تصاویر و تنظیمات انتشار */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">گالری تصاویر</h3>
                    
                    <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition cursor-pointer group mb-6">
                      <input type="file" multiple accept="image/*" onChange={handleMultiUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center">
                        <UploadCloud className="text-gray-400 group-hover:text-blue-500" size={40} />
                        <p className="text-sm text-gray-600 font-bold mt-2">آپلود تصاویر</p>
                      </div>
                      {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
                    </div>

                    {galleryUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {galleryUrls.map((url, i) => {
                          const isPrimary = primaryImage === url;
                          return (
                            <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isPrimary ? 'border-amber-400' : 'border-gray-100'}`}>
                              <img src={url} className="w-full h-full object-cover" alt="img" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => setPrimaryImage(url)} className={`p-1.5 rounded-full ${isPrimary ? 'bg-amber-400 text-white' : 'bg-white text-gray-600'}`}><Star size={14} fill={isPrimary?"white":"none"} /></button>
                                <button onClick={() => removeImage(url)} className="p-1.5 rounded-full bg-white text-red-500"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-xl"><ImageIcon className="mx-auto text-gray-300 mb-2" size={24} /><p className="text-xs text-gray-400">بدون تصویر</p></div>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                     <h3 className="font-bold text-gray-700 mb-4">تنظیمات انتشار</h3>
                     <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">اولویت نمایش (عدد بزرگتر = بالاتر)</label>
                        <input type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
                     </div>
                     <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition border border-gray-100 mt-4">
                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                        <span className="text-sm font-black text-gray-700">این محصول در سایت فعال باشد</span>
                     </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}