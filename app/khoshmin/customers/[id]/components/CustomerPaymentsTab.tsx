'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, Banknote, FileText, Loader2, Paperclip, CheckCircle2, UploadCloud, Printer, Download, Share2, Image as ImageIcon, Eye, FileCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

// ==========================================
// کامپوننت آپلود چندگانه با قابلیت چاپ، دانلود، اشتراک و حذف تأییددار
// ==========================================
function MultiFileUpload({ urls, onChange, title = "مستندات و فایل‌های ضمیمه", onUploadStart, onUploadComplete }: { 
  urls: string[], 
  onChange: (urls: string[]) => void, 
  title?: string,
  onUploadStart?: () => void,
  onUploadComplete?: () => void
}) {
  const { showAlert, showConfirm } = useModal();
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    onUploadStart?.();
    const newUrls = [...urls];

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      fd.append('type', 'payments');

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        } else {
          showAlert(`خطا در آپلود فایل ${files[i].name}`, 'خطا', 'error');
        }
      } catch (err) {
        showAlert('خطا در ارتباط با سرور هنگام آپلود', 'خطا', 'error');
      }
    }

    onChange(newUrls);
    setIsUploading(false);
    onUploadComplete?.();
    e.target.value = '';
  };

  const handleDelete = async (url: string) => {
    showConfirm({
      title: 'حذف فایل',
      message: 'آیا از حذف این فایل اطمینان دارید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
          onChange(urls.filter(u => u !== url));
          showAlert('فایل با موفقیت حذف شد', 'موفقیت', 'success');
        } catch {
          showAlert('خطا در حذف فایل', 'خطا', 'error');
        }
      }
    });
  };

  const handlePrint = (url: string) => {
    if (isImage(url)) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) { showAlert('پاپ‌آپ مسدود شده است', 'خطا', 'error'); return; }
      printWindow.document.write(`<html><head><title>چاپ تصویر</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${url}" style="max-width:100%;max-height:100%;" /></body></html>`);
      printWindow.document.close();
      printWindow.print();
    } else if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      showAlert('چاپ برای این نوع فایل پشتیبانی نمی‌شود', 'اطلاعات', 'info');
    }
  };

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

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'مدرک پیوست', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') showAlert('اشتراک‌گذاری لغو شد', 'خطا', 'error');
      }
    } else {
      await navigator.clipboard.writeText(url);
      showAlert('لینک فایل در کلیپ‌بورد کپی شد', 'موفق', 'success');
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-bold text-gray-700 mb-2">{title}</label>
      
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {urls.map((url, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-2 w-36 relative group">
              <div className="flex flex-col items-center">
                {isImage(url) ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center" onClick={() => setPreviewImage(url)}>
                    <img src={url} alt="پیش‌نمایش" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : isPdf(url) ? (
                  <FileText size={40} className="text-red-500" />
                ) : (
                  <FileText size={40} className="text-gray-500" />
                )}
                <div className="flex gap-1 mt-2">
                  <button type="button" onClick={() => handlePrint(url)} className="p-1 hover:bg-gray-100 rounded" title="چاپ"><Printer size={14} /></button>
                  <button type="button" onClick={() => handleDownload(url)} className="p-1 hover:bg-gray-100 rounded" title="دانلود"><Download size={14} /></button>
                  <button type="button" onClick={() => handleShare(url)} className="p-1 hover:bg-gray-100 rounded" title="اشتراک"><Share2 size={14} /></button>
                  <button type="button" onClick={() => handleDelete(url)} className="p-1 hover:bg-red-100 text-red-500 rounded" title="حذف"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {isUploading ? <Loader2 className="animate-spin text-blue-500 mb-2" size={24} /> : <UploadCloud className="text-gray-400 mb-2" size={24} />}
        <span className="text-xs font-bold text-gray-600 text-center">
          {isUploading ? 'در حال آپلود...' : 'برای افزودن یک یا چند فایل کلیک کنید'}
        </span>
        <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
      </label>

      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl overflow-hidden">
            <img src={previewImage} alt="پیش‌نمایش بزرگ" className="max-w-full max-h-[90vh] object-contain" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// تابع تبدیل ساختارهای قدیمی و جدید لینک‌ها به آرایه
const parseUrls = (val?: string | null): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [val];
};

// حذف فایل‌ها از فضای ابری
const deleteFilesFromCloud = async (urls: string[]) => {
  for (const url of urls) {
    try {
      await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    } catch (err) {}
  }
};

// ==========================================
// کامپوننت داخلی مودال ثبت پرداخت
// ==========================================
interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  invoices: any[];
  submitting: boolean;
}

function RecordPaymentModal({ isOpen, onClose, onSubmit, invoices, submitting }: RecordPaymentModalProps) {
  const { showAlert, showConfirm } = useModal();
  const [form, setForm] = useState<{
    amount: number;
    paymentMethod: string;
    receiptNo: string;
    description: string;
    invoiceId: string;
    attachmentUrls: string[];
    sayadId: string;
    chequeNumber: string;
    dueDate: string;
    bankName: string;
    bankBranch: string;
    drawerName: string;
    drawerNationalId: string;
  }>({ 
    amount: 0, 
    paymentMethod: 'CASH', 
    receiptNo: '', 
    description: '', 
    invoiceId: '', 
    attachmentUrls: [],
    sayadId: '',
    chequeNumber: '',
    dueDate: '',
    bankName: '',
    bankBranch: '',
    drawerName: '',
    drawerNationalId: '',
  });
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);
  const originalFormRef = useRef(form);

  // ذخیره نسخه اولیه فرم برای تشخیص تغییر
  useEffect(() => {
    if (isOpen) {
      originalFormRef.current = { ...form };
      setTempUploadedUrls([]);
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
          // حذف فایل‌های موقتی آپلود شده
          await deleteFilesFromCloud(tempUploadedUrls);
          setForm({
            amount: 0,
            paymentMethod: 'CASH',
            receiptNo: '',
            description: '',
            invoiceId: '',
            attachmentUrls: [],
            sayadId: '',
            chequeNumber: '',
            dueDate: '',
            bankName: '',
            bankBranch: '',
            drawerName: '',
            drawerNationalId: '',
          });
          setTempUploadedUrls([]);
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

    if (form.paymentMethod === 'CHECK') {
      if (!form.sayadId || !/^\d{16}$/.test(form.sayadId.trim())) {
        showAlert('شناسه صیاد باید دقیقاً ۱۶ رقم عددی باشد.', 'خطا', 'error');
        return;
      }
      if (!form.chequeNumber.trim()) {
        showAlert('لطفاً شماره چک (سریال) را وارد کنید.', 'خطا', 'error');
        return;
      }
      if (!form.dueDate) {
        showAlert('لطفاً تاریخ سررسید چک را وارد کنید.', 'خطا', 'error');
        return;
      }
      if (!form.bankName) {
        showAlert('لطفاً بانک صادرکننده چک را انتخاب کنید.', 'خطا', 'error');
        return;
      }
      if (!form.drawerName.trim()) {
        showAlert('لطفاً نام صاحب حساب چک را وارد کنید.', 'خطا', 'error');
        return;
      }
    }
    
    const submitData = {
      ...form,
      attachmentUrl: form.attachmentUrls.length > 0 ? JSON.stringify(form.attachmentUrls) : null,
      cheque: form.paymentMethod === 'CHECK' ? {
        sayadId: form.sayadId.trim(),
        chequeNumber: form.chequeNumber.trim(),
        dueDate: form.dueDate,
        bankName: form.bankName,
        bankBranch: form.bankBranch.trim() || null,
        drawerName: form.drawerName.trim(),
        drawerNationalId: form.drawerNationalId.trim() || null,
      } : undefined
    };

    await onSubmit(submitData);
    // پس از ذخیره، فایل‌های موقتی دیگر نیازی به حذف ندارند
    setTempUploadedUrls([]);
    setForm({
      amount: 0,
      paymentMethod: 'CASH',
      receiptNo: '',
      description: '',
      invoiceId: '',
      attachmentUrls: [],
      sayadId: '',
      chequeNumber: '',
      dueDate: '',
      bankName: '',
      bankBranch: '',
      drawerName: '',
      drawerNationalId: '',
    });
    onClose();
  };

  const handleAttachmentChange = (newUrls: string[]) => {
    const addedUrls = newUrls.filter(url => !form.attachmentUrls.includes(url));
    setTempUploadedUrls(prev => [...prev, ...addedUrls]);
    setForm(prev => ({ ...prev, attachmentUrls: newUrls }));
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Banknote size={24} /></div>
            <h3 className="text-xl font-black text-gray-800">ثبت پرداخت جدید</h3>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ (تومان) *</label>
            <input type="number" min="0" onKeyDown={blockInvalidChars} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">روش پرداخت</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="CASH">نقدی</option>
                <option value="CARD">کارت خوان</option>
                <option value="TRANSFER">انتقال بانکی</option>
                <option value="CHECK">چک صیادی</option>
                <option value="OTHER">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">شماره رسید / پیگیری</label>
              <input type="text" value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          {/* فیلدهای چک صیادی در صورت انتخاب روش پرداخت چک */}
          {form.paymentMethod === 'CHECK' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-amber-200/60 pb-2">
                <FileCheck size={18} className="text-amber-600" />
                <span>مشخصات چک صیادی (سامانه پیچک / بانک مرکزی)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">شناسه ۱۶ رقمی صیاد *</label>
                  <input
                    type="text"
                    maxLength={16}
                    dir="ltr"
                    placeholder="1234567890123456"
                    value={form.sayadId}
                    onChange={(e) => setForm({ ...form, sayadId: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 border border-amber-300 rounded-xl bg-white text-gray-900 font-mono tracking-widest text-center text-sm outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    {form.sayadId.length}/16 رقم وارد شده
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">شماره چک (سریال) *</label>
                  <input
                    type="text"
                    placeholder="مثال: 123456/78"
                    value={form.chequeNumber}
                    onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">سررسید چک *</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">بانک صادرکننده *</label>
                  <select
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">انتخاب بانک...</option>
                    <option value="بانک ملت">بانک ملت</option>
                    <option value="بانک ملی ایران">بانک ملی ایران</option>
                    <option value="بانک صادرات ایران">بانک صادرات ایران</option>
                    <option value="بانک تجارت">بانک تجارت</option>
                    <option value="بانک سپه">بانک سپه</option>
                    <option value="بانک پاسارگاد">بانک پاسارگاد</option>
                    <option value="بانک سامان">بانک سامان</option>
                    <option value="بانک پارسیان">بانک پارسیان</option>
                    <option value="بانک آینده">بانک آینده</option>
                    <option value="بانک کشاورزی">بانک کشاورزی</option>
                    <option value="بانک مسکن">بانک مسکن</option>
                    <option value="بانک شهر">بانک شهر</option>
                    <option value="بانک رفاه کارگران">بانک رفاه کارگران</option>
                    <option value="سایر بانک‌ها">سایر بانک‌ها</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">شعبه بانک (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: شعبه بازار آهن"
                    value={form.bankBranch}
                    onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">صاحب حساب / صادرکننده *</label>
                  <input
                    type="text"
                    placeholder="نام شخص یا شرکت صادرکننده"
                    value={form.drawerName}
                    onChange={(e) => setForm({ ...form, drawerName: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">کد ملی / شناسه ملی صادرکننده</label>
                  <input
                    type="text"
                    maxLength={11}
                    dir="ltr"
                    placeholder="۱۰ یا ۱۱ رقم"
                    value={form.drawerNationalId}
                    onChange={(e) => setForm({ ...form, drawerNationalId: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">فاکتور مرتبط (اختیاری)</label>
            <select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">پرداخت آزاد (بدون فاکتور)</option>
              {invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').map((inv) => (
                <option key={inv.id} value={inv.id}>فاکتور {inv.invoiceNo} - {inv.finalAmount.toLocaleString()} تومان</option>
              ))}
            </select>
          </div>

          <MultiFileUpload 
            urls={form.attachmentUrls} 
            onChange={handleAttachmentChange} 
            title="مستندات (عکس فیش‌ها و چک)" 
          />

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-gray-50 mt-4 pb-2">
            <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
              <CheckCircle2 size={20} /> ثبت پرداخت
            </button>
            <button type="button" onClick={handleClose} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// کامپوننت اصلی مدیریت پرداختی‌ها
// ==========================================
interface ChequeItem {
  id: number;
  sayadId: string;
  chequeNumber: string;
  dueDate: string;
  issueDate?: string;
  status: string;
  bankName: string;
  bankBranch?: string | null;
  drawerName: string;
  drawerNationalId?: string | null;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string | null;
  description: string | null;
  attachmentUrl?: string | null; 
  invoice?: { id: number; invoiceNo: string } | null;
  invoiceId?: string | number | null;
  journalVoucherId?: number | null;
  cheques?: ChequeItem[];
}

interface CustomerPaymentsTabProps {
  customerId: string;
  onUpdate?: () => void;
}

export function CustomerPaymentsTab({ customerId, onUpdate }: CustomerPaymentsTabProps) {
  const { showAlert, showConfirm } = useModal();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [editForm, setEditForm] = useState<{
    amount: number; paymentMethod: string; receiptNo: string; description: string; invoiceId: string; attachmentUrls: string[];
  }>({ amount: 0, paymentMethod: '', receiptNo: '', description: '', invoiceId: '', attachmentUrls: [] });
  
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [editTempUploadedUrls, setEditTempUploadedUrls] = useState<string[]>([]);
  const originalEditFormRef = useRef(editForm);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/payments`);
      if (!res.ok) throw new Error('خطا در دریافت پرداخت‌ها');
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      showAlert('خطا در دریافت لیست پرداخت‌ها', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/invoices`);
      if (!res.ok) throw new Error('خطا در دریافت فاکتورها');
      const data = await res.json();
      setAvailableInvoices(data);
    } catch (error) {
      showAlert('خطا در دریافت فاکتورها', 'خطا', 'error');
    }
  };

  useEffect(() => { fetchPayments(); fetchInvoices(); }, [customerId]);

  const createPayment = async (data: any) => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
        await fetchPayments(); await fetchInvoices();
        onUpdate?.();
        showAlert('پرداخت با موفقیت ثبت شد ✅', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در ثبت پرداخت', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    }
  };

  const updatePayment = async (id: number, data: Partial<Payment>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/payments?paymentId=${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
        await fetchPayments(); await fetchInvoices(); 
        setEditingId(null);
        onUpdate?.(); 
        showAlert('پرداخت با موفقیت به‌روزرسانی شد', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در به‌روزرسانی پرداخت', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePayment = async (id: number) => {
    showConfirm({
      title: 'حذف پرداخت',
      message: 'آیا از حذف این پرداخت اطمینان دارید؟ این عمل غیر قابل بازگشت است.',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/payments?paymentId=${id}`, { method: 'DELETE' });
          if (res.ok) { 
            await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
            await fetchPayments(); await fetchInvoices(); 
            onUpdate?.();
            showAlert('پرداخت با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در حذف پرداخت', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      }
    });
  };

  const handleEditStart = (p: Payment) => {
    const initialForm = {
      amount: p.amount, paymentMethod: p.paymentMethod, receiptNo: p.receiptNo || '',
      description: p.description || '', invoiceId: p.invoice?.id ? String(p.invoice.id) : '',
      attachmentUrls: parseUrls(p.attachmentUrl)
    };
    setEditForm(initialForm);
    originalEditFormRef.current = initialForm;
    setEditTempUploadedUrls([]);
    setEditingId(p.id);
  };

  const handleEditCancel = async () => {
    if (JSON.stringify(editForm) !== JSON.stringify(originalEditFormRef.current)) {
      showConfirm({
        title: 'انصراف از ویرایش',
        message: 'تغییرات شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: async () => {
          await deleteFilesFromCloud(editTempUploadedUrls);
          setEditingId(null);
        },
      });
    } else {
      setEditingId(null);
    }
  };

  const handleEditSave = async (id: number) => {
    if (editForm.amount <= 0) {
      showAlert('مبلغ باید بیشتر از صفر باشد', 'خطا', 'error');
      return;
    }
    await updatePayment(id, {
      amount: editForm.amount, paymentMethod: editForm.paymentMethod, receiptNo: editForm.receiptNo,
      description: editForm.description, invoiceId: editForm.invoiceId ? parseInt(editForm.invoiceId) : null,
      attachmentUrl: editForm.attachmentUrls.length > 0 ? JSON.stringify(editForm.attachmentUrls) : null
    });
    // پس از ذخیره، فایل‌های موقتی پاک می‌شوند
    setEditTempUploadedUrls([]);
  };

  const handleEditAttachmentChange = (newUrls: string[]) => {
    const addedUrls = newUrls.filter(url => !editForm.attachmentUrls.includes(url));
    setEditTempUploadedUrls(prev => [...prev, ...addedUrls]);
    setEditForm(prev => ({ ...prev, attachmentUrls: newUrls }));
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH': return 'نقدی';
      case 'CHECK': return 'چک صیادی';
      case 'CARD': return 'کارت‌خوان';
      case 'TRANSFER': return 'انتقال بانکی';
      default: return method;
    }
  };

  const getChequeStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return { label: 'نزد صندوق (دریافت شده)', color: 'bg-amber-100 text-amber-850 border-amber-300' };
      case 'DEPOSITED':
        return { label: 'در جریان وصول (واگذار به بانک)', color: 'bg-blue-100 text-blue-850 border-blue-300' };
      case 'CLEARED':
        return { label: 'وصول شده', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'BOUNCED':
        return { label: 'برگشت‌خورده ⚠️', color: 'bg-red-100 text-red-800 border-red-300' };
      case 'TRANSFERRED':
        return { label: 'واگذار به غیر (خرج شده)', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  // توابع کمکی برای نمایش فایل‌ها در حالت عادی
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  const handlePrint = (url: string) => {
    if (isImage(url)) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) { showAlert('پاپ‌آپ مسدود شده است', 'خطا', 'error'); return; }
      printWindow.document.write(`<html><head><title>چاپ تصویر</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${url}" style="max-width:100%;max-height:100%;" /></body></html>`);
      printWindow.document.close();
      printWindow.print();
    } else if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      showAlert('چاپ برای این نوع فایل پشتیبانی نمی‌شود', 'اطلاعات', 'info');
    }
  };

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

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'مدرک پیوست', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') showAlert('اشتراک‌گذاری لغو شد', 'خطا', 'error');
      }
    } else {
      await navigator.clipboard.writeText(url);
      showAlert('لینک فایل در کلیپ‌بورد کپی شد', 'موفق', 'success');
    }
  };

  if (loading) return <div className="text-center py-8 text-black font-bold">در حال دریافت تراکنش‌ها...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm font-black">
          <Plus size={20} /> ثبت پرداخت جدید
        </button>
      </div>

      <RecordPaymentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={createPayment} invoices={availableInvoices} submitting={false} />

      {payments.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Banknote size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold">هیچ پرداختی برای این مشتری ثبت نشده است.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => {
            const documentUrls = parseUrls(p.attachmentUrl);
            return (
              <div key={p.id} className="border border-gray-100 rounded-3xl p-6 hover:shadow-xl transition-all duration-300 bg-white border-r-8 border-r-emerald-500">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {editingId !== p.id && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Banknote size={28} /></div>
                          <div>
                            <span className="text-3xl font-black text-emerald-600">{p.amount ? p.amount.toLocaleString('fa-IR') : '0'}</span>
                            <span className="text-sm font-bold text-gray-500 mr-2 uppercase">تومان</span>
                          </div>
                          {p.journalVoucherId && (
                            <span className="mr-auto bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg font-mono border border-gray-200">
                              سند حسابداری #{p.journalVoucherId}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm text-gray-600 pr-3 border-r-2 border-emerald-100">
                          <p>تاریخ پرداخت: <strong className="text-gray-800 font-bold">{new Date(p.paymentDate).toLocaleDateString('fa-IR')}</strong></p>
                          <p>روش پرداخت: <strong className="text-gray-800 font-bold">{getPaymentMethodText(p.paymentMethod)}</strong></p>
                          {p.receiptNo && <p>شماره رسید: <strong className="text-gray-800 font-mono">{p.receiptNo}</strong></p>}
                          {p.invoice && (
                            <p className="col-span-full mt-1">
                              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold border border-blue-100 text-[11px]">تسویه فاکتور {p.invoice.invoiceNo}</span>
                            </p>
                          )}
                          
                          {documentUrls.length > 0 && (
                            <div className="col-span-full mt-3">
                              <label className="block text-xs font-bold text-gray-500 mb-2">مدارک پیوست:</label>
                              <div className="flex flex-wrap gap-3">
                                {documentUrls.map((url, i) => (
                                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-2 w-36">
                                    <div className="flex flex-col items-center">
                                      {isImage(url) ? (
                                        <div className="w-20 h-20 rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center" onClick={() => setPreviewImage(url)}>
                                          <img src={url} alt="پیش‌نمایش" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </div>
                                      ) : isPdf(url) ? (
                                        <FileText size={40} className="text-red-500" />
                                      ) : (
                                        <FileText size={40} className="text-gray-500" />
                                      )}
                                      <div className="flex gap-1 mt-2">
                                        <button onClick={() => handlePrint(url)} className="p-1 hover:bg-gray-100 rounded" title="چاپ"><Printer size={14} /></button>
                                        <button onClick={() => handleDownload(url)} className="p-1 hover:bg-gray-100 rounded" title="دانلود"><Download size={14} /></button>
                                        <button onClick={() => handleShare(url)} className="p-1 hover:bg-gray-100 rounded" title="اشتراک"><Share2 size={14} /></button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* نمایش جزئیات و وضعیت چک صیادی در صورت وجود */}
                        {p.cheques && p.cheques.length > 0 && (
                          <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                            <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-2 mb-3">
                              <div className="flex items-center gap-2">
                                <FileCheck size={18} className="text-amber-700" />
                                <span className="text-xs font-black text-amber-900">چک صیادی متصل به این پرداخت</span>
                              </div>
                              <a
                                href="/khoshmin/treasury"
                                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
                              >
                                <span>مدیریت در خزانه‌داری</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>

                            {p.cheques.map((chq) => {
                              const badge = getChequeStatusBadge(chq.status);
                              return (
                                <div key={chq.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-700">
                                  <div>
                                    <span className="text-gray-500 block text-[10px]">شناسه ۱۶ رقمی صیاد:</span>
                                    <span className="font-mono font-bold text-gray-900 tracking-wider">
                                      {chq.sayadId.replace(/(\d{4})/g, '$1 ').trim()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[10px]">وضعیت وصول:</span>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[10px]">بانک و صادرکننده:</span>
                                    <span className="font-bold text-gray-900">
                                      {chq.bankName} {chq.bankBranch ? `(${chq.bankBranch})` : ''} - {chq.drawerName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[10px]">تاریخ سررسید:</span>
                                    <span className="font-bold text-gray-900">{new Date(chq.dueDate).toLocaleDateString('fa-IR')}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {p.description && <p className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 italic leading-relaxed">{p.description}</p>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {editingId !== p.id && (
                      <button onClick={() => handleEditStart(p)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition" title="ویرایش"><Edit size={18} /></button>
                    )}
                    <button onClick={() => deletePayment(p.id)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="حذف"><Trash2 size={18} /></button>
                  </div>
                </div>

                {editingId === p.id && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-6 bg-gray-50/50 p-4 rounded-3xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">مبلغ (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">روش پرداخت</label><select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                          <option value="CASH">نقدی</option><option value="CARD">کارت خوان</option><option value="TRANSFER">انتقال بانکی</option><option value="CHECK">چک</option><option value="OTHER">سایر</option>
                        </select></div>
                      <div className="sm:col-span-2">
                        <MultiFileUpload 
                          urls={editForm.attachmentUrls} 
                          onChange={handleEditAttachmentChange} 
                          title="ویرایش مستندات (فیش‌ها و رسیدها)" 
                        />
                      </div>
                      <div className="sm:col-span-2"><textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="توضیحات..." /></div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button onClick={() => handleEditSave(p.id)} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm">
                        <Save size={16} /> ذخیره تغییرات
                      </button>
                      <button onClick={handleEditCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition">
                        <X size={16} /> انصراف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl overflow-hidden">
            <img src={previewImage} alt="پیش‌نمایش بزرگ" className="max-w-full max-h-[90vh] object-contain" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
}