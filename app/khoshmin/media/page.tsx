'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  XCircle, Folder, FileImage, FileText, File as FileIcon, Search, Trash2, 
  ShieldAlert, ArrowRight, Home, ChevronLeft, HardDrive, Loader2, 
  CheckCircle, Copy, AlertTriangle, Database, ExternalLink, Terminal, ShieldCheck,
  UploadCloud, RefreshCw, FolderPlus, Download, Upload, Edit3, ClipboardList, Scissors,
  ArrowLeft, ChevronRight, X
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface MediaFile { name: string; path: string; size: number; lastModified: string; url: string; }
interface SelectedItem { type: 'file' | 'folder'; path: string; name: string; url?: string; fileData?: MediaFile; newName?: string; }

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 🛠️ تابع پالایش نام: فقط حروف انگلیسی، اعداد، خط تیره، زیرخط، نقطه (برای پسوند)
function sanitizeName(name: string, isFile: boolean = false): string {
  let cleaned = name.trim();
  // حذف کاراکترهای غیرمجاز (فارسی و ...) - فقط ASCII مجاز
  cleaned = cleaned.replace(/[^a-zA-Z0-9\-_.]/g, '');
  // فاصله‌ها را به خط تیره تبدیل کن
  cleaned = cleaned.replace(/\s+/g, '-');
  // چند خط تیره پشت سر هم را یکی کن
  cleaned = cleaned.replace(/-+/g, '-');
  // حذف خط تیره از ابتدا و انتها
  cleaned = cleaned.replace(/^-+|-+$/g, '');
  if (!isFile) {
    // پوشه نباید نقطه داشته باشد (به جز نقطه در نام؟ بهتر است اجازه ندهیم)
    cleaned = cleaned.replace(/\./g, '');
  }
  if (cleaned === '') {
    throw new Error('نام معتبر نیست. فقط از حروف انگلیسی، اعداد، خط تیره و زیرخط استفاده کنید.');
  }
  return cleaned;
}

// کامپوننت مودال برای دریافت ورودی متن (جایگزین prompt)
function TextInputModal({ 
  isOpen, 
  title, 
  message, 
  defaultValue, 
  onConfirm, 
  onCancel,
  preserveExtension = false,
  originalName = '',
  isFile = false
}: { 
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  preserveExtension?: boolean;
  originalName?: string;
  isFile?: boolean;
}) {
  const [value, setValue] = useState(defaultValue || '');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getBaseName = (fullName: string) => {
    const lastDot = fullName.lastIndexOf('.');
    if (lastDot === -1) return fullName;
    return fullName.substring(0, lastDot);
  };

  const getExtension = (fullName: string) => {
    const lastDot = fullName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fullName.substring(lastDot);
  };

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue || '');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = () => {
    let rawValue = value.trim();
    if (!rawValue) {
      setError('این فیلد نمی‌تواند خالی باشد.');
      return;
    }
    try {
      let finalName = rawValue;
      // اگر پرزرو پسوند فعال است و نام اصلی دارد، پسوند را اضافه کن
      if (preserveExtension && originalName) {
        const ext = getExtension(originalName);
        if (ext && !finalName.endsWith(ext)) {
          finalName = finalName + ext;
        }
      }
      // پالایش نام
      finalName = sanitizeName(finalName, isFile);
      onConfirm(finalName);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-gray-800">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        {message && <p className="text-sm text-gray-600 mb-4">{message}</p>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); if (error) setError(''); }}
          className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition">انصراف</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">تأیید</button>
        </div>
      </div>
    </div>
  );
}

export default function MediaManager() {
  const { showAlert, showConfirm } = useModal();
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [pathHistory, setPathHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut', items: SelectedItem[] } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [orphanModalOpen, setOrphanModalOpen] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState<MediaFile[]>([]);
  const [scanStats, setScanStats] = useState({ minio: 0, db: 0 });
  const [deletingOrphans, setDeletingOrphans] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: SelectedItem | null; usages: any[]; isDeleting: boolean }>({ open: false, item: null, usages: [], isDeleting: false });

  // State برای مودال ورودی متن (جایگزین prompt)
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    defaultValue?: string;
    preserveExtension?: boolean;
    originalName?: string;
    isFile?: boolean;
    resolve: (value: string | null) => void;
  }>({ isOpen: false, title: '', resolve: () => {} });

  // Helper برای باز کردن مودال و برگرداندن Promise
  const showTextInput = (title: string, message?: string, defaultValue?: string, preserveExtension = false, originalName = '', isFile = false): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        message,
        defaultValue,
        preserveExtension,
        originalName,
        isFile,
        resolve,
      });
    });
  };

  const closeTextInput = () => {
    setPromptState(prev => ({ ...prev, isOpen: false }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async (prefix: string = currentPrefix) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?action=list&prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders);
        setFiles(data.files);
        setCurrentPrefix(data.currentPrefix);
        setSelectedItems([]); 
      } else {
        showAlert(data.message || 'خطا در دریافت فایل‌ها', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطا در ارتباط با سرور', 'خطا', 'error');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchMedia(currentPrefix); }, [currentPrefix]);

  const navigateTo = (newPath: string, isHistoryMove: boolean = false) => {
    if (newPath === currentPrefix) return;
    if (!isHistoryMove) {
      const newHistory = pathHistory.slice(0, historyIndex + 1);
      newHistory.push(newPath);
      setPathHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setCurrentPrefix(newPath);
    setSelectedItems([]);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevPath = pathHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      navigateTo(prevPath, true);
    }
  };

  const goForward = () => {
    if (historyIndex < pathHistory.length - 1) {
      const nextPath = pathHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      navigateTo(nextPath, true);
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: SelectedItem) => {
    e.stopPropagation(); 
    if (selectedItems.find(i => i.path === item.path)) {
      setSelectedItems(selectedItems.filter(i => i.path !== item.path));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleFolderDoubleClick = (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    navigateTo(folderPath);
  };

  const handleBackgroundClick = () => {
    if (selectedItems.length > 0) setSelectedItems([]);
  };

  const handleGoUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(p => p !== '');
    parts.pop();
    const parentPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    navigateTo(parentPrefix);
  };

  const createFolder = async () => {
    const folderName = await showTextInput('ساخت پوشه جدید', 'نام پوشه (فقط حروف انگلیسی، اعداد، خط تیره و زیرخط مجاز است)', '', false, '', false);
    if (!folderName) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('action', 'createFolder');
    fd.append('folderName', folderName);
    fd.append('prefix', currentPrefix);
    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) showAlert(data.message || 'مشکل در ساخت پوشه', 'خطا', 'error');
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    fetchMedia(currentPrefix);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // پالایش نام فایل (حذف کاراکترهای نامجاز، تبدیل فاصله به خط تیره)
    let sanitizedFileName = file.name;
    try {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const cleanedBase = sanitizeName(nameWithoutExt, true);
      sanitizedFileName = cleanedBase + ext;
    } catch (err: any) {
      showAlert(`نام فایل نامعتبر: ${err.message}`, 'خطا', 'error');
      return;
    }
    
    // ساخت یک File جدید با نام پالایش‌شده
    const renamedFile = new File([file], sanitizedFileName, { type: file.type });
    
    setUploading(true);
    const fd = new FormData();
    fd.append('file', renamedFile);
    fd.append('folder', currentPrefix);
    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) showAlert(data.message || 'خطا در آپلود', 'خطا', 'error');
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchMedia(currentPrefix);
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedItems.length !== 1 || selectedItems[0].type !== 'file') return;

    // نام فایل جدید باید دقیقاً با فایل قبلی یکی باشد (که قبلاً پالایش شده)
    if (file.name !== selectedItems[0].name) {
      showAlert(`خطا: برای جایگزینی فایل، نام فایل جدید باید دقیقا "${selectedItems[0].name}" باشد!`, 'خطا', 'error');
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', currentPrefix);
    fd.append('replaceUrl', selectedItems[0].url!);
    
    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        showAlert('فایل با موفقیت جایگزین شد. (اگر سایت تغییر نکرده، کش مرورگر را با Ctrl+F5 پاک کنید)', 'موفقیت', 'success');
      } else {
        showAlert(data.message || 'خطا در جایگزینی', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    
    setUploading(false);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    fetchMedia(currentPrefix);
  };

  const checkFolderWarning = async (): Promise<boolean> => {
    if (selectedItems.some(i => i.type === 'folder')) {
      return new Promise((resolve) => {
        showConfirm({
          title: 'هشدار مهم',
          message: '⚠️ شما در حال تغییرات روی یک "پوشه" هستید.\nممکن است عکس‌های داخل این پوشه در سایت استفاده شده باشند. در صورت تایید، تمام لینک‌های دیتابیس مربوط به این پوشه تغییر خواهد کرد.\nآیا از انجام این عملیات مطمئن هستید؟',
          type: 'warning',
          confirmText: 'بله، ادامه دهم',
          cancelText: 'انصراف',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    }
    return true;
  };

  const handleRename = async () => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    
    const ok = await checkFolderWarning();
    if (!ok) return;

    const isFile = item.type === 'file';
    const originalFullName = item.name;
    let defaultValue = originalFullName;
    let preserveExtension = false;
    let originalNameForExt = '';

    if (isFile) {
      const lastDot = originalFullName.lastIndexOf('.');
      if (lastDot !== -1) {
        defaultValue = originalFullName.substring(0, lastDot);
        preserveExtension = true;
        originalNameForExt = originalFullName;
      }
    }

    const newBaseName = await showTextInput(
      'تغییر نام',
      'نام جدید را وارد کنید',
      defaultValue,
      preserveExtension,
      originalNameForExt,
      isFile
    );
    if (!newBaseName) return;

    const newName = newBaseName; // مودال خودش پسوند را اضافه می‌کند
    if (newName === item.name) return;

    setLoading(true);
    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', type: item.type, path: item.path, oldUrl: item.url, newName })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('تغییر نام با موفقیت انجام شد و دیتابیس آپدیت گردید.', 'موفقیت', 'success');
      } else {
        showAlert(data.message || 'خطا در تغییر نام', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    fetchMedia(currentPrefix);
  };

  const handleCopy = () => { setClipboard({ action: 'copy', items: selectedItems }); setSelectedItems([]); };
  
  const handleCut = async () => {
    const ok = await checkFolderWarning();
    if (!ok) return;
    setClipboard({ action: 'cut', items: selectedItems }); 
    setSelectedItems([]); 
  };

  const clearClipboard = () => {
    setClipboard(null);
  };
  
  const handlePaste = async () => {
    if (!clipboard) return;

    let itemsToPaste = [...clipboard.items];

    for (let i = 0; i < itemsToPaste.length; i++) {
      let item = itemsToPaste[i];
      let itemName = item.name;
      
      let isCollision = false;
      if (item.type === 'file') {
        isCollision = files.some(f => f.name === itemName);
      } else {
        isCollision = folders.some(f => f.split('/').filter(Boolean).pop() === itemName);
      }

      if (isCollision) {
        const resolve = await new Promise<boolean | string>((resolve) => {
          showConfirm({
            title: 'تضاد نام',
            message: `فایل یا پوشه‌ای با نام "${itemName}" در این مسیر وجود دارد.\nآیا می‌خواهید نام آن را تغییر دهید و سپس جایگذاری کنید؟ (لغو = انصراف از کل عملیات)`,
            type: 'warning',
            confirmText: 'بله، تغییر نام',
            cancelText: 'لغو عملیات',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (resolve === false) {
          setClipboard(null);
          return;
        } else {
          const isFile = item.type === 'file';
          const defaultVal = itemName;
          let preserveExt = false;
          let origName = '';
          if (isFile) {
            const lastDot = itemName.lastIndexOf('.');
            if (lastDot !== -1) {
              defaultVal.substring(0, lastDot);
              preserveExt = true;
              origName = itemName;
            }
          }
          const newName = await showTextInput(
            'تغییر نام',
            `نام جدید برای "${itemName}" را وارد کنید:`,
            defaultVal,
            preserveExt,
            origName,
            isFile
          );
          if (newName && newName !== itemName) {
            itemsToPaste[i] = { ...item, newName: newName };
          } else {
            setClipboard(null);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'paste', items: itemsToPaste, destination: currentPrefix, isCut: clipboard.action === 'cut' })
      });
      const data = await res.json();
      if (!data.success) {
        showAlert(data.message || 'خطا در جایگذاری', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    
    setClipboard(null);
    fetchMedia(currentPrefix);
  };

  const initiateDelete = async () => {
    if (selectedItems.length === 0) return;
    const ok = await checkFolderWarning();
    if (!ok) return;

    if (selectedItems.length > 1 || selectedItems[0].type === 'folder') {
      showConfirm({
        title: 'حذف گروهی',
        message: 'آیا از حذف دائمی این اطلاعات از سرور و دیتابیس سایت مطمئن هستید؟',
        type: 'warning',
        confirmText: 'بله، حذف شود',
        cancelText: 'انصراف',
        onConfirm: async () => {
          setLoading(true);
          try {
            const res = await fetch('/api/media', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: selectedItems, removeFromDb: true })
            });
            const data = await res.json();
            if (!data.success) {
              showAlert(data.message || 'خطا در حذف', 'خطا', 'error');
            }
          } catch (err: any) {
            showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
          }
          fetchMedia(currentPrefix);
        }
      });
      return;
    }

    const item = selectedItems[0];
    try {
      const res = await fetch(`/api/media?action=check&url=${encodeURIComponent(item.url!)}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.inUse) {
          setDeleteModal({ open: true, item, usages: data.usages, isDeleting: false });
        } else {
          showConfirm({
            title: 'حذف فایل',
            message: 'این فایل در هیچ کجای سایت استفاده نشده است. آیا حذف شود؟',
            type: 'warning',
            confirmText: 'بله، حذف شود',
            cancelText: 'انصراف',
            onConfirm: async () => await executeFinalDelete([item], false)
          });
        }
      } else {
        showAlert(data.message || 'خطا در بررسی فایل', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
  };

  const executeFinalDelete = async (itemsToDelete: SelectedItem[], removeFromDb: boolean) => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDelete, removeFromDb })
      });
      const data = await res.json();
      if (!data.success) {
        showAlert(data.message || 'خطا در حذف', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطای ارتباط با سرور', 'خطا', 'error');
    }
    
    setDeleteModal({ open: false, item: null, usages: [], isDeleting: false });
    fetchMedia(currentPrefix);
  };

  const scanForOrphans = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/media?action=orphans');
      const data = await res.json();
      if (data.success) {
        setOrphanedFiles(data.orphans);
        setScanStats({ minio: data.totalMinioFiles, db: data.totalDbFiles });
        setOrphanModalOpen(true);
      } else {
        showAlert(data.message || 'خطا در اسکن.', 'خطا', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const deleteOrphans = async () => {
    if (orphanedFiles.length === 0) return;
    setDeletingOrphans(true);
    try {
      const urlsToDelete = orphanedFiles.map(f => ({ type: 'file', path: f.path }));
      const res = await fetch('/api/media', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: urlsToDelete, removeFromDb: false })
      });
      const data = await res.json();
      if (data.success) {
        setOrphanModalOpen(false);
        showAlert('فایل‌های یتیم با موفقیت حذف شدند.', 'موفقیت', 'success');
      } else {
        showAlert(data.message || 'خطا در پاکسازی', 'خطا', 'error');
      }
      fetchMedia(currentPrefix);
    } catch (err: any) {
      showAlert(err.message || 'خطا در حذف گروهی', 'خطا', 'error');
    } finally {
      setDeletingOrphans(false);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const breadcrumbs = currentPrefix.split('/').filter(p => p !== '');

  // دکمه کپی لینک تکی
  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showAlert('لینک کپی شد!', 'موفقیت', 'success');
    } catch (err) {
      showAlert('خطا در کپی لینک', 'خطا', 'error');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-20 animate-in fade-in duration-500" dir="rtl">
      
      {/* TextInput Modal (جایگزین prompt) */}
      <TextInputModal
        isOpen={promptState.isOpen}
        title={promptState.title}
        message={promptState.message}
        defaultValue={promptState.defaultValue}
        preserveExtension={promptState.preserveExtension}
        originalName={promptState.originalName}
        isFile={promptState.isFile}
        onConfirm={(value) => {
          promptState.resolve(value);
          closeTextInput();
        }}
        onCancel={() => {
          promptState.resolve(null);
          closeTextInput();
        }}
      />

      {/* 1. هدر اصلی */}
      <div className="bg-white p-6 md:p-8 rounded-t-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3 mb-2">
            <HardDrive className="text-teal-500" size={32} />
            مدیریت فضای ابری
          </h1>
        </div>
        <button onClick={scanForOrphans} disabled={isScanning} className="w-full md:w-auto bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all px-6 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-3 shadow-sm">
          {isScanning ? <Loader2 className="animate-spin" size={22} /> : <ShieldAlert size={22} />} پاکسازی فایل‌های یتیم
        </button>
      </div>

      <div className="bg-slate-50 p-4 border-x border-gray-200 flex items-center">
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-96 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input type="text" placeholder="جستجو در این پوشه..." className="bg-transparent border-none outline-none w-full text-sm font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* بخش فایل منیجر */}
      <div className="bg-white rounded-b-3xl shadow-sm border border-gray-100 border-t-0 overflow-hidden flex flex-col mb-10 cursor-default" onClick={handleBackgroundClick}>
        {/* نوار ابزار */}
        <div className="bg-slate-100 border-y border-gray-200 p-3 md:px-5 flex flex-col lg:flex-row items-center justify-between gap-4 min-h-[64px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600 overflow-x-auto whitespace-nowrap w-full lg:w-auto custom-scrollbar pb-1 lg:pb-0">
            <div className="flex items-center gap-1 ml-2 border-l border-gray-300 pl-2">
              <button onClick={goForward} disabled={historyIndex === pathHistory.length - 1} className={`p-2 rounded-lg transition ${historyIndex === pathHistory.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-200'}`} title="جلو"><ArrowRight size={18} /></button>
              <button onClick={goBack} disabled={historyIndex === 0} className={`p-2 rounded-lg transition ${historyIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-200'}`} title="عقب"><ArrowLeft size={18} /></button>
            </div>
            <button onClick={() => navigateTo('')} className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-700 flex-shrink-0"><Home size={18} /></button>
            {breadcrumbs.length > 0 && <ChevronLeft size={16} className="text-gray-400 flex-shrink-0" />}
            {breadcrumbs.map((crumb, idx) => {
              const path = breadcrumbs.slice(0, idx + 1).join('/') + '/';
              return (
                <React.Fragment key={path}>
                  <button onClick={() => navigateTo(path)} className="hover:text-teal-600 transition flex-shrink-0">{crumb}</button>
                  {idx < breadcrumbs.length - 1 && <ChevronLeft size={16} className="text-gray-400 flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto whitespace-nowrap custom-scrollbar pb-1 lg:pb-0">
            {selectedItems.length > 0 ? (
              <>
                <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg ml-2">{selectedItems.length} مورد</span>
                {selectedItems.length === 1 && selectedItems[0].type === 'file' && (
                  <>
                    <button onClick={() => copyLink(selectedItems[0].url!)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-bold text-slate-700"><Copy size={14} /> کپی لینک</button>
                    <button onClick={() => replaceInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-600"><RefreshCw size={14} /> جایگزین</button>
                    <input type="file" className="hidden" ref={replaceInputRef} onChange={handleReplace} />
                  </>
                )}
                {selectedItems.length === 1 && (
                  <button onClick={handleRename} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-amber-600"><Edit3 size={14} /> تغییر نام</button>
                )}
                <button onClick={handleCut} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-700"><Scissors size={14} /> برش</button>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-700"><Copy size={14} /> کپی</button>
                <button onClick={initiateDelete} className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 rounded-lg text-xs font-bold ml-2"><Trash2 size={14} /> حذف</button>
                <button onClick={() => setSelectedItems([])} className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-gray-200 rounded-lg"><XCircle size={16} /></button>
              </>
            ) : (
              <>
                {clipboard && (
                  <>
                    <button onClick={handlePaste} className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 rounded-xl text-sm font-bold shadow-sm transition">
                      <ClipboardList size={18} /> چسباندن (Paste)
                    </button>
                    <button onClick={clearClipboard} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 rounded-xl text-sm font-bold shadow-sm transition">
                      <X size={18} /> لغو عملیات
                    </button>
                  </>
                )}
                <button onClick={createFolder} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition">
                  <FolderPlus size={18} /> پوشه جدید
                </button>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition">
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />} آپلود در اینجا
                </button>
              </>
            )}
          </div>
        </div>

        {/* لیست فایل‌ها */}
        <div className="p-6 md:p-8 flex-1 bg-white min-h-[400px]" onClick={handleBackgroundClick}>
          {loading ? (
            <div className="flex justify-center items-center h-64"><Loader2 size={48} className="animate-spin text-teal-600" /></div>
          ) : (
            <>
              {currentPrefix && (
                <button onClick={(e) => { e.stopPropagation(); handleGoUp(); }} className="mb-8 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition font-bold text-sm bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl w-fit"><ChevronRight size={18} /> برگشت به پوشه قبلی</button>
              )}
              {folders.length === 0 && files.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Folder size={80} className="mb-4 opacity-20" />
                  <p className="font-bold text-lg">این پوشه خالی است.</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {!searchQuery && folders.map(folder => {
                  const folderName = folder.split('/').filter(Boolean).pop() || '';
                  const isSelected = selectedItems.some(i => i.path === folder);
                  return (
                    <div 
                      key={folder} 
                      onClick={(e) => handleItemClick(e, { type: 'folder', path: folder, name: folderName })}
                      onDoubleClick={(e) => handleFolderDoubleClick(e, folder)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer transition select-none ${isSelected ? 'bg-blue-100 border-blue-400 border-2' : 'bg-blue-50/30 border-blue-100 border hover:bg-blue-50'}`}
                    >
                      <Folder size={64} className="text-blue-400" fill={isSelected ? '#60a5fa' : 'currentColor'} />
                      <span className="text-sm font-bold text-gray-700 text-center truncate w-full" dir="ltr">{folderName}</span>
                    </div>
                  );
                })}
                {filteredFiles.map(file => {
                  const isImg = /\.(jpeg|jpg|gif|png|webp)$/i.test(file.name);
                  const isPdf = /\.(pdf)$/i.test(file.name);
                  const isSelected = selectedItems.some(sf => sf.path === file.path);
                  return (
                    <div 
                      key={file.path} 
                      onClick={(e) => handleItemClick(e, { type: 'file', path: file.path, name: file.name, url: file.url, fileData: file })} 
                      className={`relative flex flex-col items-center gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200 shadow-md' : 'border-gray-200 hover:border-teal-400 bg-white hover:shadow-lg'}`}
                    >
                      <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center relative border border-gray-100 pointer-events-none">
                        {isImg ? <img src={file.url} className="w-full h-full object-cover" loading="lazy" /> : isPdf ? <FileText size={48} className="text-red-400" /> : <FileIcon size={48} className="text-gray-400" />}
                      </div>
                      <div className="w-full text-center px-1">
                        <p className={`text-xs font-bold truncate w-full ${isSelected ? 'text-blue-700' : 'text-gray-700'}`} dir="ltr" title={file.name}>{file.name}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* بخش ادمینر و دیتابیس (بدون تغییر) */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="p-8 md:p-10 flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black mb-4 border border-indigo-500/20">
              <ShieldCheck size={14} /> مدیریت دیتابیس MySQL
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">ابزار دیتابیس Adminer</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              جهت امنیت بالاتر، پنل مدیریت دیتابیس به صورت مجزا روی سرور نصب شده است. <br/>
              <span className="text-amber-400 font-bold">برای وارد شدن به این بخش، نام کاربری و رمز عبور دیتابیس را باید از مدیر سیستم بگیرید.</span>
            </p>
            <a href="http://45.149.78.107:8081" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-black transition-all mb-8 shadow-lg shadow-indigo-600/20">
              ورود به ادمینر (Adminer) <ExternalLink size={18} />
            </a>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Download size={16} className="text-green-400"/> خروجی گرفتن (Export)</h4>
                <p className="text-slate-400 text-xs leading-5">پس از ورود به سیستم، از منوی سمت چپ روی گزینه <b>Export</b> کلیک کنید. فرمت خروجی را روی <b>SQL</b> قرار داده و دکمه ذخیره (Save) را بزنید تا کل دیتابیس روی سیستم شما دانلود شود.</p>
              </div>
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Upload size={16} className="text-blue-400"/> ایمپورت کردن (Import)</h4>
                <p className="text-slate-400 text-xs leading-5">برای بازگردانی اطلاعات، روی گزینه <b>Import</b> در منوی کناری کلیک کنید. فایل SQL خود را انتخاب کرده و دکمه اجرا (Execute) را بزنید تا دیتابیس جایگزین شود.</p>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-80 bg-black/40 rounded-2xl p-6 border border-slate-700 h-full flex flex-col justify-center">
            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Terminal size={18} className="text-amber-400" /> خطای عدم اتصال؟</h4>
            <p className="text-slate-400 text-xs leading-6 mb-4">اگر صفحه ادمینر باز نشد، پورت 8081 در سرور بسته است. این دستور را در ترمینال سرور اجرا کنید:</p>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 border border-slate-700 relative">
              <span className="select-all">sudo ufw allow 8081/tcp</span>
              <button onClick={() => { navigator.clipboard.writeText('sudo ufw allow 8081/tcp'); showAlert('کپی شد!', 'موفقیت', 'success'); }} className="absolute left-2 top-2 text-slate-500 hover:text-white"><Copy size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* مودال حذف فایل با وابستگی */}
      {deleteModal.open && deleteModal.item && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="text-lg font-black text-center text-gray-800 mb-2">این فایل در سایت استفاده شده است!</h3>
            <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">فایل <span className="font-mono text-blue-600 mx-1">{deleteModal.item.name}</span> در بخش {deleteModal.usages[0]?.model} ثبت شده است.</p>
            <button onClick={() => executeFinalDelete([deleteModal.item!], true)} disabled={deleteModal.isDeleting} className="w-full p-4 border-2 border-red-100 hover:border-red-500 rounded-2xl flex items-center justify-between group text-right transition">
              <div><span className="block font-black text-red-600 mb-1 flex items-center gap-2">{deleteModal.isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} حذف از سرور و پاک‌سازی دیتابیس</span><span className="text-xs text-slate-500">فایل پاک شده و آدرس آن در سایت خالی می‌شود.</span></div>
            </button>
            <button onClick={() => setDeleteModal({ open: false, item: null, usages: [], isDeleting: false })} className="w-full mt-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition">انصراف</button>
          </div>
        </div>
      )}

      {/* مودال فایل‌های یتیم */}
      {orphanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          {/* محتوای مودال بدون تغییر */}
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
              <div className="bg-red-100 p-4 rounded-2xl text-red-600 shrink-0"><ShieldAlert size={36} /></div>
              <div className="flex-1"><h2 className="text-xl font-black text-red-700 mb-2">گزارش اسکن فضای ابری</h2><p className="text-sm text-red-600/80 font-bold">این فایل‌ها در دیتابیس یافت نشدند.</p></div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl text-center border shadow-sm"><span className="block text-2xl font-black">{scanStats.minio}</span><span className="text-xs text-slate-500 font-bold">کل فایل‌ها</span></div>
                <div className="bg-white p-4 rounded-2xl text-center border shadow-sm"><span className="block text-2xl font-black text-teal-600">{scanStats.db}</span><span className="text-xs text-slate-500 font-bold">فایل‌های معتبر</span></div>
              </div>
              {orphanedFiles.length > 0 ? (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {orphanedFiles.map((file, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 text-sm">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline truncate max-w-[75%] flex items-center gap-2" dir="ltr"><FileIcon size={14} className="text-blue-400" /> {file.name}</a>
                        <span className="text-gray-400 font-bold text-xs bg-gray-100 px-2 py-1 rounded-md">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-emerald-200"><CheckCircle size={64} className="mx-auto text-emerald-400 mb-4 opacity-50" /><h3 className="text-lg font-black text-slate-700">سرور شما کاملاً تمیز است!</h3></div>
              )}
            </div>
            <div className="p-6 bg-white border-t flex justify-end gap-3">
              <button onClick={() => setOrphanModalOpen(false)} className="px-6 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 transition">بستن</button>
              {orphanedFiles.length > 0 && <button onClick={deleteOrphans} disabled={deletingOrphans} className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-2 transition">{deletingOrphans ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />} حذف گروهی</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}