'use client';
// مسیر فایل: src/app/admin/projects/page.tsx

import React, { useState, useEffect } from 'react';
import { Plus, UploadCloud, Trash2, ArrowRight, Save, Loader2, Edit, Search, LayoutList, Star, FolderOpen, Tags, ChevronDown } from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor';

export default function AdminProjectsPage() {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [projects, setProjects] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]); // دسته‌بندی‌های موجود از دیتابیس
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugError, setSlugError] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true
  });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // دریافت لیست پروژه‌ها
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // دریافت دسته‌بندی‌های موجود (مشابه بخش آکادمی)
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/projects/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbCategories(data.map((cat: any) => cat.title));
      }
    } catch (e) { 
      console.error("خطا در دریافت دسته‌بندی‌ها:", e);
    }
  };

  useEffect(() => { 
    fetchProjects(); 
    fetchCategories();
  }, []);

  const sanitizeSlug = (input: string) => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    if (regex.test(cleaned)) setSlugError('❌ نامک فقط باید شامل حروف انگلیسی، اعداد و خط تیره (-) باشد.');
    else setSlugError('');
    return cleaned.replace(regex, '').toLowerCase();
  };

  const isSlugDuplicate = projects.some(p => p.slug === formData.slug && p.id !== editingId);

  // فیلتر دسته‌ها بر اساس متن وارد شده
  const filteredCategories = dbCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase()));
  const isExactMatch = dbCategories.some(c => c.toLowerCase() === formData.category.trim().toLowerCase());

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData.slug || isSlugDuplicate || slugError) {
      alert('ابتدا یک نامک (Slug) معتبر و غیرتکراری وارد کنید تا اختلالی در فایل‌ها پیش نیاید.');
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    const usedIndices = galleryUrls.map(url => {
       try {
           const parts = url.split('/');
           const nameWithoutExt = parts[parts.length - 1].split('.')[0]; 
           const prefix = `${formData.slug}-`;
           if (nameWithoutExt.startsWith(prefix)) {
               const idx = parseInt(nameWithoutExt.substring(prefix.length));
               if (!isNaN(idx)) return idx;
           }
       } catch (err) {}
       return -1;
    }).filter(i => i !== -1);

    let nextIndex = 1;
    const newUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      while (usedIndices.includes(nextIndex)) nextIndex++;
      usedIndices.push(nextIndex); 

      const fd = new FormData(); 
      fd.append('file', files[i]); 
      fd.append('type', 'projects'); 
      fd.append('customName', `${formData.slug}-${nextIndex}`); 
      
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) continue;
        const data = await res.json();
        const url = data.url?.startsWith('http') ? data.url : `/${data.url}`;
        newUrls.push(url);
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

  const handleSave = async () => {
    if (isSlugDuplicate || slugError) return alert('مشکل در نامک (Slug). لطفاً برطرف کنید.');
    if (!formData.title || !formData.slug || !primaryImage) {
      return alert('فیلدهای ستاره‌دار و انتخاب تصویر اصلی الزامی هستند.');
    }

    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/projects/${editingId}` : '/api/projects';
    
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl: primaryImage, gallery: galleryUrls })
      });
      if (res.ok) {
        alert('پروژه با موفقیت ذخیره شد ✅');
        fetchProjects();
        fetchCategories(); // بروزرسانی لیست دسته‌ها
        resetForm();
        setView('list');
      } else { alert((await res.json()).error); }
    } catch (e) { alert('خطا در ارتباط با سرور'); }
    setSaving(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true });
    setPrimaryImage(null);
    setGalleryUrls([]);
    setSlugError('');
  };

  const openEdit = (project: any) => {
    setEditingId(project.id);
    setFormData({
      title: project.title, slug: project.slug, category: project.category || '', 
      location: project.location || '', content: project.content || '', 
      size: project.size || 'normal', isActive: project.isActive
    });
    setPrimaryImage(project.imageUrl);
    
    let parsedGallery = typeof project.gallery === 'string' ? JSON.parse(project.gallery) : project.gallery;
    setGalleryUrls(Array.isArray(parsedGallery) ? parsedGallery : []);
    
    setView('add');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این پروژه مطمئن هستید؟ عکس‌های آن نیز از سرور و فضای ابری به طور کامل پاک می‌شود.')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
  };

  const displayedProjects = projects.filter(p => p.title.includes(searchQuery));

  return (
    <div className="max-w-7xl mx-auto pb-20 text-gray-800" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">مدیریت پروژه‌ها</h2>
        <p className="text-gray-500">پروژه‌های انجام شده را به همراه گالری تصاویر و توضیحات کامل ثبت کنید.</p>
      </div>

      {view === 'list' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <button onClick={() => { resetForm(); setView('add'); }} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition shadow-md flex items-center justify-center gap-2">
              <Plus size={20} /> پروژه جدید
            </button>
            <div className="flex-1 w-full relative">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="جستجو در پروژه‌ها..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-emerald-600"><Loader2 className="animate-spin mx-auto mb-2" size={32}/> در حال بارگذاری...</div>
            ) : displayedProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                      <th className="p-4 font-bold w-24">تصویر</th>
                      <th className="p-4 font-bold">نام پروژه</th>
                      <th className="p-4 font-bold text-center">دسته / مکان</th>
                      <th className="p-4 font-bold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedProjects.map(project => (
                      <tr key={project.id} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          {project.imageUrl ? (
                            <img src={project.imageUrl} alt="" className="w-16 h-12 object-cover rounded-lg shadow-sm" />
                          ) : (
                            <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center">📷</div>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-800 line-clamp-1">{project.title}</p>
                          <p className="text-xs text-gray-400 font-mono mt-1">{project.slug}</p>
                        </td>
                        <td className="p-4 text-center text-sm text-gray-600">{project.category} <br/><span className="text-xs text-gray-400">{project.location}</span></td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEdit(project)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(project.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500"><LayoutList size={48} className="mx-auto mb-4 opacity-50"/>پروژه‌ای یافت نشد.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-6 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView('list'); resetForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-200"><ArrowRight size={24} /></button>
              <h2 className="text-2xl font-bold">{editingId ? 'ویرایش پروژه' : 'ثبت پروژه جدید'}</h2>
            </div>
            <button onClick={handleSave} disabled={saving || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold transition shadow-lg flex items-center gap-2">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره پروژه
            </button>
          </div>

          {/* ========== چیدمان جدید ========== */}
          <div className="space-y-6">
            {/* ردیف اول: دو ستونه — اطلاعات پایه + گالری */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ستون چپ: اطلاعات پایه و وضعیت انتشار */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">نام پروژه *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">نامک (Slug) * <span className="text-xs text-gray-400 font-normal">لاتین، برای آدرس سایت</span></label>
                  <input type="text" dir="ltr" className={`w-full border rounded-xl p-4 outline-none font-mono transition-colors ${(isSlugDuplicate || slugError) ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`} value={formData.slug} onChange={e => setFormData({...formData, slug: sanitizeSlug(e.target.value)})} />
                  {slugError && <p className="text-xs text-red-600 font-bold mt-2">{slugError}</p>}
                  {isSlugDuplicate && !slugError && <p className="text-xs text-red-600 font-bold mt-2">این نامک تکراری است!</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* دسته‌بندی هوشمند */}
                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-600 mb-2">دسته‌بندی موضوعی</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="جستجو یا ایجاد دسته جدید..." 
                        className="w-full border border-gray-200 rounded-xl py-3 pr-4 pl-10 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all text-gray-800" 
                        value={formData.category} 
                        onChange={e => {
                          setFormData({...formData, category: e.target.value});
                          setIsCatDropdownOpen(true);
                        }} 
                        onFocus={() => setIsCatDropdownOpen(true)}
                        onBlur={() => setIsCatDropdownOpen(false)} 
                      />
                      <ChevronDown size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isCatDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                        {/* گزینه ایجاد دسته جدید */}
                        {formData.category.trim() !== '' && !isExactMatch && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({...formData, category: formData.category.trim()});
                              setIsCatDropdownOpen(false);
                            }}
                            className="w-full text-right px-4 py-3 text-sm text-emerald-600 font-bold hover:bg-emerald-50 border-b border-gray-100 flex items-center gap-2 transition-colors"
                          >
                            <Plus size={16} /> ایجاد دسته جدید: "{formData.category.trim()}"
                          </button>
                        )}

                        {/* لیست دسته‌های موجود */}
                        {filteredCategories.map((cat, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({...formData, category: cat});
                              setIsCatDropdownOpen(false);
                            }}
                            className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <FolderOpen size={16} className="text-gray-400" /> {cat}
                          </button>
                        ))}

                        {filteredCategories.length === 0 && formData.category.trim() === '' && (
                          <div className="px-4 py-4 text-sm text-gray-400 text-center flex flex-col items-center gap-2">
                            <Tags size={24} className="text-gray-300" />
                            شروع به تایپ کنید تا دسته جدید ساخته شود.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">مکان پروژه</label>
                    <input type="text" placeholder="مثال: تهران" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">اندازه کارت نمایش</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                    <option value="normal">مربع کوچک (عادی)</option>
                    <option value="wide">مستطیل افقی (عریض)</option>
                    <option value="tall">مستطیل عمودی (بلند)</option>
                    <option value="large">مربع بزرگ (شاخص)</option>
                  </select>
                </div>

                {/* وضعیت انتشار ادغام شده */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                    <span className="text-sm font-black text-gray-700">پروژه فعال باشد (نمایش در سایت)</span>
                  </label>
                </div>
              </div>

              {/* ستون راست: گالری تصاویر (بدون تغییر) */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">گالری تصاویر *</h3>
                
                {(!formData.slug || isSlugDuplicate || slugError) ? (
                  <div className="p-6 bg-red-50 text-red-600 text-center rounded-2xl text-sm font-bold border border-red-100">
                    برای آپلود عکس، ابتدا یک نامک معتبر وارد کنید.
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition mb-6">
                    {uploading ? <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} /> : <UploadCloud className="text-gray-400 mb-2" size={40} />}
                    <span className="text-sm font-bold text-gray-600">{uploading ? 'در حال آپلود...' : 'انتخاب تصاویر'}</span>
                    <input type="file" multiple accept="image/*" onChange={handleMultiUpload} className="hidden" />
                  </label>
                )}

                {galleryUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryUrls.map((url, i) => {
                      const isPrimary = primaryImage === url;
                      return (
                        <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${isPrimary ? 'border-emerald-500 shadow-md' : 'border-gray-100'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="Gallery" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-2">
                            <button onClick={() => setPrimaryImage(url)} title="انتخاب به عنوان کاور" className={`p-1.5 rounded-full ${isPrimary ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600'}`}><Star size={14} fill={isPrimary?"white":"none"} /></button>
                            <button onClick={() => removeImage(url)} className="p-1.5 rounded-full bg-white text-red-500"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {galleryUrls.length === 0 && !(!formData.slug || isSlugDuplicate || slugError) && (
                  <p className="text-center text-gray-400 text-sm mt-4">هنوز تصویری آپلود نشده است.</p>
                )}
              </div>
            </div>

            {/* ردیف دوم: ویرایشگر متن تمام عرض */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-700 mb-4">جزئیات و محتوای کامل پروژه</h3>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold mb-4">
                💡 نکته: با استفاده از آیکون عکس در نوار ابزار زیر، تصاویر را به صورت مستقیم در فضای ابری (MinIO) ذخیره و در وسط متن قرار دهید. اگر عکسی را از متن پاک کنید و دکمه ذخیره را بزنید، عکس از فضای ابری هم حذف می‌شود.
              </div>
              <HitmanTextEditor 
                value={formData.content} 
                onChange={(val) => setFormData({...formData, content: val})} 
                slug={formData.slug} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}