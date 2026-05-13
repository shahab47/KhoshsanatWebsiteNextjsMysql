'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowRight, Save, Loader2, Edit, Search, FolderOpen, FileText, Image as ImageIcon, ChevronDown, X, Pencil } from 'lucide-react';
import HitmanTextEditor from '../../../components/hitmantexteditor';
import GalleryManager, { GalleryItem } from '@/components/GalleryManager';
import { useModal } from '@/app/contexts/ModalContext';

const isImageFile = (url?: string) => /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(url || '');

// ==================== فیلد دسته‌بندی هوشمند با قابلیت حذف و ویرایش ====================
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
  const { showConfirm } = useModal();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const filtered = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const isNew = search && !categories.includes(search);

  useEffect(() => {
    setSearch(value);
  }, [value]);

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
    if (editingCat && editInputRef.current) {
      editInputRef.current.focus();
    }
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

  const handleDelete = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'حذف دسته‌بندی',
      message: `آیا از حذف دسته "${cat}" اطمینان دارید؟`,
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: () => onDeleteCategory(cat),
    });
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditingCat(null);
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
          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none transition pr-8"
          placeholder="جستجو یا ایجاد دسته جدید..."
        />
        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map(cat => (
            <div key={cat} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center justify-between group">
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
                  className="p-1 rounded-full hover:bg-blue-100 text-gray-400 hover:text-blue-600"
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
            <div onClick={handleCreate} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-[#2563EB] border-t border-gray-100 flex items-center gap-2">
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

// ==================== صفحه اصلی مدیریت آکادمی ====================
interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category?: string;
  author?: string;
  readTime?: number;
  imageUrl: string;
  media?: any[];
  isActive: boolean;
  createdAt?: string;
}

export default function AdminEducationPage() {
  const { showAlert, showConfirm } = useModal();
  const [view, setView] = useState<'list' | 'add'>('list');
  const [contentTab, setContentTab] = useState<'excerpt' | 'content'>('excerpt');
  const [articles, setArticles] = useState<Article[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugError, setSlugError] = useState('');
  const [formData, setFormData] = useState({
    title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true
  });
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [articleMedia, setArticleMedia] = useState<GalleryItem[]>([]);
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);

  // State for dirty checking
  const [initialFormData, setInitialFormData] = useState({ ...formData });
  const [initialPrimaryImage, setInitialPrimaryImage] = useState<string | null>(null);
  const [initialMedia, setInitialMedia] = useState<GalleryItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Helper to check if there are unsaved changes
  const checkDirty = () => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    const primaryChanged = primaryImage !== initialPrimaryImage;
    const mediaChanged = JSON.stringify(articleMedia.map(m => m.imageUrl)) !== JSON.stringify(initialMedia.map(m => m.imageUrl));
    return formChanged || primaryChanged || mediaChanged;
  };

  // Update isDirty on any change
  useEffect(() => {
    setIsDirty(checkDirty());
  }, [formData, primaryImage, articleMedia]);

  // Before unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && view === 'add') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, view]);

  // Delete temp files function
  const deleteTempFiles = async () => {
    for (const url of tempUploadedUrls) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Error deleting temp file:', url, err);
      }
    }
    setTempUploadedUrls([]);
  };

  // Reset form and clear temp files
  const resetForm = async (skipConfirm = false) => {
    if (isDirty && !skipConfirm && view === 'add') {
      showConfirm({
        title: 'خروج بدون ذخیره',
        message: 'تغییرات شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: async () => {
          await deleteTempFiles();
          setEditingId(null);
          setFormData({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true });
          setPrimaryImage(null);
          setArticleMedia([]);
          setSlugError('');
          setView('list');
          setIsDirty(false);
          setInitialFormData({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true });
          setInitialPrimaryImage(null);
          setInitialMedia([]);
        },
      });
    } else {
      await deleteTempFiles();
      setEditingId(null);
      setFormData({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true });
      setPrimaryImage(null);
      setArticleMedia([]);
      setSlugError('');
      setView('list');
      setIsDirty(false);
      setInitialFormData({ title: '', slug: '', excerpt: '', content: '', category: '', author: '', readTime: '', isActive: true });
      setInitialPrimaryImage(null);
      setInitialMedia([]);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/education', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/education/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbCategories(data.map((cat: any) => cat.title));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchArticles(); fetchCategories(); }, []);

  const handleAddCategory = async (newCat: string) => {
    if (!dbCategories.includes(newCat)) {
      try {
        const res = await fetch('/api/education/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newCat })
        });
        if (res.ok) {
          setDbCategories(prev => [...prev, newCat]);
        } else {
          console.error('خطا در ایجاد دسته');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    try {
      const res = await fetch(`/api/education/categories?title=${encodeURIComponent(cat)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDbCategories(prev => prev.filter(c => c !== cat));
        if (formData.category === cat) {
          setFormData({ ...formData, category: '' });
        }
      } else {
        showAlert('خطا در حذف دسته', 'خطا', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCategory = async (oldCat: string, newCat: string) => {
    if (oldCat === newCat) return;
    if (dbCategories.includes(newCat)) {
      showAlert('این عنوان قبلاً وجود دارد', 'خطا', 'error');
      return;
    }
    try {
      const res = await fetch('/api/education/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTitle: oldCat, newTitle: newCat })
      });
      if (res.ok) {
        setDbCategories(prev => prev.map(c => c === oldCat ? newCat : c));
        if (formData.category === oldCat) {
          setFormData({ ...formData, category: newCat });
        }
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در ویرایش دسته', 'خطا', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sanitizeSlug = (input: string) => {
    let cleaned = input.replace(/\s+/g, '-');
    const regex = /[^a-zA-Z0-9-]/g;
    if (regex.test(cleaned)) setSlugError('❌ نامک نامعتبر'); else setSlugError('');
    return cleaned.replace(regex, '').toLowerCase();
  };

  const isSlugDuplicate = articles.some(a => a.slug === formData.slug && a.id !== editingId);

const handleMediaUpload = async (files: FileList | File[], optimize: boolean) => {
  if (!formData.slug || isSlugDuplicate || slugError) {
    showAlert('ابتدا نامک معتبر وارد کنید', 'خطا', 'error');
    return;
  }
  setUploadingMedia(true);
  const newMedia: GalleryItem[] = [];
  let firstImg: string | null = null;
  
  // تبدیل یکسان ورودی به آرایه
  const fileArray = files instanceof FileList ? Array.from(files) : files;
  
  for (const file of fileArray) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'education');
    fd.append('customName', `${formData.slug}-${Date.now()}`);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const url = data.url?.startsWith('http') ? data.url : `/${data.url}`;
        const finalSize = data.finalSize || data.size || file.size;
        newMedia.push({ id: Date.now() + Math.random(), imageUrl: url, size: finalSize });
        setTempUploadedUrls(prev => [...prev, url]);
        if (!firstImg && isImageFile(url)) firstImg = url;
      }
    } catch (e) { console.error(e); }
  }
  setArticleMedia(prev => [...prev, ...newMedia]);
  if (!primaryImage && firstImg) setPrimaryImage(firstImg);
  setUploadingMedia(false);
};

  const handleMediaDelete = async (item: GalleryItem) => {
    showConfirm({
      title: 'حذف فایل',
      message: 'آیا از حذف این فایل اطمینان دارید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
          setArticleMedia(prev => prev.filter(m => m.imageUrl !== item.imageUrl));
          setTempUploadedUrls(prev => prev.filter(url => url !== item.imageUrl));
          if (primaryImage === item.imageUrl) setPrimaryImage(null);
        } catch(e){}
      }
    });
  };

  const handleCropReplace = async (item: GalleryItem, croppedFile: File, optimize: boolean) => {
    const fd = new FormData();
    fd.append('file', croppedFile);
    fd.append('type', 'education');
    fd.append('optimize', optimize ? 'true' : 'false');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      const newUrl = data.url.startsWith('http') ? data.url : `/${data.url}`;
      const newSize = data.finalSize || data.size;
      setTempUploadedUrls(prev => [...prev, newUrl]); // new crop is temp
      await fetch(`/api/upload?url=${encodeURIComponent(item.imageUrl)}`, { method: 'DELETE' });
      setTempUploadedUrls(prev => prev.filter(url => url !== item.imageUrl));
      setArticleMedia(prev => prev.map(m => m.id === item.id ? { ...m, imageUrl: newUrl, size: newSize } : m));
      if (primaryImage === item.imageUrl) setPrimaryImage(newUrl);
    }
  };

  const handleSave = async () => {
    if (isSlugDuplicate || slugError || !formData.title || !formData.slug || !formData.content) {
      showAlert('لطفاً عنوان، نامک و متن اصلی را کامل کنید', 'خطا', 'error');
      return;
    }
    if (!primaryImage) {
      showAlert('لطفاً یک تصویر شاخص (کاور) برای مقاله انتخاب کنید', 'خطا', 'error');
      return;
    }
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/education/${editingId}` : '/api/education';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          readTime: formData.readTime ? parseInt(formData.readTime) : null,
          imageUrl: primaryImage,
          media: articleMedia
        })
      });
      if (res.ok) {
        showAlert('مقاله ذخیره شد', 'موفقیت', 'success');
        // After save, temp files become permanent – clear temp list
        setTempUploadedUrls([]);
        await fetchArticles();
        await fetchCategories();
        resetForm(true);
        setView('list');
      } else {
        showAlert('خطا در ذخیره مقاله', 'خطا', 'error');
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const openEdit = (article: Article) => {
    setEditingId(article.id);
    const newFormData = {
      title: article.title, slug: article.slug, excerpt: article.excerpt || '', content: article.content,
      category: article.category || '', author: article.author || '', readTime: article.readTime?.toString() || '', isActive: article.isActive
    };
    setFormData(newFormData);
    setInitialFormData({ ...newFormData });
    setPrimaryImage(article.imageUrl);
    setInitialPrimaryImage(article.imageUrl);
    const mediaFromDb = Array.isArray(article.media) ? article.media : [];
    setArticleMedia(mediaFromDb);
    setInitialMedia([...mediaFromDb]);
    setView('add');
    setTempUploadedUrls([]); // fresh edit, no temp files yet
  };

  const handleDeleteArticle = async (id: number) => {
    showConfirm({
      title: 'حذف مقاله',
      message: 'آیا از حذف این مقاله اطمینان دارید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchArticles();
          showAlert('مقاله حذف شد', 'موفقیت', 'success');
        } else {
          showAlert('خطا در حذف مقاله', 'خطا', 'error');
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 text-gray-800" dir="rtl">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-gray-900">مدیریت آکادمی</h2>
        <p className="text-gray-500 text-sm">ایجاد و ویرایش مقالات</p>
      </div>

      {view === 'list' ? (
        <div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3">
            <button onClick={() => { resetForm(true); setView('add'); }} className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 justify-center transition">
              <Plus size={16} /> مقاله جدید
            </button>
            <div className="flex-1 relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="جستجوی عنوان..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                <tr>
                  <th className="p-3 text-center">پیش‌نمایش</th>
                  <th className="p-3 text-right">عنوان</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-[#2563EB]" size={28} /></td></tr>
                ) : articles.filter(a => a.title.includes(searchQuery)).length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400">مقاله‌ای وجود ندارد</td></tr>
                ) : (
                  articles.filter(a => a.title.includes(searchQuery)).map(article => (
                    <tr key={article.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-3 text-center"><img src={article.imageUrl} className="w-12 h-10 object-cover rounded-lg shadow-sm" alt="" /></td>
                      <td className="p-3 font-medium">{article.title}<div className="text-[11px] text-gray-400">/{article.slug}</div></td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${article.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{article.isActive ? 'منتشر شده' : 'پیش‌نویس'}</span></td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(article)} className="p-1.5 text-gray-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteArticle(article.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
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
            <button onClick={() => resetForm()} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><ArrowRight size={20} /></button>
            <h2 className="font-bold text-gray-800">{editingId ? 'ویرایش مقاله' : 'مقاله جدید'}</h2>
            <button onClick={handleSave} disabled={saving || uploadingMedia} className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex gap-2 items-center transition disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} ذخیره
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            {/* ستون مشخصات */}
            <div className="flex-1 min-w-0 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="font-bold text-[#2563EB] border-b border-gray-200 pb-2 mb-4 flex gap-2">
                <FileText size={18} /> مشخصات مقاله
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">عنوان مقاله *</label>
                  <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none transition" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">نامک (Slug) *</label>
                  <input dir="ltr" className={`w-full border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none transition ${(isSlugDuplicate || slugError) ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`} value={formData.slug} onChange={e => setFormData({...formData, slug: sanitizeSlug(e.target.value)})} />
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
                    <label className="text-xs font-bold text-gray-700">نویسنده</label>
                    <input className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">زمان مطالعه (دقیقه)</label>
                    <input type="number" className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none" value={formData.readTime} onChange={e => setFormData({...formData, readTime: e.target.value})} />
                  </div>
                  <div className="flex items-center justify-end">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-[#2563EB] focus:ring-[#2563EB]/30" />
                      <span className="text-xs font-bold text-gray-700">منتشر شود</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ستون گالری */}
            <div className="flex-1 min-w-0 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="font-bold text-[#2563EB] border-b border-gray-200 pb-2 mb-3 flex gap-2 flex-wrap">
                <ImageIcon size={18} /> رسانه‌ها و کاور
                <span className="text-xs text-red-500 font-normal">(حتماً یک تصویر را به عنوان کاور انتخاب کنید)</span>
              </div>
              <div className="h-60 md:h-72 w-full">
                <GalleryManager
                  items={articleMedia}
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
                  themeColor="#2563EB"
                  multiple={true}
                />
              </div>
              {!primaryImage && articleMedia.some(m => isImageFile(m.imageUrl)) && (
                <p className="text-red-500 text-xs mt-2 text-center">⚠️ لطفاً با کلیک روی ستارهٔ یکی از تصاویر، کاور مقاله را مشخص کنید</p>
              )}
            </div>
          </div>

          {/* ادیتور متن */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-5">
            <div className="flex gap-4 border-b border-gray-200 pb-2 mb-3">
              <button className={`text-sm font-bold transition ${contentTab === 'excerpt' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-gray-400'}`} onClick={() => setContentTab('excerpt')}>خلاصه مقاله</button>
              <button className={`text-sm font-bold transition ${contentTab === 'content' ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-gray-400'}`} onClick={() => setContentTab('content')}>متن اصلی</button>
            </div>
            {contentTab === 'excerpt' ? (
              <textarea rows={4} className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] outline-none transition" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} placeholder="خلاصه مقاله را بنویسید..." />
            ) : (
              <HitmanTextEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} slug={formData.slug} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}