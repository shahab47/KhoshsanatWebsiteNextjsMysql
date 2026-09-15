'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Edit, Trash2, Save, X, Printer, Plus, CheckCircle2, AlertCircle, Clock, Banknote, XCircle, Paperclip, UploadCloud, Loader2, Download, Share2, Eye, Image as ImageIcon } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
const isPdf = (url: string) => /\.pdf$/i.test(url);

function MultiFileUpload({ urls, onChange, title = "مستندات و فایل‌های ضمیمه" }: { urls: string[], onChange: (urls: string[]) => void, title?: string }) {
  const { showAlert, showConfirm } = useModal();
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...urls];

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      fd.append('type', 'invoices');

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

const parseUrls = (val?: string | null): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [val];
};

const toDateObject = (dateStr: string | null): Date | undefined => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

function CreateInvoiceModal({ isOpen, onClose, onSubmit, submitting }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => Promise<void>; submitting: boolean }) {
  const { showAlert, showConfirm } = useModal();
  const [form, setForm] = useState<{description: string, amount: number, discount: number, tax: number, dueDate: string, attachmentUrls: string[]}>({ 
    description: '', amount: 0, discount: 0, tax: 0, dueDate: '', attachmentUrls: [] 
  });
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);
  const originalFormRef = useRef(form);

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
        message: 'اطلاعات وارد شده یا فایل‌های آپلود شده ذخیره نشده‌اند. آیا مطمئن هستید که می‌خواهید خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: async () => {
          if (tempUploadedUrls.length > 0) {
            for (const url of tempUploadedUrls) {
              try {
                await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
              } catch (e) {}
            }
          }
          setForm({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '', attachmentUrls: [] });
          setTempUploadedUrls([]);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const baseAmount = Number(form.amount) || 0;
  const discountAmount = Number(form.discount) || 0;
  const taxAmount = Number(form.tax) || 0;
  const calculatedFinal = Math.max(0, baseAmount - discountAmount + taxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      showAlert('مبلغ پایه فاکتور باید بزرگتر از صفر باشد.', 'خطا', 'error');
      return;
    }
    if (form.discount > form.amount) {
      showAlert('مبلغ تخفیف نمی‌تواند از مبلغ پایه بیشتر باشد.', 'خطا', 'error');
      return;
    }

    const submitData = {
      ...form,
      attachmentUrl: form.attachmentUrls.length > 0 ? JSON.stringify(form.attachmentUrls) : null
    };
    await onSubmit(submitData);
    setTempUploadedUrls([]);
    setForm({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '', attachmentUrls: [] });
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

  const handleDateChange = (dateObj: any) => {
    if (dateObj) {
      const date = dateObj.toDate();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setForm({ ...form, dueDate: `${year}-${month}-${day}` });
    } else {
      setForm({ ...form, dueDate: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={24} /></div>
            <h3 className="text-xl font-black text-gray-800">ایجاد فاکتور جدید</h3>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ پایه (تومان) *</label>
            <input type="number" min="0" onKeyDown={blockInvalidChars} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-gray-700 mb-1">تخفیف (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-1">مالیات (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={form.tax || ''} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>

          {/* پیش‌نمایش زنده محاسبات مالی فاکتور */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>مبلغ پایه:</span>
              <span className="font-bold text-slate-800">{baseAmount.toLocaleString('fa-IR')} تومان</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>تخفیف:</span>
                <span className="font-bold">-{discountAmount.toLocaleString('fa-IR')} تومان</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between items-center text-blue-600">
                <span>مالیات / ارزش افزوده:</span>
                <span className="font-bold">+{taxAmount.toLocaleString('fa-IR')} تومان</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>مبلغ نهایی قابل پرداخت:</span>
              <span className="text-base font-black text-blue-600">{calculatedFinal.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>

          <div dir="rtl">
            <label className="block text-sm font-bold text-gray-700 mb-1">تاریخ سررسید (شمسی)</label>
            <DatePicker
              value={toDateObject(form.dueDate)}
              onChange={handleDateChange}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              containerClassName="w-full"
              placeholder="انتخاب تاریخ"
            />
          </div>

          <MultiFileUpload 
            urls={form.attachmentUrls} 
            onChange={handleAttachmentChange} 
            title="مستندات و اسکن فاکتور" 
          />

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات فاکتور</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-gray-50 mt-4 pb-2">
            <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-500/10">
              <CheckCircle2 size={20} /> صدور فاکتور
            </button>
            <button type="button" onClick={handleClose} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Invoice {
  id: number;
  invoiceNo: string;
  amount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paidAmount: number;
  status: string;
  issueDate: string;
  dueDate: string | null;
  description: string | null;
  attachmentUrl?: string | null; 
}

interface CustomerInvoicesTabProps {
  customerId: string;
  onUpdate?: () => void;
}

export function CustomerInvoicesTab({ customerId, onUpdate }: CustomerInvoicesTabProps) {
  const { showAlert, showConfirm } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [unallocatedAmount, setUnallocatedAmount] = useState<number>(0);
  
  const [editForm, setEditForm] = useState<{
    amount: number; discount: number; tax: number; dueDate: string; status: string; description: string; attachmentUrls: string[];
  }>({ amount: 0, discount: 0, tax: 0, dueDate: '', status: '', description: '', attachmentUrls: [] });
  
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const initialAttachmentsRef = useRef<string[]>([]);

  const fetchInvoices = async () => {
    try {
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/khoshmin/customers/${customerId}/invoices`),
        fetch(`/api/khoshmin/customers/${customerId}/payments`)
      ]);
      if (!invRes.ok) throw new Error('خطا در دریافت فاکتورها');
      const data = await invRes.json();
      setInvoices(data);

      if (payRes.ok) {
        const payData = await payRes.json();
        const freeSum = payData.filter((p: any) => !p.invoiceId).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
        setUnallocatedAmount(freeSum);
      }
    } catch (error) {
      showAlert('خطا در دریافت لیست فاکتورها', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [customerId]);

  const createInvoice = async (data: any) => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) { 
        await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
        await fetchInvoices(); 
        onUpdate?.(); 
        showAlert('فاکتور با موفقیت صادر شد ✅', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در صدور فاکتور', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    }
  };

  const updateInvoice = async (id: number, data: Partial<Invoice>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/invoices?invoiceId=${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) { 
        await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
        await fetchInvoices(); 
        setEditingId(null); 
        onUpdate?.(); 
        showAlert('فاکتور با موفقیت به‌روزرسانی شد', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در به‌روزرسانی فاکتور', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteInvoice = async (id: number) => {
    showConfirm({
      title: 'حذف فاکتور',
      message: 'با حذف فاکتور تمام پرداختی‌های متصل آزاد می‌شوند و تراز مالی بروزرسانی می‌گردد. مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/invoices?invoiceId=${id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetch(`/api/khoshmin/customers/${customerId}/recalculate-debt`, { method: 'POST' });
            await fetchInvoices();
            onUpdate?.();
            showAlert('فاکتور با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در حذف فاکتور', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      }
    });
  };

  const handleEditStart = (invoice: Invoice) => {
    const currentAttachments = parseUrls(invoice.attachmentUrl);
    initialAttachmentsRef.current = [...currentAttachments];
    setEditingId(invoice.id);
    setEditForm({
      amount: invoice.amount, 
      discount: invoice.discount, 
      tax: invoice.tax,
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '', 
      status: invoice.status,
      description: invoice.description || '', 
      attachmentUrls: currentAttachments
    });
  };

  const handleEditCancel = async () => {
    const newUrls = editForm.attachmentUrls.filter(url => !initialAttachmentsRef.current.includes(url));
    for (const url of newUrls) {
      try {
        await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      } catch (e) { console.error('خطا در حذف فایل اضافه:', e); }
    }
    setEditingId(null);
  };

  const handleEditSave = async (id: number) => {
    if (editForm.amount <= 0) {
      showAlert('مبلغ پایه فاکتور باید بزرگتر از صفر باشد', 'خطا', 'error');
      return;
    }
    if (editForm.discount > editForm.amount) {
      showAlert('مبلغ تخفیف نمی‌تواند از مبلغ پایه بیشتر باشد', 'خطا', 'error');
      return;
    }
    await updateInvoice(id, {
      amount: editForm.amount, discount: editForm.discount || 0, tax: editForm.tax || 0,
      dueDate: editForm.dueDate || null, status: editForm.status, description: editForm.description,
      attachmentUrl: editForm.attachmentUrls.length > 0 ? JSON.stringify(editForm.attachmentUrls) : null
    });
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold"><Clock size={14}/> در انتظار پرداخت</span>;
      case 'PARTIAL': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold"><Banknote size={14}/> پرداخت بخشی</span>;
      case 'PAID': return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold"><CheckCircle2 size={14}/> پرداخت کامل</span>;
      case 'OVERDUE': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold"><AlertCircle size={14}/> سررسید گذشته</span>;
      case 'CANCELLED': return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold"><XCircle size={14}/> لغو شده</span>;
      default: return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  const handlePrint = (url: string) => {
    if (isImage(url)) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) { showAlert('پاپ‌آپ مسدود شده است', 'خطا', 'error'); return; }
      printWindow.document.write(`<html><head><title>چاپ تصویر سند</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${url}" style="max-width:100%;max-height:100%;" /></body></html>`);
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
      link.download = url.split('/').pop() || 'invoice-document';
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
        await navigator.share({ title: 'سند فاکتور', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') showAlert('اشتراک‌گذاری لغو شد', 'خطا', 'error');
      }
    } else {
      await navigator.clipboard.writeText(url);
      showAlert('لینک فایل در کلیپ‌بورد کپی شد', 'موفق', 'success');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-700">در حال بارگذاری فاکتورها...</div>;

  return (
    <div className="space-y-4">
      {/* بنر اطلاع‌رسانی در صورت وجود پرداختی‌های آزاد */}
      {unallocatedAmount > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in duration-300">
          <Banknote size={22} className="text-emerald-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">مجموع پرداختی‌های آزاد (بدون فاکتور مشخص): </span>
            <span className="font-black text-emerald-700">{unallocatedAmount.toLocaleString('fa-IR')} تومان</span>
            <p className="text-xs text-emerald-600/90 mt-0.5">این وجوه در تراز کلی حساب مشتری لحاظ شده‌اند اما به فاکتور بخصوصی الصاق نشده‌اند.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm font-black">
          <Plus size={20} /> ثبت فاکتور جدید
        </button>
      </div>

      <CreateInvoiceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={createInvoice} submitting={false} />

      {invoices.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold">هیچ فاکتوری برای این مشتری صادر نشده است.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const documentUrls = parseUrls(inv.attachmentUrl);
            const remainingDebt = inv.finalAmount - inv.paidAmount;
            return (
              <div key={inv.id} className="border border-gray-100 rounded-3xl p-6 hover:shadow-lg transition-all duration-300 bg-white border-r-8 border-r-blue-500">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    {editingId !== inv.id && (
                      <div className="mb-2">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-black border border-blue-100 uppercase tracking-tighter">#{inv.invoiceNo}</span>
                          {getStatusBadge(inv.status)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {editingId !== inv.id && (
                      <button onClick={() => handleEditStart(inv)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition" title="ویرایش"><Edit size={18} /></button>
                    )}
                    <button onClick={() => deleteInvoice(inv.id)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="حذف"><Trash2 size={18} /></button>
                  </div>
                </div>

                {editingId !== inv.id && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileText size={28} /></div>
                        <div>
                          <span className="text-3xl font-black text-gray-800">{inv.finalAmount ? inv.finalAmount.toLocaleString('fa-IR') : '0'}</span>
                          <span className="text-sm font-bold text-gray-500 mr-2 uppercase">تومان (مبلغ نهایی)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm text-gray-600 pr-3 border-r-2 border-blue-100">
                        <p>تاریخ صدور: <strong className="text-gray-800 font-bold">{new Date(inv.issueDate).toLocaleDateString('fa-IR')}</strong></p>
                        {inv.dueDate && <p>سررسید پرداخت: <strong className={new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? "text-red-500" : "text-gray-800"}>{new Date(inv.dueDate).toLocaleDateString('fa-IR')}</strong></p>}
                        <p>جمع پایه: <strong className="text-gray-800 font-bold">{inv.amount.toLocaleString('fa-IR')} تومان</strong></p>
                        {inv.discount > 0 && <p>تخفیف: <strong className="text-rose-600 font-bold">{inv.discount.toLocaleString('fa-IR')} تومان</strong></p>}
                        {inv.tax > 0 && <p>مالیات: <strong className="text-blue-600 font-bold">{inv.tax.toLocaleString('fa-IR')} تومان</strong></p>}
                        <p>پرداخت شده: <strong className="text-emerald-600 font-bold">{inv.paidAmount.toLocaleString('fa-IR')} تومان</strong></p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl space-y-3 border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">وضعیت تسویه و مستندات</p>
                      <p className="text-sm flex justify-between items-center">
                        <span>باقیمانده بدهی فاکتور:</span> 
                        <strong className={remainingDebt > 0 ? "text-red-600 font-black text-lg" : "text-emerald-600 font-black text-base"}>
                          {remainingDebt > 0 ? `${remainingDebt.toLocaleString('fa-IR')} تومان` : 'تسویه کامل'}
                        </strong>
                      </p>
                      
                      {documentUrls.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1">اسناد و فاکتورهای پیوست:</label>
                          <div className="flex flex-wrap gap-3">
                            {documentUrls.map((url, i) => {
                              const isImg = isImage(url);
                              const isPdfDoc = isPdf(url);
                              return (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-2 w-36">
                                  <div className="flex flex-col items-center">
                                    {isImg ? (
                                      <div className="w-20 h-20 rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center" onClick={() => setPreviewImage(url)}>
                                        <img src={url} alt="پیش‌نمایش سند" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      </div>
                                    ) : isPdfDoc ? (
                                      <FileText size={40} className="text-red-500 my-2" />
                                    ) : (
                                      <FileText size={40} className="text-gray-500 my-2" />
                                    )}
                                    <div className="flex gap-1 mt-2">
                                      <button onClick={() => handlePrint(url)} className="p-1 hover:bg-gray-100 rounded" title="چاپ"><Printer size={14} /></button>
                                      <button onClick={() => handleDownload(url)} className="p-1 hover:bg-gray-100 rounded" title="دانلود"><Download size={14} /></button>
                                      <button onClick={() => handleShare(url)} className="p-1 hover:bg-gray-100 rounded" title="اشتراک"><Share2 size={14} /></button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {inv.description && <p className="text-xs text-gray-500 leading-relaxed italic mt-2 bg-white p-2.5 rounded-xl border border-gray-100">{inv.description}</p>}
                    </div>
                  </div>
                )}

                {editingId === inv.id && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-6 bg-gray-50/50 p-4 rounded-3xl">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">مبلغ پایه (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">تخفیف (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">مالیات (تومان)</label><input type="number" min="0" onKeyDown={blockInvalidChars} value={editForm.tax} onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                      
                      {/* پیش‌نمایش زنده در حالت ویرایش */}
                      <div className="sm:col-span-3 bg-white border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600 flex-wrap gap-2">
                          <span>مبلغ پایه: <strong className="text-slate-800 font-bold">{Number(editForm.amount || 0).toLocaleString('fa-IR')} تومان</strong></span>
                          {Number(editForm.discount || 0) > 0 && <span className="text-rose-600 font-bold">تخفیف: -{Number(editForm.discount || 0).toLocaleString('fa-IR')} تومان</span>}
                          {Number(editForm.tax || 0) > 0 && <span className="text-blue-600 font-bold">مالیات: +{Number(editForm.tax || 0).toLocaleString('fa-IR')} تومان</span>}
                          <span className="font-black text-blue-700 text-sm">مبلغ نهایی: {Math.max(0, Number(editForm.amount || 0) - Number(editForm.discount || 0) + Number(editForm.tax || 0)).toLocaleString('fa-IR')} تومان</span>
                        </div>
                      </div>

                      <div dir="rtl">
                        <label className="block text-xs font-bold text-gray-500 mb-1">سررسید (شمسی)</label>
                        <DatePicker
                          value={toDateObject(editForm.dueDate)}
                          onChange={(dateObj: any) => {
                            if (dateObj) {
                              const date = dateObj.toDate();
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setEditForm({ ...editForm, dueDate: `${year}-${month}-${day}` });
                            } else {
                              setEditForm({ ...editForm, dueDate: '' });
                            }
                          }}
                          calendar={persian}
                          locale={persian_fa}
                          calendarPosition="bottom-right"
                          inputClass="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          containerClassName="w-full"
                          placeholder="انتخاب تاریخ"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">وضعیت</label>
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="PENDING">در انتظار</option><option value="PARTIAL">بخشی</option><option value="PAID">کامل</option><option value="OVERDUE">سررسید گذشته</option><option value="CANCELLED">لغو شده</option>
                        </select>
                      </div>
                      
                      <div className="sm:col-span-3">
                        <MultiFileUpload 
                          urls={editForm.attachmentUrls} 
                          onChange={(urls) => setEditForm({ ...editForm, attachmentUrls: urls })} 
                          title="ویرایش مستندات (فاکتورها و مدارک)" 
                        />
                      </div>

                      <div className="sm:col-span-3"><textarea value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full p-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" placeholder="توضیحات..." /></div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button onClick={() => handleEditSave(inv.id)} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm">
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

      {/* مودال بزرگنمایی تصویر سند */}
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