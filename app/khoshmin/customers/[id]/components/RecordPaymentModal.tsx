'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Banknote, Loader2, CheckCircle2, UploadCloud, FileText, Trash2, Printer, Download, Share2, Image as ImageIcon, Eye } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  invoices: any[];
  submitting: boolean;
}

export function RecordPaymentModal({ isOpen, onClose, onSubmit, invoices, submitting }: Props) {
  const { showAlert, showConfirm } = useModal();
  const [form, setForm] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    receiptNo: '',
    description: '',
    invoiceId: '',
    attachmentUrl: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const originalFormRef = useRef(form);

  // توابع کمکی برای تشخیص نوع فایل
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  // حذف فایل از سرور (با استفاده از DELETE و body)
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

  // حذف فایل‌های موقتی (هنگام بستن مودال بدون ذخیره)
  const deleteTempFiles = async () => {
    for (const url of tempUploadedUrls) {
      await deleteFileFromCloud(url);
    }
    setTempUploadedUrls([]);
  };

  // ذخیره نسخه اولیه فرم هنگام باز شدن مودال
  useEffect(() => {
    if (isOpen) {
      originalFormRef.current = { ...form };
      setTempUploadedUrls([]);
      setPreviewImage(null);
    }
  }, [isOpen]);

  const hasChanges = () => {
    return JSON.stringify(form) !== JSON.stringify(originalFormRef.current);
  };

  const handleClose = () => {
    if (hasChanges()) {
      showConfirm({
        title: 'خروج بدون ذخیره',
        message: 'تغییرات شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: async () => {
          await deleteTempFiles();
          setForm({
            amount: 0,
            paymentMethod: 'CASH',
            receiptNo: '',
            description: '',
            invoiceId: '',
            attachmentUrl: '',
          });
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      showAlert('مبلغ را به درستی وارد کنید.', 'خطا', 'error');
      return;
    }
    await onSubmit(form);
    // پس از ذخیره موفق، فایل‌های موقتی را پاک می‌کنیم (چون به دیتابیس متصل شده‌اند)
    setTempUploadedUrls([]);
    setForm({
      amount: 0,
      paymentMethod: 'CASH',
      receiptNo: '',
      description: '',
      invoiceId: '',
      attachmentUrl: '',
    });
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
        setForm((prev) => ({ ...prev, attachmentUrl: data.url }));
        setTempUploadedUrls((prev) => [...prev, data.url]);
      } else {
        showAlert('خطا در آپلود فایل. لطفاً مجدد تلاش کنید.', 'خطا', 'error');
      }
    } catch (err) {
      showAlert('خطا در ارتباط با سرور هنگام آپلود', 'خطا', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async () => {
    const url = form.attachmentUrl;
    if (!url) return;

    showConfirm({
      title: 'حذف فایل',
      message: 'آیا از حذف این فایل اطمینان دارید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        // اگر فایل در لیست موقتی وجود دارد، از سرور حذفش کن
        if (tempUploadedUrls.includes(url)) {
          await deleteFileFromCloud(url);
          setTempUploadedUrls((prev) => prev.filter((u) => u !== url));
        }
        setForm((prev) => ({ ...prev, attachmentUrl: '' }));
        showAlert('فایل با موفقیت حذف شد', 'موفقیت', 'success');
      },
    });
  };

  // چاپ فایل
  const handlePrint = (url: string) => {
    if (isImage(url)) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        showAlert('پاپ‌آپ مسدود شده است. لطفاً اجازه دهید.', 'خطا', 'error');
        return;
      }
      printWindow.document.write(`
        <html><head><title>چاپ تصویر</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
          <img src="${url}" style="max-width:100%;max-height:100%;" />
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      showAlert('چاپ برای این نوع فایل پشتیبانی نمی‌شود', 'اطلاعات', 'info');
    }
  };

  // دانلود فایل
  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showAlert('دانلود فایل با مشکل مواجه شد', 'خطا', 'error');
    }
  };

  // اشتراک‌گذاری فایل
  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'مدرک پیوست', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showAlert('اشتراک‌گذاری لغو شد یا با خطا مواجه گردید.', 'خطا', 'error');
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      showAlert('لینک فایل در کلیپ‌بورد کپی شد.', 'موفق', 'success');
    }
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Banknote size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-800">ثبت پرداخت جدید</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ (تومان) *</label>
            <input
              type="number"
              min="0"
              onKeyDown={blockInvalidChars}
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">روش پرداخت</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CASH">نقدی</option>
                <option value="CARD">کارت خوان</option>
                <option value="TRANSFER">انتقال بانکی</option>
                <option value="CHECK">چک</option>
                <option value="OTHER">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">شماره رسید</label>
              <input
                type="text"
                value={form.receiptNo}
                onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">فاکتور مرتبط (اختیاری)</label>
            <select
              value={form.invoiceId}
              onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">پرداخت آزاد (بدون فاکتور)</option>
              {invoices
                .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    فاکتور {inv.invoiceNo} - {inv.finalAmount.toLocaleString()} تومان
                  </option>
                ))}
            </select>
          </div>

          {/* بخش آپلود فیش/مستندات با قابلیت پیش‌نمایش و عملیات */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">مستندات (عکس فیش / PDF)</label>
            {form.attachmentUrl ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* پیش‌نمایش تصویر یا آیکون سند */}
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
                          className="text-sm font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Eye size={16} /> مشاهده عکس
                        </button>
                      ) : (
                        <a
                          href={form.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-emerald-700 hover:underline truncate block"
                        >
                          {form.attachmentUrl.split('/').pop() || 'مشاهده فایل'}
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition"
                    title="حذف فایل"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* دکمه‌های عملیات روی فایل */}
                <div className="flex gap-2 justify-end border-t border-emerald-200 pt-2 mt-2">
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
                {isUploading ? (
                  <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                ) : (
                  <UploadCloud className="text-gray-400 mb-2" size={28} />
                )}
                <span className="text-xs font-bold text-gray-600 text-center">
                  {isUploading ? 'در حال آپلود...' : 'برای گرفتن عکس یا انتخاب فایل کلیک کنید'}
                </span>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-gray-50 mt-4 pb-2">
            <button
              type="submit"
              disabled={submitting || isUploading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/30"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              {submitting ? 'در حال ثبت...' : 'ثبت پرداخت'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
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