'use client';
// مسیر فایل: src/app/admin/projects/[id]/page.tsx

import React, { useState, useEffect, use } from 'react';
import { UploadCloud, Trash2, ArrowRight, Save, Loader2, Star, Image as ImageIcon, XCircle } from 'lucide-react';

// 🟢 وارد کردن ادیتور اختصاصی 
import HitmanTextEditor from '@/components/hitmantexteditor';

export default function EditSingleProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = parseInt(resolvedParams.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [allProjects, setAllProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true
  });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setAllProjects(data);
          
          const currentProject = data.find((p: any) => p.id === projectId);
          if (currentProject) {
            setFormData({
              title: currentProject.title,
              slug: currentProject.slug,
              category: currentProject.category || '',
              location: currentProject.location || '',
              content: currentProject.content || '',
              size: currentProject.size || 'normal',
              isActive: currentProject.isActive
            });
            setPrimaryImage(currentProject.imageUrl);
            
            let parsedGallery = [];
            if (typeof currentProject.gallery === 'string') {
              try { parsedGallery = JSON.parse(currentProject.gallery); } catch(e){}
            } else if (Array.isArray(currentProject.gallery)) {
              parsedGallery = currentProject.gallery;
            }
            setGalleryUrls(parsedGallery);
          } else {
            alert('پروژه مورد نظر یافت نشد!');
            window.location.href = '/admin/projects';
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    if (!isNaN(projectId)) {
      fetchData();
    } else {
      window.location.href = '/admin/projects';
    }
  }, [projectId]);

  const sanitizeSlug = (input: string) => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    if (regex.test(cleaned)) setSlugError('❌ نامک فقط باید شامل حروف انگلیسی، اعداد و خط تیره (-) باشد.');
    else setSlugError('');
    return cleaned.replace(regex, '').toLowerCase();
  };

  const isSlugDuplicate = allProjects.some(p => p.slug === formData.slug && p.id !== projectId);

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData.slug || isSlugDuplicate || slugError) {
      alert('ابتدا یک نامک (Slug) معتبر و غیرتکراری وارد کنید.');
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
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl: primaryImage, gallery: galleryUrls })
      });
      
      if (res.ok) {
        alert('پروژه با موفقیت ویرایش شد ✅');
        window.location.href = '/admin/projects'; // بازگشت به لیست پروژه‌ها
      } else { 
        alert((await res.json()).error); 
      }
    } catch (e) { 
      alert('خطا در ارتباط با سرور'); 
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-emerald-600">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold text-lg">در حال دریافت اطلاعات پروژه...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 text-gray-800 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      
      <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.href = '/admin/projects'} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-200 transition">
            <ArrowRight size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">ویرایش پروژه: <span className="text-emerald-600">{formData.title}</span></h2>
            <p className="text-sm text-gray-400 mt-1">شناسه پروژه در دیتابیس: {projectId}</p>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || uploading} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold transition shadow-lg flex items-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره تغییرات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">نام پروژه *</label>
              <input type="text" className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">نامک (Slug) * <span className="text-xs text-gray-400 font-normal">لاتین، برای آدرس سایت</span></label>
              <input type="text" dir="ltr" className={`w-full border rounded-xl p-4 outline-none font-mono transition-colors ${(isSlugDuplicate || slugError) ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-emerald-500'}`} value={formData.slug} onChange={e => setFormData({...formData, slug: sanitizeSlug(e.target.value)})} />
              {slugError && <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><XCircle size={14}/> {slugError}</p>}
              {isSlugDuplicate && !slugError && <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><XCircle size={14}/> این نامک تکراری است!</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">دسته‌بندی</label>
                <input type="text" placeholder="مثال: صنعتی" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">مکان پروژه</label>
                <input type="text" placeholder="مثال: تهران" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
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
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="text-lg font-bold text-gray-700 mb-4">جزئیات و محتوای کامل پروژه</h3>
             <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold mb-4">
                💡 تصاویر افزوده شده به ادیتور پس از ذخیره، به‌صورت خودکار در MinIO مدیریت می‌شوند.
             </div>
             
             <HitmanTextEditor 
               value={formData.content} 
               onChange={(val) => setFormData({...formData, content: val})} 
               slug={formData.slug} 
             />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-700 border-b pb-3 mb-6">گالری تصاویر *</h3>
            
            {(!formData.slug || isSlugDuplicate || slugError) ? (
              <div className="p-6 bg-red-50 text-red-600 text-center rounded-2xl text-sm font-bold border border-red-100">
                برای آپلود عکس، ابتدا یک نامک معتبر وارد کنید.
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition mb-6">
                {uploading ? <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} /> : <UploadCloud className="text-gray-400 mb-2" size={40} />}
                <span className="text-sm font-bold text-gray-600">{uploading ? 'در حال آپلود...' : 'انتخاب تصاویر جدید'}</span>
                <input type="file" multiple accept="image/*" onChange={handleMultiUpload} className="hidden" />
              </label>
            )}

            {galleryUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="font-bold text-gray-700 mb-4">وضعیت انتشار</h3>
             <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                <span className="text-sm font-black text-gray-700">پروژه در سایت فعال باشد</span>
             </label>
          </div>
        </div>
      </div>
    </div>
  );
}