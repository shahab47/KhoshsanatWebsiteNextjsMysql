//MultiFileUpload
'use client';

import React, { useState } from 'react';
import { UploadCloud, Loader2, FileText, Trash2 } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface MultiFileUploadProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  title?: string;
}

export default function MultiFileUpload({ urls, onChange, title = "مستندات و فایل‌های ضمیمه" }: MultiFileUploadProps) {
  const { showAlert } = useModal();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...urls];

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      fd.append('type', 'general');

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          showAlert(`خطا در آپلود فایل ${files[i].name}`, 'خطا', 'error');
        }
      } catch (err) {
        showAlert('خطا در ارتباط با سرور هنگام آپلود فایل', 'خطای شبکه', 'error');
      }
    }

    onChange(newUrls);
    setIsUploading(false);
    // ریست کردن اینپوت برای امکان انتخاب مجدد همان فایل‌ها
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    const newUrls = urls.filter((_, index) => index !== indexToRemove);
    onChange(newUrls);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-bold text-gray-700 mb-2">{title}</label>
      
      {/* نمایش لیست فایل‌های آپلود شده */}
      {urls.length > 0 && (
        <div className="space-y-2 mb-3">
          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <a href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 hover:underline line-clamp-1" dir="ltr">
                  فایل ضمیمه {idx + 1}
                </a>
              </div>
              <button 
                type="button" 
                onClick={() => removeFile(idx)} 
                className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition"
                title="حذف فایل"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* دکمه آپلود */}
      <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {isUploading ? <Loader2 className="animate-spin text-blue-500 mb-2" size={24} /> : <UploadCloud className="text-gray-400 mb-2" size={24} />}
        <span className="text-xs font-bold text-gray-600 text-center">
          {isUploading ? 'در حال آپلود...' : 'برای افزودن یک یا چند فایل کلیک کنید'}
        </span>
        <input 
          type="file" 
          multiple 
          accept="image/*,application/pdf" 
          onChange={handleFileUpload} 
          className="hidden" 
          disabled={isUploading} 
        />
      </label>
    </div>
  );
}