'use client';

import { useState, useRef, useEffect } from 'react';
import { X, FileText, CheckCircle2, Loader2, UploadCloud, Trash2, Image as ImageIcon, Eye, Printer, Download, Share2 } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import { JalaaliDateTimePicker } from 'jalaali-date-time-picker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  submitting: boolean;
}

export function CreateInvoiceModal({ isOpen, onClose, onSubmit, submitting }: Props) {
  const { showAlert } = useModal();
  const [form, setForm] = useState({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '', attachmentUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const hasSubmitted = useRef(false);

  // حذف خودکار فایل در صورت بسته شدن مودال بدون ذخیره
  useEffect(() => {
    if (!isOpen) {
      if (form.attachmentUrl && !hasSubmitted.current) {
        deleteFileFromCloud(form.attachmentUrl);
      }
      hasSubmitted.current = false;
    }
  }, [isOpen, form.attachmentUrl]);

  const deleteFileFromCloud = async (url: string) => {
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.error('خطا در حذف فایل:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      showAlert('مبلغ فاکتور باید بزرگتر از صفر باشد.', 'خطا در اعتبارسنجی', 'error');
      return;
    }
    hasSubmitted.current = true;
    await onSubmit(form);
    setForm({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '', attachmentUrl: '' });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'general');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, attachmentUrl: data.url }));
      } else {
        showAlert('خطا در آپلود فایل. مجدد تلاش کنید.', 'خطا', 'error');
      }
    } catch (err) {
      showAlert('خطا در اتصال به سرور. لطفاً دوباره امتحان کنید.', 'خطای شبکه', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!form.attachmentUrl) return;
    const confirmed = window.confirm('آیا از حذف این فایل اطمینان دارید؟');
    if (!confirmed) return;
    await deleteFileFromCloud(form.attachmentUrl);
    setForm(prev => ({ ...prev, attachmentUrl: '' }));
  };

  // ---- توابع کمکی برای فایل ----
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  const handlePrint = (url: string) => {
    if (isImage(url)) {
      // چاپ تصویر در پنجره جدید
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        showAlert('پاپ‌آپ مسدود شده است. لطفاً اجازه دهید.', 'خطا', 'error');
        return;
      }
      printWindow.document.write(`
        <html>
          <head><title>چاپ تصویر</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
            <img src="${url}" style="max-width:100%; max-height:100%;" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else if (isPdf(url)) {
      // PDF را در تب جدید باز می‌کنیم (بیننده پیش‌فرض دارای دکمه چاپ است)
      window.open(url, '_blank');
    } else {
      showAlert('چاپ برای این نوع فایل پشتیبانی نمی‌شود.', 'اطلاعات', 'info');
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('خطا در دریافت فایل');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showAlert('دانلود فایل با مشکل مواجه شد.', 'خطا', 'error');
    }
  };

  const handleShare = async (url: string) => {
    const shareData = {
      title: 'فایل پیوست فاکتور',
      text: 'لطفاً فایل پیوست شده را مشاهده کنید.',
      url: url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showAlert('اشتراک‌گذاری لغو شد یا با خطا مواجه گردید.', 'خطا', 'error');
        }
      }
    } else {
      // Fallback: کپی لینک در کلیپ‌بورد
      await navigator.clipboard.writeText(url);
      showAlert('لینک فایل در کلیپ‌بورد کپی شد.', 'موفق', 'success');
    }
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setForm(prev => ({ ...prev, dueDate: `${year}-${month}-${day}` }));
    } else {
      setForm(prev => ({ ...prev, dueDate: '' }));
    }
  };

  const getInitialDate = (): Date | undefined => {
    if (form.dueDate) {
      const [year, month, day] = form.dueDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-800">ایجاد فاکتور جدید</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ پایه (تومان) *</label>
            <input 
              type="number" min="0" onKeyDown={blockInvalidChars}
              value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} 
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold" required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">تخفیف (تومان)</label>
              <input type="number" min="0" onKeyDown={blockInvalidChars} value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">مالیات (تومان)</label>
              <input type="number" min="0" onKeyDown={blockInvalidChars} value={form.tax || ''} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* تقویم شمسی */}
          <div dir="rtl">
            <label className="block text-sm font-bold text-gray-700 mb-1">تاریخ سررسید (شمسی)</label>
            <JalaaliDateTimePicker
              value={getInitialDate()}
              onChange={handleDateChange}
              placeholder="انتخاب تاریخ"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* بخش پیوست با دکمه‌های جدید */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">اسکن فاکتور فیزیکی (اختیاری)</label>
            {form.attachmentUrl ? (
              <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isImage(form.attachmentUrl) ? (
                      <div 
                        className="relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center"
                        onClick={() => setPreviewImage(form.attachmentUrl)}
                      >
                        <img 
                          src={form.attachmentUrl} 
                          alt="پیش‌نمایش" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      </div>
                    ) : isPdf(form.attachmentUrl) ? (
                      <FileText size={28} className="text-red-500" />
                    ) : (
                      <FileText size={28} className="text-gray-500" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {isImage(form.attachmentUrl) ? (
                        <button 
                          type="button" 
                          onClick={() => setPreviewImage(form.attachmentUrl)}
                          className="text-sm font-bold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <Eye size={16} /> مشاهده عکس
                        </button>
                      ) : (
                        <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 hover:underline truncate block">
                          {form.attachmentUrl.split('/').pop() || 'مشاهده فایل'}
                        </a>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemoveAttachment} 
                    className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* دکمه‌های عملیات روی فایل */}
                <div className="flex gap-2 justify-end border-t border-blue-200 pt-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handlePrint(form.attachmentUrl)}
                    className="flex items-center gap-1 text-gray-700 bg-white hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition"
                    title="چاپ"
                  >
                    <Printer size={16} /> چاپ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(form.attachmentUrl)}
                    className="flex items-center gap-1 text-gray-700 bg-white hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition"
                    title="دانلود"
                  >
                    <Download size={16} /> دانلود
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(form.attachmentUrl)}
                    className="flex items-center gap-1 text-gray-700 bg-white hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition"
                    title="اشتراک‌گذاری"
                  >
                    <Share2 size={16} /> اشتراک
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition">
                {isUploading ? <Loader2 className="animate-spin text-blue-500 mb-2" size={24} /> : <UploadCloud className="text-gray-400 mb-2" size={28} />}
                <span className="text-xs font-bold text-gray-600 text-center">{isUploading ? 'در حال آپلود...' : 'برای گرفتن عکس یا انتخاب فایل کلیک کنید'}</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات فاکتور</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-gray-50 mt-4 pb-2">
            <button type="submit" disabled={submitting || isUploading} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              {submitting ? 'در حال صدور...' : 'صدور فاکتور'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
              انصراف
            </button>
          </div>
        </form>
      </div>

      {/* مودال بزرگنمایی تصویر */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl overflow-hidden">
            <img src={previewImage} alt="پیش‌نمایش بزرگ" className="max-w-full max-h-[90vh] object-contain" />
            <button 
              onClick={() => setPreviewImage(null)} 
              className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}