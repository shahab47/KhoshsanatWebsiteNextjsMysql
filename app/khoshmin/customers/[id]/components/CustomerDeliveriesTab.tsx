'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Save, X, Truck, Package, Clock, PackageSearch, CheckCircle2, XCircle, FileSignature, Loader2, Paperclip, Image as ImageIcon, Eye, Printer, Download, Share2, UploadCloud } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import { JalaaliDateTimePicker } from 'jalaali-date-time-picker';

interface Delivery {
  id: number;
  deliveryNo: string;
  productName: string;
  quantity: number;
  unit: string | null;
  deliveryDate: string;
  status: string;
  description: string | null;
  signatureUrl: string | null;
  attachments: any;
}

// استخراج URLها از فیلد Json دیتابیس
const getUrlsFromAttachments = (attachments: any): string[] => {
  if (Array.isArray(attachments)) {
    return attachments.map((a: any) => typeof a === 'string' ? a : a.url).filter(Boolean);
  }
  return [];
};

// تبدیل تاریخ میلادی به شیء Date برای تقویم شمسی
const toDateObject = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

// کامپوننت داخلی برای مدیریت پیوست‌ها با قابلیت چاپ، دانلود، اشتراک و حذف تأییددار
function AttachmentManager({ urls, onChange, title }: { urls: string[]; onChange: (urls: string[]) => void; title?: string }) {
  const { showAlert, showConfirm } = useModal();
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        onChange([...urls, data.url]);
      } else {
        showAlert('خطا در آپلود فایل', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setIsUploading(false);
    }
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
    <div className="space-y-3">
      {title && <label className="block text-sm font-bold text-gray-700 mb-1">{title}</label>}
      <div className="flex flex-wrap gap-3">
        {urls.map((url, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 w-48 relative group">
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
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => handlePrint(url)} className="p-1 hover:bg-gray-100 rounded" title="چاپ"><Printer size={16} /></button>
                <button type="button" onClick={() => handleDownload(url)} className="p-1 hover:bg-gray-100 rounded" title="دانلود"><Download size={16} /></button>
                <button type="button" onClick={() => handleShare(url)} className="p-1 hover:bg-gray-100 rounded" title="اشتراک‌گذاری"><Share2 size={16} /></button>
                <button type="button" onClick={() => handleDelete(url)} className="p-1 hover:bg-red-100 text-red-500 rounded" title="حذف"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition">
          {isUploading ? <Loader2 className="animate-spin text-blue-500" size={24} /> : <UploadCloud className="text-gray-400" size={28} />}
          <span className="text-xs text-gray-500 mt-1">آپلود جدید</span>
          <input type="file" accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
        </label>
      </div>
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

export function CustomerDeliveriesTab({ customerId }: { customerId: string }) {
  const { showAlert, showConfirm } = useModal();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    productName: string, quantity: number, unit: string, deliveryDate: string, status: string, description: string, signatureUrl: string, attachmentUrls: string[]
  }>({ productName: '', quantity: 0, unit: '', deliveryDate: '', status: '', description: '', signatureUrl: '', attachmentUrls: [] });
  const [submitting, setSubmitting] = useState(false);
  const initialAttachmentUrlsRef = useRef<string[]>([]); // برای پاکسازی فایل‌های اضافه شده در صورت انصراف

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries`);
      const data = await res.json();
      setDeliveries(data);
    } catch (error) {
      showAlert('خطا در دریافت لیست فرم‌های تحویل', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeliveries(); }, [customerId]);

  const updateDelivery = async (id: number, data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchDeliveries();
        setEditingId(null);
        showAlert('فرم تحویل با موفقیت به‌روزرسانی شد', 'موفقیت', 'success');
      } else {
        const error = await res.json();
        showAlert(error.error || 'خطا در به‌روزرسانی', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDelivery = async (id: number) => {
    showConfirm({
      title: 'حذف فرم تحویل بار',
      message: 'آیا از حذف این فرم تحویل اطمینان دارید؟ تمام مدارک ضمیمه شده نیز به طور دائمی از سرور حذف خواهند شد.',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchDeliveries();
            showAlert('فرم تحویل بار با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            showAlert('خطا در حذف فرم تحویل', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      }
    });
  };

  const handleEditStart = (del: Delivery) => {
    const currentAttachments = getUrlsFromAttachments(del.attachments);
    initialAttachmentUrlsRef.current = [...currentAttachments];
    setEditingId(del.id);
    setEditForm({
      productName: del.productName, quantity: del.quantity, unit: del.unit || '',
      deliveryDate: del.deliveryDate.split('T')[0], status: del.status, description: del.description || '',
      signatureUrl: del.signatureUrl || '',
      attachmentUrls: currentAttachments
    });
  };

  const handleEditCancel = async () => {
    // حذف فایل‌های جدیدی که در این جلسه ویرایش آپلود شده‌اند اما ذخیره نشده‌اند
    const newUrls = editForm.attachmentUrls.filter(url => !initialAttachmentUrlsRef.current.includes(url));
    for (const url of newUrls) {
      try {
        await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      } catch (e) { console.error('خطا در حذف فایل اضافه:', e); }
    }
    setEditingId(null);
  };

  const handleEditSave = async (id: number) => {
    if (!editForm.productName.trim()) {
      showAlert('نام محصول الزامی است', 'خطا در اعتبارسنجی', 'error');
      return;
    }
    if (editForm.quantity <= 0) {
      showAlert('مقدار نامعتبر است', 'خطا', 'error');
      return;
    }
    const finalAttachments = editForm.attachmentUrls.map(url => ({ name: 'مدرک ضمیمه', url, type: 'general' }));
    await updateDelivery(id, {
      productName: editForm.productName, quantity: editForm.quantity, unit: editForm.unit || null,
      deliveryDate: editForm.deliveryDate, status: editForm.status, description: editForm.description,
      signatureUrl: editForm.signatureUrl, attachments: finalAttachments
    });
  };

  const blockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold"><Clock size={14}/> در انتظار</span>;
      case 'PREPARING': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold"><PackageSearch size={14}/> در حال آماده‌سازی</span>;
      case 'DELIVERED': return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold"><CheckCircle2 size={14}/> تحویل داده شده</span>;
      case 'RETURNED': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold"><XCircle size={14}/> برگشت خورده</span>;
      default: return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-700">در حال بارگذاری فرم‌های تحویل...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <a href={`/khoshmin/customers/${customerId}/deliveries/new`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-md font-bold text-sm">
          <Plus size={18} /> ثبت فرم تحویل بار جدید
        </a>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-bold">هیچ فرم تحویل باری برای این مشتری ثبت نشده است.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((del) => {
            const documentUrls = getUrlsFromAttachments(del.attachments);
            return (
              <div key={del.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition bg-white">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex-1">
                    {editingId !== del.id && (
                      <div className="mb-2">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm font-bold border border-gray-200 flex items-center gap-1">
                            <Truck size={14} className="text-gray-500" /> فرشمان #{del.deliveryNo}
                          </span>
                          {getStatusBadge(del.status)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {editingId !== del.id && (
                      <button onClick={() => handleEditStart(del)} className="p-2 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ویرایش"><Edit size={18} /></button>
                    )}
                    <button onClick={() => deleteDelivery(del.id)} className="p-2 bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف فرم"><Trash2 size={18} /></button>
                  </div>
                </div>

                {editingId !== del.id && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Package size={24} /></div>
                      <div>
                        <span className="text-xl font-black text-gray-800 block mb-1">{del.productName}</span>
                        <div className="text-sm font-bold text-gray-500">
                          مقدار تحویلی: <span className="text-indigo-600 text-lg mx-1">{del.quantity}</span> {del.unit || 'عدد'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm text-gray-600 pr-3 border-r-2 border-indigo-100">
                      <p>تاریخ تحویل: <strong className="text-gray-800">{new Date(del.deliveryDate).toLocaleDateString('fa-IR')}</strong></p>
                      {del.signatureUrl ? (
                        <p className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 size={14} /> دارای امضای دیجیتال
                          <a href={del.signatureUrl} target="_blank" className="mr-2 px-2 py-1 bg-emerald-100 rounded hover:bg-emerald-200 transition">مشاهده</a>
                        </p>
                      ) : (
                        <p className="text-gray-400">بدون تصویر رسید / امضا</p>
                      )}
                    </div>

                    {documentUrls.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">مدارک و پیوست‌ها</label>
                        <div className="flex flex-wrap gap-3">
                          {documentUrls.map((url, idx) => {
                            const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                            return (
                              <div key={idx} className="bg-gray-50 rounded-xl p-2 w-36 text-center">
                                {isImg ? (
                                  <img src={url} className="w-20 h-20 object-cover mx-auto rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                  <Paperclip size={32} className="mx-auto text-gray-500" />
                                )}
                                <div className="flex justify-center gap-2 mt-2">
                                  <button onClick={() => window.open(url, '_blank')} className="p-1 bg-white rounded shadow" title="مشاهده"><Eye size={14} /></button>
                                  <button onClick={async () => { const res = await fetch(url); const blob = await res.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = url.split('/').pop() || 'download'; link.click(); }} className="p-1 bg-white rounded shadow" title="دانلود"><Download size={14} /></button>
                                  <button onClick={() => { if (navigator.share) navigator.share({ url }); else navigator.clipboard.writeText(url); }} className="p-1 bg-white rounded shadow" title="اشتراک"><Share2 size={14} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {del.description && <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">{del.description}</p>}
                  </div>
                )}

                {editingId === del.id && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 bg-gray-50/50 p-4 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">نام محصول ارسال شده</label>
                        <input type="text" value={editForm.productName} onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">مقدار</label>
                        <input type="number" step="any" min="0" onKeyDown={blockInvalidChars} value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">واحد اندازه‌گیری</label>
                        <input type="text" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">تاریخ تحویل (شمسی)</label>
                        <JalaaliDateTimePicker
                          value={toDateObject(editForm.deliveryDate)}
                          onChange={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setEditForm({ ...editForm, deliveryDate: `${year}-${month}-${day}` });
                            } else {
                              setEditForm({ ...editForm, deliveryDate: '' });
                            }
                          }}
                          placeholder="انتخاب تاریخ"
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">وضعیت ارسال</label>
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="PENDING">در انتظار</option><option value="PREPARING">آماده‌سازی</option><option value="DELIVERED">تحویل شده</option><option value="RETURNED">برگشت خورده</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">امضای دیجیتال (اختیاری)</label>
                        <input type="text" value={editForm.signatureUrl} onChange={(e) => setEditForm({ ...editForm, signatureUrl: e.target.value })} placeholder="لینک تصویر امضا" className="w-full p-2 border border-gray-300 rounded-lg bg-white" />
                      </div>

                      <div className="sm:col-span-2">
                        <AttachmentManager
                          urls={editForm.attachmentUrls}
                          onChange={(newUrls) => setEditForm({ ...editForm, attachmentUrls: newUrls })}
                          title="مدارک و پیوست‌های بار (حواله، رسید و غیره)"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات تکمیلی</label>
                        <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button onClick={() => handleEditSave(del.id)} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                        <Save size={16} /> ذخیره تغییرات
                      </button>
                      <button onClick={handleEditCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
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
    </div>
  );
}