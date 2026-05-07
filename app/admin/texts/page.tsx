'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Type, CheckCircle, Info, PhoneCall, Plus, Trash2, Loader2,
  UploadCloud, Crop, Search, Share2, Link as LinkIcon
} from 'lucide-react';

// 🟢 کامپوننت ویرایشگر کوچک (بدون تغییر)
const MiniRichEditor = ({ value, onChange, placeholder, singleLine = false }: { value: string, onChange: (val: string) => void, placeholder?: string, singleLine?: boolean }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !isComposing.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    editorRef.current?.focus();
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500 transition-shadow">
      <div className="bg-gray-50 border-b border-gray-200 p-1.5 flex items-center gap-2 flex-wrap" onMouseDown={(e) => e.preventDefault()}>
        <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white relative">
          <input type="color" onChange={(e) => exec('foreColor', e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" />
        </div>
        <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white" dir="ltr">
          <button type="button" onClick={() => {
            let cur = parseInt(document.queryCommandValue('fontSize') as string) || 3;
            exec('fontSize', Math.max(1, cur - 1).toString());
          }} className="px-3 py-1 text-sm text-gray-800 hover:bg-gray-100 font-bold border-r border-gray-200">-</button>
          <button type="button" onClick={() => {
            let cur = parseInt(document.queryCommandValue('fontSize') as string) || 3;
            exec('fontSize', Math.min(7, cur + 1).toString());
          }} className="px-3 py-1 text-sm text-gray-800 hover:bg-gray-100 font-bold">+</button>
        </div>
        <button type="button" onClick={() => exec('bold')} className="px-3 py-1 font-bold text-sm text-gray-800 border border-gray-300 rounded hover:bg-gray-100 bg-white">B</button>
        <button type="button" onClick={() => exec('removeFormat')} className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 bg-white">حذف استایل</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        onCompositionStart={() => isComposing.current = true}
        onCompositionEnd={() => isComposing.current = false}
        onKeyDown={(e) => {
          if (singleLine && e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        className={`w-full p-4 outline-none text-gray-900 leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 ${singleLine ? 'min-h-[50px] whitespace-nowrap overflow-x-auto custom-scrollbar' : 'min-h-[120px]'}`}
        data-placeholder={placeholder}
        dir="rtl"
      />
    </div>
  );
};

export default function TextsManager() {
  const [activeTab, setActiveTab] = useState<'about' | 'footer' | 'seo' | 'social'>('about');
  
  const [texts, setTexts] = useState({
    ABOUT_TITLE: '', ABOUT_DESC: '',
    FEATURE_1_TITLE: '', FEATURE_1_DESC: '',
    FEATURE_2_TITLE: '', FEATURE_2_DESC: '',
    FEATURE_3_TITLE: '', FEATURE_3_DESC: '',
    FOOTER_ABOUT: '', FOOTER_ADDRESS: '', FOOTER_PHONE: '', FOOTER_EMAIL: '', FOOTER_LOGO: '',
    FOOTER_COL1_TITLE: '', FOOTER_COL2_TITLE: ''
  });

  // SEO state
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');

  // شبکه‌های اجتماعی
  const [socialLinks, setSocialLinks] = useState({
    linkedin: '',
    instagram: '',
    telegram: '',
    whatsapp: '',
    twitter: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    soundcloud: ''
  });

  const [footerCol1, setFooterCol1] = useState<{id: number, text: string, url: string}[]>([]);
  const [footerCol2, setFooterCol2] = useState<{id: number, text: string, url: string}[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStartPos, setCropStartPos] = useState({ x: 0, y: 0 });

  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  // هشدار خروج با تغییرات ذخیره نشده
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'شما تغییرات ذخیره نشده‌ای دارید. آیا مطمئن هستید که می‌خواهید خارج شوید؟';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // بارگذاری داده‌ها از API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/texts', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          
          // متن‌های ساده
          setTexts(prev => ({ ...prev, ...data }));
          
          // SEO
          if (data.HOME_META_TITLE) setMetaTitle(data.HOME_META_TITLE);
          if (data.HOME_META_DESCRIPTION) setMetaDescription(data.HOME_META_DESCRIPTION);
          if (data.HOME_META_KEYWORDS) setMetaKeywords(data.HOME_META_KEYWORDS);
          
          // شبکه‌های اجتماعی
          setSocialLinks({
            linkedin: data.SOCIAL_LINKEDIN || '',
            instagram: data.SOCIAL_INSTAGRAM || '',
            telegram: data.SOCIAL_TELEGRAM || '',
            whatsapp: data.SOCIAL_WHATSAPP || '',
            twitter: data.SOCIAL_TWITTER || '',
            facebook: data.SOCIAL_FACEBOOK || '',
            youtube: data.SOCIAL_YOUTUBE || '',
            tiktok: data.SOCIAL_TIKTOK || '',
            soundcloud: data.SOCIAL_SOUNDCLOUD || ''
          });
          
          // لینک‌های فوتر
          if (data.FOOTER_COL1_LINKS) {
            try { setFooterCol1(JSON.parse(data.FOOTER_COL1_LINKS)); } catch (e) {}
          }
          if (data.FOOTER_COL2_LINKS) {
            try { setFooterCol2(JSON.parse(data.FOOTER_COL2_LINKS)); } catch (e) {}
          }
        }
      } catch (error) {
        console.error("خطا در دریافت اطلاعات:", error);
      }
    };
    fetchData();
  }, []);

  const handleRichChange = (name: string, value: string) => {
    setTexts(prev => ({ ...prev, [name]: value }));
    setSaved(false);
    setHasUnsavedChanges(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setTexts(prev => ({ ...prev, FOOTER_PHONE: val }));
    setPhoneError('');
    setHasUnsavedChanges(true);
    setSaved(false);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTexts(prev => ({ ...prev, FOOTER_EMAIL: val }));
    setEmailError('');
    setHasUnsavedChanges(true);
    setSaved(false);
  };

  const validatePhoneEmail = () => {
    let isValid = true;
    if (texts.FOOTER_PHONE && texts.FOOTER_PHONE.trim() !== '') {
      if (!/^[0-9]{10,15}$/.test(texts.FOOTER_PHONE)) {
        setPhoneError('شماره تماس باید شامل اعداد و حداقل 10 رقم باشد');
        isValid = false;
      }
    }
    if (texts.FOOTER_EMAIL && texts.FOOTER_EMAIL.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(texts.FOOTER_EMAIL)) {
        setEmailError('آدرس ایمیل معتبر نیست');
        isValid = false;
      }
    }
    return isValid;
  };

  const handleSocialChange = (platform: keyof typeof socialLinks, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
    setHasUnsavedChanges(true);
    setSaved(false);
  };

  // آپلود لوگو (بدون تغییر)
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setCropRect({ x: 0, y: 0, w: 0, h: 0 });
    }
  };

  const onCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const img = document.getElementById('crop-source-img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStartPos({ x, y });
    setCropRect({ x, y, w: 0, h: 0 });
    setIsDrawingCrop(true);
  };

  const onCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingCrop) return;
    const img = document.getElementById('crop-source-img') as HTMLImageElement;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    let curX = e.clientX - rect.left;
    let curY = e.clientY - rect.top;
    curX = Math.min(Math.max(curX, 0), rect.width);
    curY = Math.min(Math.max(curY, 0), rect.height);
    setCropRect({
      x: Math.min(curX, cropStartPos.x),
      y: Math.min(curY, cropStartPos.y),
      w: Math.abs(curX - cropStartPos.x),
      h: Math.abs(curY - cropStartPos.y)
    });
  };

  const onCropMouseUp = () => setIsDrawingCrop(false);

  const confirmCropAndUpload = async () => {
    if (!selectedLogoFile) return;
    setUploadingLogo(true);
    let uploadBlob: Blob = selectedLogoFile;
    if (cropRect.w > 10 && cropRect.h > 10) {
      const imgElem = document.getElementById('crop-source-img') as HTMLImageElement;
      if (imgElem) {
        const displayRect = imgElem.getBoundingClientRect();
        const scaleX = imgElem.naturalWidth / displayRect.width;
        const scaleY = imgElem.naturalHeight / displayRect.height;
        const canvas = document.createElement('canvas');
        canvas.width = cropRect.w * scaleX;
        canvas.height = cropRect.h * scaleY;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            imgElem,
            cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY,
            0, 0, canvas.width, canvas.height
          );
          uploadBlob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), selectedLogoFile.type, 0.9));
        }
      }
    }
    const fd = new FormData();
    fd.append('file', uploadBlob, selectedLogoFile.name);
    fd.append('type', 'settings');
    fd.append('customName', `footer-logo-${Date.now()}`);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        const url = data.url?.startsWith('http') ? data.url : `/${data.url}`;
        setTexts(prev => ({ ...prev, FOOTER_LOGO: url }));
        setHasUnsavedChanges(true);
        setSelectedLogoFile(null);
        setLogoPreview(null);
      } else {
        alert('خطا در آپلود تصویر در فضای ابری.');
      }
    } catch (e) {
      console.error(e);
      alert('خطای ارتباط با سرور.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const cancelLogoUpload = () => {
    setSelectedLogoFile(null);
    setLogoPreview(null);
  };

  const handleDeleteLogo = async () => {
    if (!texts.FOOTER_LOGO) return;
    if (!confirm('آیا از حذف این لوگو مطمئن هستید؟ تصویر از فضای ابری و پایگاه داده برای همیشه پاک خواهد شد.')) return;
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(texts.FOOTER_LOGO)}`, { method: 'DELETE' });
      setTexts(prev => ({ ...prev, FOOTER_LOGO: '' }));
      setHasUnsavedChanges(true);
      await fetch('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FOOTER_LOGO: '' })
      });
      alert('تصویر با موفقیت از سرور حذف شد.');
    } catch (e) {
      alert('خطا در حذف تصویر از سرور.');
    }
  };

  const addLink = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    setter(prev => [...prev, { id: Date.now(), text: '', url: '' }]);
    setSaved(false);
    setHasUnsavedChanges(true);
  };
  
  const updateLinkUrl = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: number, url: string) => {
    setter(prev => prev.map(item => item.id === id ? { ...item, url } : item));
    setSaved(false);
    setHasUnsavedChanges(true);
  };
  
  const updateLinkTextRich = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: number, text: string) => {
    setter(prev => prev.map(item => item.id === id ? { ...item, text } : item));
    setSaved(false);
    setHasUnsavedChanges(true);
  };

  const removeLink = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: number) => {
    setter(prev => prev.filter(item => item.id !== id));
    setSaved(false);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhoneEmail()) {
      alert('لطفاً اطلاعات شماره تماس و ایمیل را اصلاح کنید.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...texts,
        HOME_META_TITLE: metaTitle,
        HOME_META_DESCRIPTION: metaDescription,
        HOME_META_KEYWORDS: metaKeywords,
        SOCIAL_LINKEDIN: socialLinks.linkedin,
        SOCIAL_INSTAGRAM: socialLinks.instagram,
        SOCIAL_TELEGRAM: socialLinks.telegram,
        SOCIAL_WHATSAPP: socialLinks.whatsapp,
        SOCIAL_TWITTER: socialLinks.twitter,
        SOCIAL_FACEBOOK: socialLinks.facebook,
        SOCIAL_YOUTUBE: socialLinks.youtube,
        SOCIAL_TIKTOK: socialLinks.tiktok,
        SOCIAL_SOUNDCLOUD: socialLinks.soundcloud,
        FOOTER_COL1_LINKS: JSON.stringify(footerCol1),
        FOOTER_COL2_LINKS: JSON.stringify(footerCol2)
      };
      const res = await fetch('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
        setHasUnsavedChanges(false);
        alert('تغییرات با موفقیت ذخیره شد!');
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('خطا در ذخیره اطلاعات');
      }
    } catch (error) {
      alert('خطا در ذخیره اطلاعات');
    } finally {
      setSaving(false);
    }
  };

  const renderDynamicLinks = (titleLabel: string, titleKey: string, links: any[], setLinks: any) => (
    <div className="bg-white p-5 border border-gray-200 rounded-xl mb-6 shadow-sm">
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">{titleLabel}</label>
        <MiniRichEditor 
          singleLine 
          value={texts[titleKey as keyof typeof texts]} 
          onChange={(val) => handleRichChange(titleKey, val)} 
          placeholder="مثلا: دسترسی سریع" 
        />
      </div>
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700 border-t pt-4">لینک‌های این ستون</label>
        {links.map((link) => (
          <div key={link.id} className="flex flex-col xl:flex-row gap-3 items-start xl:items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex-1 w-full">
               <label className="text-xs text-gray-500 mb-1 block">متن نمایشی لینک:</label>
               <MiniRichEditor singleLine value={link.text} onChange={(val) => updateLinkTextRich(setLinks, link.id, val)} placeholder="عنوان لینک" />
            </div>
            <div className="flex-1 w-full flex flex-col xl:flex-row gap-3 items-end">
               <div className="flex-1 w-full">
                  <label className="text-xs text-gray-500 mb-1 block">آدرس اینترنتی (URL):</label>
                  <input type="text" dir="ltr" placeholder="https://" value={link.url} onChange={(e) => updateLinkUrl(setLinks, link.id, e.target.value)} className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 outline-none focus:border-green-500 text-left bg-white text-gray-900" />
               </div>
               <button type="button" onClick={() => removeLink(setLinks, link.id)} className="p-3 text-red-500 hover:bg-red-100 rounded-lg transition-colors border border-red-200 bg-white"><Trash2 size={20} /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addLink(setLinks)} className="flex items-center gap-2 text-sm text-green-700 font-bold mt-2 hover:bg-green-100 px-4 py-3 rounded-lg transition-colors w-max border border-green-200">
          <Plus size={18} /> افزودن لینک جدید به این لیست
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl"><Type className="text-green-600" size={28} /></div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">مدیریت محتوای متنی</h2>
              <p className="text-sm text-gray-500 mt-1">ویرایش متن‌ها، فوتر، سئو و شبکه‌های اجتماعی</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold bg-green-600 hover:bg-green-700 transition-all shadow-md disabled:bg-gray-400">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-white px-6 pt-4 overflow-x-auto custom-scrollbar">
          <button type="button" onClick={() => setActiveTab('about')} className={`flex items-center gap-2 pb-4 px-4 font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'about' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Info size={18} /> درباره ما
          </button>
          <button type="button" onClick={() => setActiveTab('footer')} className={`flex items-center gap-2 pb-4 px-4 font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'footer' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <PhoneCall size={18} /> فوتر
          </button>
          <button type="button" onClick={() => setActiveTab('seo')} className={`flex items-center gap-2 pb-4 px-4 font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'seo' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Search size={18} /> SEO
          </button>
          <button type="button" onClick={() => setActiveTab('social')} className={`flex items-center gap-2 pb-4 px-4 font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'social' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Share2 size={18} /> شبکه‌های اجتماعی
          </button>
        </div>

        <div className="p-6 md:p-8 bg-gray-50/30">
          <form onSubmit={handleSave} className="space-y-8">
            {/* تب درباره ما (بدون تغییر) */}
            {activeTab === 'about' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">متن اصلی درباره شرکت</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">تیتر بخش</label>
                      <MiniRichEditor singleLine value={texts.ABOUT_TITLE} onChange={(val) => handleRichChange('ABOUT_TITLE', val)} placeholder="مثلا: درباره خوش صنعت پایدار" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">متن توضیحات کامل</label>
                      <MiniRichEditor value={texts.ABOUT_DESC} onChange={(val) => handleRichChange('ABOUT_DESC', val)} placeholder="توضیحات سازمان..." />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">ویژگی‌های سه‌گانه</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-green-700 mb-4 bg-green-100 inline-block px-3 py-1 rounded-lg">ویژگی اول</h4>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">تیتر:</label><MiniRichEditor singleLine value={texts.FEATURE_1_TITLE} onChange={(val) => handleRichChange('FEATURE_1_TITLE', val)} /></div>
                      <div className="mt-3"><label className="text-xs font-bold text-gray-500 mb-1 block">توضیحات:</label><MiniRichEditor value={texts.FEATURE_1_DESC} onChange={(val) => handleRichChange('FEATURE_1_DESC', val)} /></div>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-green-700 mb-4 bg-green-100 inline-block px-3 py-1 rounded-lg">ویژگی دوم</h4>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">تیتر:</label><MiniRichEditor singleLine value={texts.FEATURE_2_TITLE} onChange={(val) => handleRichChange('FEATURE_2_TITLE', val)} /></div>
                      <div className="mt-3"><label className="text-xs font-bold text-gray-500 mb-1 block">توضیحات:</label><MiniRichEditor value={texts.FEATURE_2_DESC} onChange={(val) => handleRichChange('FEATURE_2_DESC', val)} /></div>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-green-700 mb-4 bg-green-100 inline-block px-3 py-1 rounded-lg">ویژگی سوم</h4>
                      <div><label className="text-xs font-bold text-gray-500 mb-1 block">تیتر:</label><MiniRichEditor singleLine value={texts.FEATURE_3_TITLE} onChange={(val) => handleRichChange('FEATURE_3_TITLE', val)} /></div>
                      <div className="mt-3"><label className="text-xs font-bold text-gray-500 mb-1 block">توضیحات:</label><MiniRichEditor value={texts.FEATURE_3_DESC} onChange={(val) => handleRichChange('FEATURE_3_DESC', val)} /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* تب فوتر (بدون تغییر در ساختار اصلی) */}
            {activeTab === 'footer' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">اطلاعات پایه فوتر</h3>
                  <div className="space-y-6">
                    {/* بخش لوگو */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                      <label className="block text-base font-bold text-gray-800 mb-2">لوگوی فوتر سایت</label>
                      <p className="text-sm text-gray-500 mb-6 leading-relaxed bg-white inline-block px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                        ابعاد پیشنهادی: <strong className="text-gray-800">۲۵۰×۱۰۰</strong> پیکسل
                      </p>
                      {logoPreview ? (
                        <div className="flex flex-col xl:flex-row items-center gap-8 p-6 border-2 border-blue-200 bg-blue-50/50 rounded-2xl">
                          <div className="w-full xl:w-2/3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4">
                            <div className="relative inline-block cursor-crosshair" onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove} onMouseUp={onCropMouseUp} onMouseLeave={onCropMouseUp}>
                              <img id="crop-source-img" src={logoPreview} alt="Preview" className="max-w-full max-h-[300px] object-contain pointer-events-none" draggable={false} />
                              {cropRect.w > 0 && cropRect.h > 0 && (
                                <div className="absolute border-2 border-green-500 bg-green-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }} />
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-4 w-full xl:w-1/3">
                            <button type="button" onClick={confirmCropAndUpload} disabled={uploadingLogo} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                              {uploadingLogo ? <Loader2 className="animate-spin" size={18} /> : <Crop size={18} />}
                              تایید و آپلود
                            </button>
                            <button type="button" onClick={cancelLogoUpload} className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-red-50">انصراف</button>
                          </div>
                        </div>
                      ) : texts.FOOTER_LOGO ? (
                        <div className="relative w-72 h-36 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center group">
                          <img src={texts.FOOTER_LOGO} alt="Footer Logo" className="max-w-full max-h-full object-contain p-4" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm">
                            <button type="button" onClick={handleDeleteLogo} className="bg-red-500 text-white px-5 py-3 rounded-xl flex items-center gap-2"><Trash2 size={18} /> حذف</button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full md:w-1/2 h-40 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer">
                          <div className="flex flex-col items-center text-gray-500 gap-3">
                            <div className="bg-gray-100 p-3 rounded-full"><UploadCloud size={28} /></div>
                            <span className="text-sm font-bold">انتخاب تصویر</span>
                          </div>
                          <input type="file" accept="image/png, image/jpeg" onChange={handleLogoFileSelect} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">متن معرفی کوتاه</label>
                      <MiniRichEditor value={texts.FOOTER_ABOUT} onChange={(val) => handleRichChange('FOOTER_ABOUT', val)} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">آدرس</label>
                        <MiniRichEditor value={texts.FOOTER_ADDRESS} onChange={(val) => handleRichChange('FOOTER_ADDRESS', val)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">شماره تماس</label>
                        <input type="tel" value={texts.FOOTER_PHONE} onChange={handlePhoneChange} className={`w-full px-4 py-3 text-sm rounded-lg border ${phoneError ? 'border-red-500' : 'border-gray-300'} focus:border-green-500 outline-none bg-white text-gray-900`} />
                        {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">ایمیل</label>
                        <input type="email" value={texts.FOOTER_EMAIL} onChange={handleEmailChange} className={`w-full px-4 py-3 text-sm rounded-lg border ${emailError ? 'border-red-500' : 'border-gray-300'} focus:border-green-500 outline-none bg-white text-gray-900`} />
                        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderDynamicLinks('تیتر ستون اول', 'FOOTER_COL1_TITLE', footerCol1, setFooterCol1)}
                  {renderDynamicLinks('تیتر ستون دوم', 'FOOTER_COL2_TITLE', footerCol2, setFooterCol2)}
                </div>
              </div>
            )}

            {/* تب SEO & متادیتا (اصلاح شده با text-gray-900) */}
            {activeTab === 'seo' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">تنظیمات سئوی صفحه اصلی</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">عنوان صفحه (Meta Title)</label>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900"
                        placeholder="مثال: شرکت خوش صنعت پایدار | تولیدکننده پیشرو"
                      />
                      <p className="text-xs text-gray-500 mt-1">بهترین طول: ۵۰-۶۰ کاراکتر</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">توضیحات متا (Meta Description)</label>
                      <textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900"
                        placeholder="توضیح مختصری از فعالیت شرکت، حداکثر ۱۵۰-۱۶۰ کاراکتر"
                      />
                      <p className="text-xs text-gray-500 mt-1">بین ۱۵۰ تا ۱۶۰ کاراکتر توصیه می‌شود</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">کلمات کلیدی (Meta Keywords)</label>
                      <input
                        type="text"
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900"
                        placeholder="کلمه کلیدی 1، کلمه کلیدی 2، ..."
                      />
                      <p className="text-xs text-gray-500 mt-1">با کاما جدا کنید</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* تب شبکه‌های اجتماعی (اصلاح شده با text-gray-900) */}
            {activeTab === 'social' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">لینک‌های شبکه‌های اجتماعی</h3>
                  <p className="text-sm text-gray-500 mb-6">آدرس کامل پروفایل خود را وارد کنید (مثال: https://instagram.com/username)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">لینکدین</label>
                      <input type="url" value={socialLinks.linkedin} onChange={(e) => handleSocialChange('linkedin', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://linkedin.com/company/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">اینستاگرام</label>
                      <input type="url" value={socialLinks.instagram} onChange={(e) => handleSocialChange('instagram', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://instagram.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">تلگرام</label>
                      <input type="url" value={socialLinks.telegram} onChange={(e) => handleSocialChange('telegram', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://t.me/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">واتساپ</label>
                      <input type="url" value={socialLinks.whatsapp} onChange={(e) => handleSocialChange('whatsapp', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://wa.me/123456789" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">توییتر / X</label>
                      <input type="url" value={socialLinks.twitter} onChange={(e) => handleSocialChange('twitter', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://twitter.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">فیسبوک</label>
                      <input type="url" value={socialLinks.facebook} onChange={(e) => handleSocialChange('facebook', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://facebook.com/..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">یوتیوب</label>
                      <input type="url" value={socialLinks.youtube} onChange={(e) => handleSocialChange('youtube', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://youtube.com/@..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">تیک‌تاک</label>
                      <input type="url" value={socialLinks.tiktok} onChange={(e) => handleSocialChange('tiktok', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://tiktok.com/@..." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">ساندکلاود</label>
                      <input type="url" value={socialLinks.soundcloud} onChange={(e) => handleSocialChange('soundcloud', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none bg-white text-gray-900" placeholder="https://soundcloud.com/..." />
                    </div>
                  </div>
                  <div className="mt-6 text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                    <LinkIcon size={14} className="inline ml-1" /> برای غیرفعال کردن، فیلد را خالی بگذارید.
                  </div>
                </div>
              </div>
            )}

            {/* دکمه ذخیره */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-gray-200 sticky bottom-4 z-10 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border">
              <button type="submit" disabled={saving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-white font-bold text-lg bg-green-600 hover:bg-green-700 transition-all shadow-md disabled:bg-gray-400">
                <Save size={24} />
                {saving ? 'لطفاً صبر کنید...' : 'ذخیره نهایی تمامی تغییرات'}
              </button>
              {saved && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-6 py-4 rounded-xl border border-green-200 animate-in zoom-in font-bold shadow-sm">
                  <CheckCircle size={24} />
                  <span>تغییرات با موفقیت ثبت شد!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}