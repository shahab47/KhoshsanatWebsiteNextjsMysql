'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ArrowRight, Save, Loader2, Edit, Search, FolderOpen, FileText, Image as ImageIcon, ChevronDown, X, Pencil } from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor';
import GalleryManager, { GalleryItem } from '@/components/GalleryManager';
import { useModal } from '@/app/contexts/ModalContext';

const isImageFile = (url?: string) => /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(url || '');

// ==================== فیلد دسته‌بندی هوشمند ====================
interface CategoryFieldProps {
  value: string;
  onChange: (val: string) => void;
  categories: string[];
  onAddCategory: (newCat: string) => void;
  onDeleteCategory: (cat: string) => void;
  onEditCategory: (oldCat: string, newCat: string) => void;
}

function CategoryField({
  value, onChange, categories, onAddCategory, onDeleteCategory, onEditCategory
}: CategoryFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { showConfirm, showAlert } = useModal();

  const filtered = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const isNew = search && !categories.includes(search);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingCat(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingCat && editInputRef.current) editInputRef.current.focus();
  }, [editingCat]);

  const handleSelect = (cat: string) => {
    onChange(cat);
    setSearch(cat);
    setIsOpen(false);
  };

  const handleCreate = () => {
    if (search.trim()) {
      onChange(search.trim());
      onAddCategory(search.trim());
      setIsOpen(false);
    }
  };

  const startEdit = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    setEditValue(cat);
  };

  const saveEdit = () => {
    if (editingCat && editValue.trim() && editValue !== editingCat) {
      onEditCategory(editingCat, editValue.trim());
      if (value === editingCat) {
        onChange(editValue.trim());
        setSearch(editValue.trim());
      }
    }
    setEditingCat(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditingCat(null);
  };

  const handleDelete = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'حذف دسته',
      message: `آیا از حذف دسته "${cat}" اطمینان دارید؟`,
      confirmText: 'حذف',
      cancelText: 'انصراف',
      type: 'error',
      onConfirm: () => onDeleteCategory(cat)
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition pr-8"
          placeholder="جستجو یا ایجاد دسته جدید..."
        />
        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map(cat => (
            <div key={cat} className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm flex items-center justify-between group">
              {editingCat === cat ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleEditKeyDown}
                  className="flex-1 border border-gray-300 rounded p-1 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-2 flex-1" onClick={() => handleSelect(cat)}>
                  <FolderOpen size={14} className="text-gray-400" />
                  {cat}
                </div>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => startEdit(cat, e)}
                  className="p-1 rounded-full hover:bg-emerald-100 text-gray-400 hover:text-emerald-600"
                  title="ویرایش دسته"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => handleDelete(cat, e)}
                  className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600"
                  title="حذف دسته"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
          {isNew && (
            <div onClick={handleCreate} className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-emerald-600 border-t border-gray-100 flex items-center gap-2">
              <Plus size={14} /> ایجاد "{search}"
            </div>
          )}
          {filtered.length === 0 && !isNew && (
            <div className="px-3 py-2 text-gray-400 text-sm">دسته‌ای یافت نشد</div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== صفحه اصلی مدیریت پروژه‌ها ====================
interface Project {
  id: number;
  title: string;
  slug: string;
  category?: string;
  location?: string;
  content: string;
  size: string;
  imageUrl: string;
  gallery?: any[];
  isActive: boolean;
}

export default function AdminProjectsPage() {
  const { showConfirm, showAlert } = useModal();
  const [view, setView] = useState<'list' | 'add'>('list');
  const [projects, setProjects] = useState<Project[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugError, setSlugError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true
  });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [projectMedia, setProjectMedia] = useState<GalleryItem[]>([]);
  
  const [originalFormData, setOriginalFormData] = useState({
    title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true
  });
  const [originalPrimaryImage, setOriginalPrimaryImage] = useState<string | null>(null);
  const [originalGallery, setOriginalGallery] = useState<GalleryItem[]>([]);
  
  const [pendingUnsavedMedia, setPendingUnsavedMedia] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const checkUnsavedChanges = useCallback(() => {
    const formChanged =
      formData.title !== originalFormData.title ||
      formData.slug !== originalFormData.slug ||
      formData.category !== originalFormData.category ||
      formData.location !== originalFormData.location ||
      formData.content !== originalFormData.content ||
      formData.size !== originalFormData.size ||
      formData.isActive !== originalFormData.isActive;
    
    const primaryChanged = primaryImage !== originalPrimaryImage;
    const galleryChanged = JSON.stringify(projectMedia) !== JSON.stringify(originalGallery);
    
    return formChanged || primaryChanged || galleryChanged;
  }, [formData, originalFormData, primaryImage, originalPrimaryImage, projectMedia, originalGallery]);

  useEffect(() => {
    setHasUnsavedChanges(checkUnsavedChanges());
  }, [formData, primaryImage, projectMedia, originalFormData, originalPrimaryImage, originalGallery, checkUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/projects/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbCategories(data.map((cat: any) => cat.title));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProjects(); fetchCategories(); }, []);

  const handleAddCategory = async (newCat: string) => {
    if (!dbCategories.includes(newCat)) {
      try {
        const res = await fetch('/api/projects/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newCat })
        });
        if (res.ok) setDbCategories(prev => [...prev, newCat]);
        else showAlert('خطا در ایجاد دسته', 'خطا', 'error');
      } catch (err) { console.error(err); }
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    try {
      const res = await fetch(`/api/projects/categories?title=${encodeURIComponent(cat)}`, { method: 'DELETE' });
      if (res.ok) {
        setDbCategories(prev => prev.filter(c => c !== cat));
        if (formData.category === cat) setFormData({ ...formData, category: '' });
      } else showAlert('خطا در حذف دسته', 'خطا', 'error');
    } catch (err) { console.error(err); }
  };

  const handleEditCategory = async (oldCat: string, newCat: string) => {
    if (oldCat === newCat) return;
    if (dbCategories.includes(newCat)) {
      showAlert('این عنوان قبلاً وجود دارد', 'تکرار', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/projects/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTitle: oldCat, newTitle: newCat })
      });
      if (res.ok) {
        setDbCategories(prev => prev.map(c => c === oldCat ? newCat : c));
        if (formData.category === oldCat) setFormData({ ...formData, category: newCat });
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در ویرایش دسته', 'خطا', 'error');
      }
    } catch (err) { console.error(err); }
  };

  const sanitizeSlug = (input: string) => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    if (regex.test(cleaned)) setSlugError('❌ نامک نامعتبر'); else setSlugError('');
    return cleaned.replace(regex, '').toLowerCase();
  };

  const isSlugDuplicate = projects.some(p => p.slug === formData.slug && p.id !== editingId);

const handleMediaUpload = async (files: FileList | File[], optimize: boolean) => {
  if (!formData.slug || isSlugDuplicate || slugError) {
    showAlert('ابتدا نامک معتبر وارد کنید', 'خطا', 'error');
    return;
  }
  setUploadingMedia(true);
  const newMedia: GalleryItem[] = [];
  let firstImg: string | null = null;
  
  // تبدیل ورودی به آرایه برای پیمایش یکسان
  const fileArray = files instanceof FileList ? Array.from(files) : files;
  
  for (const file of fileArray) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'projects');
    fd.append('customName', `${formData.slug}-${Date.now()}`);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const url = data.url?.startsWith('http') ? data.url : `/${data.url}`;
        const finalSize = data.finalSize || data.size || file.size;
        const newItem: GalleryItem = { id: Date.now() + Math.random(), imageUrl: url, size: finalSize };
        newMedia.push(newItem);
        setPendingUnsavedMedia(prev => [...prev, url]);
        if (!firstImg && isImageFile(url)) firstImg = url;
      }
    } catch (e) { console.error(e); }
  }
  setProjectMedia(prev => [...prev, ...newMedia]);
  if (!primaryImage && firstImg) setPrimaryImage(firstImg);
  setUploadingMedia(false);
};

  // تابع حذف فایل با تأیید قبلی
  const handleMediaDelete = async (item: GalleryItem) => {
    showConfirm({
      title: 'حذف فایل',
      message: 'آیا از حذف این فایل اطمینان دارید؟',
      confirmText: 'حذف',
      cancelText: 'انصراف',
      type: 'error',
      onConfirm: async () => {
        // اگر فایل در لیست pending است، فقط از آن لیست حذف کن
        if (pendingUnsavedMedia.includes(item.imageUrl)) {
          setPendingUnsavedMedia(prev => prev.filter(url => url !== item.imageUrl));
          setProjectMedia(prev => prev.filter(m => m.imageUrl !== item.imageUrl));
          if (primaryImage === item.imageUrl) setPrimaryImage(null);
          return;
        }
        // در غیر این صورت از سرور حذف کن
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
          setProjectMedia(prev => prev.filter(m => m.imageUrl !== item.imageUrl));
          if (primaryImage === item.imageUrl) setPrimaryImage(null);
        } catch(e) { console.error(e); }
      }
    });
  };

  const handleCropReplace = async (item: GalleryItem, croppedFile: File, optimize: boolean) => {
    const fd = new FormData();
    fd.append('file', croppedFile);
    fd.append('type', 'projects');
    fd.append('optimize', optimize ? 'true' : 'false');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      const newUrl = data.url.startsWith('http') ? data.url : `/${data.url}`;
      const newSize = data.finalSize || data.size;
      await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
      setProjectMedia(prev => prev.map(m => m.id === item.id ? { ...m, imageUrl: newUrl, size: newSize } : m));
      if (primaryImage === item.imageUrl) setPrimaryImage(newUrl);
      setPendingUnsavedMedia(prev => [...prev, newUrl]);
    }
  };

  const handleSave = async () => {
    if (isSlugDuplicate || slugError || !formData.title || !formData.slug || !formData.content) {
      showAlert('لطفاً عنوان، نامک و متن اصلی را کامل کنید', 'خطا', 'error');
      return;
    }
    if (!primaryImage) {
      showAlert('لطفاً یک تصویر اصلی (کاور) برای پروژه انتخاب کنید', 'خطا', 'error');
      return;
    }
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/projects/${editingId}` : '/api/projects';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageUrl: primaryImage,
          gallery: projectMedia
        })
      });
      if (res.ok) {
        showAlert('پروژه با موفقیت ذخیره شد', 'موفق', 'success');
        setOriginalFormData({ ...formData });
        setOriginalPrimaryImage(primaryImage);
        setOriginalGallery([...projectMedia]);
        setPendingUnsavedMedia([]);
        setHasUnsavedChanges(false);
        fetchProjects();
        fetchCategories();
        resetForm();
        setView('list');
      } else {
        showAlert('خطا در ذخیره پروژه', 'خطا', 'error');
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true });
    setPrimaryImage(null);
    setProjectMedia([]);
    setSlugError('');
    setOriginalFormData({ title: '', slug: '', category: '', location: '', content: '', size: 'normal', isActive: true });
    setOriginalPrimaryImage(null);
    setOriginalGallery([]);
    setPendingUnsavedMedia([]);
    setHasUnsavedChanges(false);
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id);
    const newFormData = {
      title: project.title, slug: project.slug, category: project.category || '',
      location: project.location || '', content: project.content, size: project.size, isActive: project.isActive
    };
    setFormData(newFormData);
    setPrimaryImage(project.imageUrl);
    const galleryFromDb = Array.isArray(project.gallery) ? project.gallery : [];
    setProjectMedia(galleryFromDb);
    setOriginalFormData({ ...newFormData });
    setOriginalPrimaryImage(project.imageUrl);
    setOriginalGallery([...galleryFromDb]);
    setPendingUnsavedMedia([]);
    setHasUnsavedChanges(false);
    setView('add');
  };

  const discardChanges = useCallback(() => {
    if (!hasUnsavedChanges) {
      setView('list');
      resetForm();
      return;
    }
    showConfirm({
      title: 'خروج بدون ذخیره',
      message: 'تغییرات ذخیره نشده‌ای وجود دارد. آیا مطمئن هستید که می‌خواهید خارج شوید؟',
      confirmText: 'بله، خارج شو',
      cancelText: 'خیر، ادامه ویرایش',
      type: 'warning',
      onConfirm: async () => {
        for (const url of pendingUnsavedMedia) {
          try {
            await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
          } catch (e) { console.error(e); }
        }
        setView('list');
        resetForm();
      }
    });
  }, [hasUnsavedChanges, pendingUnsavedMedia, showConfirm]);

  const handleDeleteProject = (id: number) => {
    showConfirm({
      title: 'حذف پروژه',
      message: 'آیا از حذف این پروژه اطمینان دارید؟ این عمل غیرقابل بازگشت است.',
      confirmText: 'حذف',
      cancelText: 'انصراف',
      type: 'error',
      onConfirm: async () => {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        fetchProjects();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 text-gray-800" dir="rtl">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-gray-900">مدیریت پروژه‌ها</h2>
        <p className="text-gray-500 text-sm">ثبت و ویرایش پروژه‌های انجام شده</p>
      </div>

      {view === 'list' ? (
        <div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3">
            <button onClick={() => { resetForm(); setView('add'); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 justify-center transition">
              <Plus size={16} /> پروژه جدید
            </button>
            <div className="flex-1 relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="جستجوی عنوان..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                <tr><th className="p-3 text-center">پیش‌نمایش</th><th className="p-3 text-right">عنوان</th><th className="p-3 text-center">دسته‌بندی</th><th className="p-3 text-center">عملیات</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" size={28} /></td></tr>
                ) : projects.filter(p => p.title.includes(searchQuery)).length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400">پروژه‌ای وجود ندارد</td></tr>
                ) : (
                  projects.filter(p => p.title.includes(searchQuery)).map(project => (
                    <tr key={project.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-3 text-center"><img src={project.imageUrl} className="w-12 h-10 object-cover rounded-lg shadow-sm" alt="" /></td>
                      <td className="p-3 font-medium">{project.title}<div className="text-[11px] text-gray-400">/{project.slug}</div></td>
                      <td className="p-3 text-center"><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{project.category || 'بدون دسته'}</span></td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(project)} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteProject(project.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <button onClick={discardChanges} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><ArrowRight size={20} /></button>
            <h2 className="font-bold text-gray-800">{editingId ? 'ویرایش پروژه' : 'پروژه جدید'}</h2>
            <button onClick={handleSave} disabled={saving || uploadingMedia} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex gap-2 items-center transition disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} ذخیره
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            <div className="flex-1 min-w-0 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="font-bold text-emerald-600 border-b border-gray-200 pb-2 mb-4 flex gap-2">
                <FileText size={18} /> مشخصات پروژه
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">عنوان پروژه *</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">نامک (Slug) *</label>
                  <input dir="ltr" className={`w-full border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none ${(isSlugDuplicate || slugError) ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`} value={formData.slug} onChange={e => setFormData({...formData, slug: sanitizeSlug(e.target.value)})} />
                  {slugError && <p className="text-red-500 text-[10px] mt-1">{slugError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700">دسته‌بندی</label>
                    <CategoryField
                      value={formData.category}
                      onChange={(val) => setFormData({...formData, category: val})}
                      categories={dbCategories}
                      onAddCategory={handleAddCategory}
                      onDeleteCategory={handleDeleteCategory}
                      onEditCategory={handleEditCategory}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">مکان پروژه</label>
                    <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">اندازه کارت</label>
                    <select className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}>
                      <option value="normal">مربع کوچک (عادی)</option>
                      <option value="wide">مستطیل افقی (عریض)</option>
                      <option value="tall">مستطیل عمودی (بلند)</option>
                      <option value="large">مربع بزرگ (شاخص)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-gray-700">منتشر شود</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="font-bold text-emerald-600 border-b border-gray-200 pb-2 mb-3 flex gap-2 flex-wrap">
                <ImageIcon size={18} /> گالری تصاویر و فایل‌ها
                <span className="text-xs text-red-500 font-normal">(حتماً یک تصویر را به عنوان کاور انتخاب کنید)</span>
              </div>
              <div className="h-60 md:h-72 w-full">
                <GalleryManager
                  items={projectMedia}
                  isUploading={uploadingMedia}
                  onUpload={handleMediaUpload}
                  onDelete={handleMediaDelete}
                  onCropReplace={handleCropReplace}
                  primaryImageUrl={primaryImage}
                  onSetPrimary={(item) => setPrimaryImage(item.imageUrl)}
                  allowCopyLink={true}
                  hasPrimaryImage={true}
                  title="آپلود فایل"
                  description="برای افزودن تصویر یا فایل کلیک کنید"
                  themeColor="emerald"
                  multiple={true}
                />
              </div>
              {!primaryImage && projectMedia.some(m => isImageFile(m.imageUrl)) && (
                <p className="text-red-500 text-xs mt-2 text-center">⚠️ لطفاً با کلیک روی ستارهٔ یکی از تصاویر، کاور پروژه را مشخص کنید</p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">توضیحات کامل پروژه</h3>
            <HitmanTextEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} slug={formData.slug} />
          </div>
        </div>
      )}
    </div>
  );
}