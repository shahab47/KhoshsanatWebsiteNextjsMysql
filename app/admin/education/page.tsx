'use client';
// مسیر فایل: src/app/admin/education/page.tsx

import React, { useState, useEffect } from 'react';
import { Plus, UploadCloud, Trash2, ArrowRight, Save, Loader2, Edit, Search, FolderOpen, Tags, ChevronDown, FileText, Code } from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor'; // استفاده از ادیتور واقعی

export default function AdminEducationPage() {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [contentTab, setContentTab] = useState<'excerpt' | 'content'>('excerpt');

  const [articles, setArticles] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugError, setSlugError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true
  });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);

  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } catch (e) { 
      console.error("خطا در دریافت مقالات:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/education/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbCategories(data.map((cat: any) => cat.title));
      }
    } catch (e) { 
      console.error("خطا در دریافت دسته‌بندی‌ها:", e);
    }
  };

  useEffect(() => { 
    fetchArticles(); 
    fetchCategories(); 
  }, []);

  const sanitizeSlug = (input: string) => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    if (regex.test(cleaned)) setSlugError('❌ نامک فقط باید شامل حروف انگلیسی، اعداد و خط تیره باشد.');
    else setSlugError('');
    return cleaned.replace(regex, '').toLowerCase();
  };

  const isSlugDuplicate = articles.some(a => a.slug === formData.slug && a.id !== editingId);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData.slug || isSlugDuplicate || slugError) return alert('لطفاً ابتدا یک نامک معتبر وارد کنید.');
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'education');
    fd.append('customName', `${formData.slug}-cover`);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setPrimaryImage(data.url?.startsWith('http') ? data.url : `/${data.url}`);
      }
    } catch (e) { console.error(e) }
    setUploading(false);
  };

  const removeImage = async () => {
    if (!primaryImage) return;
    try { await fetch(`/api/upload?url=${encodeURIComponent(primaryImage)}`, { method: 'DELETE' }); } catch(e){}
    setPrimaryImage(null);
  };

  const handleSave = async () => {
    if (isSlugDuplicate || slugError) return alert('خطا در نامک (Slug).');
    if (!formData.title || !formData.slug || !formData.content || !primaryImage) return alert('فیلدهای ستاره‌دار الزامی است.');

    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/education/${editingId}` : '/api/education';
    
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl: primaryImage })
      });
      if (res.ok) {
        alert('مقاله ذخیره شد ✅');
        fetchArticles(); 
        fetchCategories();
        resetForm(); 
        setView('list');
      } else alert((await res.json()).error);
    } catch (e) { console.error(e) }
    setSaving(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true });
    setPrimaryImage(null); setSlugError(''); setContentTab('excerpt');
  };

  const openEdit = (article: any) => {
    setEditingId(article.id);
    setFormData({
      title: article.title, slug: article.slug, excerpt: article.excerpt || '', content: article.content,
      category: article.category || '', author: article.author || '', readTime: article.readTime || '', isActive: article.isActive
    });
    setPrimaryImage(article.imageUrl);
    setView('add');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('با حذف مقاله، تمامی تصاویر داخل متن و کاور آن از فضای ابری نیز پاک خواهند شد. مطمئن هستید؟')) return;
    const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
    if (res.ok) setArticles(prev => prev.filter(a => a.id !== id));
  };

  const filteredCategories = dbCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase()));
  const isExactMatch = dbCategories.some(c => c.toLowerCase() === formData.category.trim().toLowerCase());

  return (
    <div className="max-w-7xl mx-auto pb-20 text-gray-800" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">مدیریت آکادمی و مقالات</h2>
        <p className="text-gray-500">محتوای آموزشی و دانشنامه تخصصی سایت را مدیریت کنید.</p>
      </div>

      {view === 'list' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <button onClick={() => { resetForm(); setView('add'); }} className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-bold transition shadow-md flex items-center justify-center gap-2">
              <Plus size={20} /> افزودن مقاله جدید
            </button>
            <div className="flex-1 w-full relative">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="جستجو در مقالات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                      <th className="p-4 font-bold w-24">تصویر</th>
                      <th className="p-4 font-bold">عنوان مقاله</th>
                      <th className="p-4 font-bold text-center">دسته / نویسنده</th>
                      <th className="p-4 font-bold text-center">وضعیت</th>
                      <th className="p-4 font-bold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-500">
                          <Loader2 className="animate-spin mx-auto mb-3 text-rose-500" size={32} />
                          <p className="font-bold">در حال دریافت اطلاعات...</p>
                        </td>
                      </tr>
                    ) : articles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">
                          هیچ مقاله‌ای در دیتابیس یافت نشد. برای شروع "افزودن مقاله جدید" را بزنید.
                        </td>
                      </tr>
                    ) : (
                      articles
                        .filter(a => (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(article => (
                          <tr key={article.id} className="hover:bg-gray-50 transition">
                            <td className="p-4"><img src={article.imageUrl} alt="" className="w-16 h-12 object-cover rounded-lg shadow-sm" /></td>
                            <td className="p-4">
                              <p className="font-bold text-gray-800 line-clamp-1">{article.title}</p>
                              <p className="text-xs text-gray-400 font-mono mt-1">{article.slug}</p>
                            </td>
                            <td className="p-4 text-center text-sm text-gray-600">{article.category || '-'} <br/><span className="text-xs text-gray-400">{article.author}</span></td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-black ${article.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{article.isActive ? 'فعال' : 'پیش‌نویس'}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openEdit(article)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(article.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-6 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView('list'); resetForm(); }} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-200"><ArrowRight size={24} /></button>
              <h2 className="text-2xl font-bold">{editingId ? 'ویرایش مقاله' : 'ثبت مقاله جدید'}</h2>
            </div>
            <button onClick={handleSave} disabled={saving || uploading} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl font-bold transition shadow-lg flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره نهایی
            </button>
          </div>

          {/* چیدمان مشابه پروژه‌ها */}
          <div className="space-y-6">
            {/* ردیف اول: دو ستونه — اطلاعات پایه + تصویر کاور */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ستون چپ: اطلاعات پایه و وضعیت انتشار */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">عنوان کامل مقاله *</label>
                  <input type="text" className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">نامک (Slug) *</label>
                  <input type="text" dir="ltr" className={`w-full border rounded-xl p-4 outline-none font-mono transition-colors ${(isSlugDuplicate || slugError) ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-rose-500'}`} value={formData.slug} onChange={e => setFormData({...formData, slug: sanitizeSlug(e.target.value)})} />
                  {slugError && <p className="text-xs text-red-600 font-bold mt-2">{slugError}</p>}
                  {isSlugDuplicate && !slugError && <p className="text-xs text-red-600 font-bold mt-2">این نامک تکراری است!</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-600 mb-2">دسته‌بندی موضوعی</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="جستجو یا ایجاد جدید..." 
                        className="w-full border border-gray-200 rounded-xl py-3 pr-4 pl-10 outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 transition-all text-gray-800" 
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
                        {formData.category.trim() !== '' && !isExactMatch && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({...formData, category: formData.category.trim()});
                              setIsCatDropdownOpen(false);
                            }}
                            className="w-full text-right px-4 py-3 text-sm text-rose-600 font-bold hover:bg-rose-50 border-b border-gray-100 flex items-center gap-2 transition-colors"
                          >
                            <Plus size={16} /> ایجاد دسته جدید: "{formData.category.trim()}"
                          </button>
                        )}
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
                    <label className="block text-sm font-bold text-gray-600 mb-2">نام نویسنده</label>
                    <input type="text" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">زمان مطالعه (دقیقه)</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="مثال: 10" 
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50" 
                    value={formData.readTime} 
                    onChange={e => setFormData({...formData, readTime: e.target.value})} 
                  />
                </div>

                {/* وضعیت انتشار ادغام شده */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <input type="checkbox" className="w-5 h-5 text-rose-600 rounded" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                    <span className="text-sm font-black text-gray-700">این مقاله در سایت منتشر شود</span>
                  </label>
                </div>
              </div>

              {/* ستون راست: تصویر کاور */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">تصویر شاخص مقاله *</h3>
                {(!formData.slug || isSlugDuplicate || slugError) ? (
                  <div className="p-6 bg-red-50 text-red-600 text-center rounded-2xl text-sm font-bold border border-red-100">
                    برای آپلود عکس، ابتدا یک نامک معتبر وارد کنید.
                  </div>
                ) : primaryImage ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-rose-500 group">
                    <img src={primaryImage} className="w-full h-full object-cover" alt="Cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button onClick={removeImage} className="bg-white text-red-600 p-3 rounded-full hover:bg-red-50 transition-transform active:scale-90"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition">
                    {uploading ? <Loader2 className="animate-spin text-rose-500 mb-2" size={32} /> : <UploadCloud className="text-gray-400 mb-2" size={40} />}
                    <span className="text-sm font-bold text-gray-600">{uploading ? 'در حال آپلود...' : 'انتخاب تصویر کاور'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* ردیف دوم: ویرایشگر تمام عرض */}
            <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex border-b border-gray-100 px-4 pt-4 gap-6">
                <button onClick={() => setContentTab('excerpt')} className={`pb-4 px-2 font-bold flex items-center gap-2 transition-all border-b-2 ${contentTab === 'excerpt' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                  <FileText size={18} /> چکیده و مقدمه
                </button>
                <button onClick={() => setContentTab('content')} className={`pb-4 px-2 font-bold flex items-center gap-2 transition-all border-b-2 ${contentTab === 'content' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                  <Code size={18} /> بدنه و محتوای اصلی مقاله
                </button>
              </div>

              <div className="p-6">
                {contentTab === 'excerpt' && (
                  <textarea rows={6} className="w-full border border-gray-200 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 resize-y leading-relaxed text-gray-700" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} placeholder="توضیح مختصری در مورد مقاله..." />
                )}
                {contentTab === 'content' && (
                  <HitmanTextEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} slug={formData.slug} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}