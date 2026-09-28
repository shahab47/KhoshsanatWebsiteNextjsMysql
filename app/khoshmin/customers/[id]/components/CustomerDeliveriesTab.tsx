'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit, Save, X, Truck, Package, Clock, PackageSearch, 
  CheckCircle2, XCircle, Loader2, Paperclip, Eye, Printer, Download, 
  Share2, UploadCloud, FileText, Scale, AlertTriangle, ArrowRight, 
  ShieldCheck, RefreshCw, Warehouse, Building2, UserCheck, FileCheck
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

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

  // لجستیک و بارنامه
  waybillNo?: string | null;
  driverName?: string | null;
  driverNationalId?: string | null;
  driverPhone?: string | null;
  truckPlate?: string | null;
  shippingCompany?: string | null;
  freightCost?: number | null;
  freightPaymentTerm?: string | null;

  // باسکول
  scaleGrossKg?: number | null;
  scaleTareKg?: number | null;
  scaleNetKg?: number | null;
  nominalWeightKg?: number | null;
  weightVariancePercent?: number | null;
  isToleranceExceeded?: boolean;
  scaleTicketNo?: string | null;
  scalePhotoUrl?: string | null;

  // روابط
  warehouseId?: string | null;
  warehouse?: { id: string; name: string; code: string; type: string } | null;
  productId?: number | null;
  product?: { id: number; title: string; code?: string; unit?: string } | null;
  invoiceId?: number | null;
  invoice?: { id: number; invoiceNo: string; finalAmount: number } | null;
  journalVoucherId?: string | null;
  stockTransactionId?: string | null;
}

const getUrlsFromAttachments = (attachments: any): string[] => {
  if (Array.isArray(attachments)) {
    return attachments.map((a: any) => typeof a === 'string' ? a : a.url).filter(Boolean);
  }
  return [];
};

const toDateObject = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

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

// مدال رسمی چاپ حواله خروج انبار، قبض باسکول و بارنامه حمل جاده‌ای
function OfficialDeliveryNoteModal({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const printDelivery = () => {
    window.print();
  };

  const netKg = delivery.scaleNetKg ? Number(delivery.scaleNetKg) : null;
  const grossKg = delivery.scaleGrossKg ? Number(delivery.scaleGrossKg) : null;
  const tareKg = delivery.scaleTareKg ? Number(delivery.scaleTareKg) : null;
  const nominalKg = delivery.nominalWeightKg ? Number(delivery.nominalWeightKg) : null;
  const variancePct = delivery.weightVariancePercent ? Number(delivery.weightVariancePercent) : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl relative my-8 print:m-0 print:p-4 print:shadow-none print:max-w-none print:w-full">
        {/* کنترل‌های بالای پنجره (مخفی در پرینت) */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
              حواله رسمی خروج و بارنامه
            </span>
            <span className="font-mono text-gray-500 font-bold">{delivery.deliveryNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printDelivery}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm"
            >
              <Printer size={18} /> چاپ رسمی حواله
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* سند رسمی قابل پرینت */}
        <div className="border-2 border-gray-800 p-6 rounded-xl space-y-6 text-gray-900 bg-white">
          {/* سربرگ شرکت */}
          <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4">
            <div className="text-right space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">شرکت خوش‌صنعت پایدار</h1>
              <p className="text-xs text-gray-600 font-medium">تولیدکننده انواع مقاطع و اتصالات صنعتی و مهندسی سازه</p>
              <p className="text-[11px] text-gray-500">شناسه ملی: ۱۴۰۰۸۵۲۹۶۳۰ | کد اقتصادی: ۴۱۱۶۵۴۹۸۷ | تلفن کارخانه: ۰۲۱-۵۵۴۴۳۳۲۲</p>
            </div>
            <div className="text-center px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 space-y-1 min-w-[200px]">
              <div className="text-xs font-bold text-gray-700">حواله رسمی خروج کالا و بارنامه</div>
              <div className="text-sm font-mono font-black text-blue-700">{delivery.deliveryNo}</div>
              <div className="text-[11px] text-gray-600">
                تاریخ صدور: {new Date(delivery.deliveryDate).toLocaleDateString('fa-IR')}
              </div>
            </div>
          </div>

          {/* مشخصات ترابری و بارنامه */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 block mb-1">شماره بارنامه دولتی:</span>
              <span className="font-mono font-bold text-gray-900">{delivery.waybillNo || '---'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">نام راننده:</span>
              <span className="font-bold text-gray-900">{delivery.driverName || '---'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">کد ملی راننده:</span>
              <span className="font-mono text-gray-900" dir="ltr">{delivery.driverNationalId || '---'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">تلفن راننده:</span>
              <span className="font-mono text-gray-900" dir="ltr">{delivery.driverPhone || '---'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">شماره پلاک ناوگان:</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 border border-gray-300 rounded inline-block text-gray-900" dir="ltr">
                {delivery.truckPlate || '---'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">شرکت حمل‌ونقل:</span>
              <span className="font-bold text-gray-900">{delivery.shippingCompany || 'اختصاصی شرکت'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">انبار مبدا بارگیری:</span>
              <span className="font-bold text-gray-900">{delivery.warehouse?.name || 'انبار مرکزی محصول نهایی'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">شرایط کرایه:</span>
              <span className="font-bold text-gray-900">
                {delivery.freightPaymentTerm === 'PAID_BY_CUSTOMER' ? 'پس‌کرایه (خریدار)' : 'پیش‌کرایه (شرکت)'}
              </span>
            </div>
          </div>

          {/* جدول سنجش باسکول دیجیتال (Single Source of Truth) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Scale size={14} className="text-blue-600" /> نتایج قطعی توزین باسکول دیجیتال (منبع واحد حقیقت)
              </span>
              {delivery.scaleTicketNo && (
                <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  قبض باسکول: {delivery.scaleTicketNo}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <div className="text-gray-500 text-[10px] mb-1">وزن ناخالص (پر)</div>
                <div className="font-mono font-bold text-gray-900">{grossKg ? `${grossKg.toLocaleString('fa-IR')} kg` : '---'}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <div className="text-gray-500 text-[10px] mb-1">وزن خالی (تارا)</div>
                <div className="font-mono font-bold text-gray-900">{tareKg ? `${tareKg.toLocaleString('fa-IR')} kg` : '---'}</div>
              </div>
              <div className="bg-blue-50 p-2 rounded border-2 border-blue-600 text-blue-900">
                <div className="text-blue-700 font-bold text-[10px] mb-1">وزن خالص قطعی تحویل</div>
                <div className="font-mono font-black text-sm">{netKg ? `${netKg.toLocaleString('fa-IR')} kg` : `${delivery.quantity} ${delivery.unit || 'واحد'}`}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <div className="text-gray-500 text-[10px] mb-1">وزن محاسباتی اسمی</div>
                <div className="font-mono text-gray-900">{nominalKg ? `${nominalKg.toLocaleString('fa-IR')} kg` : '---'}</div>
              </div>
              <div className={`p-2 rounded border ${delivery.isToleranceExceeded ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
                <div className="text-[10px] mb-1">انحراف از تلورانس مجاز</div>
                <div className="font-mono font-bold">{variancePct !== null ? `${variancePct}%` : '۰%'}</div>
              </div>
            </div>
          </div>

          {/* جدول اقلام تحویل شده */}
          <div>
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-800">
                  <th className="border border-gray-300 p-2 text-center w-12">ردیف</th>
                  <th className="border border-gray-300 p-2 text-right">شرح کالای تحویلی</th>
                  <th className="border border-gray-300 p-2 text-center w-24">تعداد/مقدار</th>
                  <th className="border border-gray-300 p-2 text-center w-20">واحد</th>
                  <th className="border border-gray-300 p-2 text-center w-32">وزن خالص باسکول</th>
                  <th className="border border-gray-300 p-2 text-right">توضیحات و مشخصات فنی</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 text-center font-mono">۱</td>
                  <td className="border border-gray-300 p-2 font-bold text-gray-900">{delivery.productName}</td>
                  <td className="border border-gray-300 p-2 text-center font-mono font-bold">{delivery.quantity}</td>
                  <td className="border border-gray-300 p-2 text-center">{delivery.unit || 'شاخه'}</td>
                  <td className="border border-gray-300 p-2 text-center font-mono font-bold">
                    {netKg ? `${netKg.toLocaleString('fa-IR')} کیلوگرم` : 'طبق شمارش'}
                  </td>
                  <td className="border border-gray-300 p-2 text-gray-600">{delivery.description || 'سالم و بدون نقص فنی تحویل گردید.'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* امضاها و تاییدات قانونی */}
          <div className="pt-6 grid grid-cols-3 gap-4 border-t border-gray-300 text-center text-xs">
            <div className="space-y-12">
              <span className="font-bold text-gray-800 block">متصدی باسکول و خروج انبار:</span>
              <div className="text-[10px] text-gray-400">امضا و تاریخ خروج کارخانه</div>
            </div>
            <div className="space-y-12">
              <span className="font-bold text-gray-800 block">راننده و متصدی ترابری:</span>
              <div className="text-[10px] text-gray-400">صحت سلامت بار و اوزان تایید می‌شود</div>
            </div>
            <div className="space-y-12">
              <span className="font-bold text-gray-800 block">خریدار / تحویل‌گیرنده در مقصد:</span>
              {delivery.signatureUrl ? (
                <div className="flex justify-center">
                  <img src={delivery.signatureUrl} alt="امضای دیجیتال تحویل" className="h-12 object-contain" />
                </div>
              ) : (
                <div className="text-[10px] text-gray-400">مهر و امضای تاییدیه تحویل بار</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerDeliveriesTab({ customerId }: { customerId: string }) {
  const { showAlert, showConfirm } = useModal();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<Delivery | null>(null);

  const [editForm, setEditForm] = useState<{
    productName: string;
    quantity: number;
    unit: string;
    deliveryDate: string;
    status: string;
    description: string;
    signatureUrl: string;
    attachmentUrls: string[];
    // لجستیک و باسکول در ویرایش
    waybillNo: string;
    driverName: string;
    driverPhone: string;
    truckPlate: string;
    scaleGrossKg: string;
    scaleTareKg: string;
    nominalWeightKg: string;
  }>({
    productName: '',
    quantity: 0,
    unit: '',
    deliveryDate: '',
    status: '',
    description: '',
    signatureUrl: '',
    attachmentUrls: [],
    waybillNo: '',
    driverName: '',
    driverPhone: '',
    truckPlate: '',
    scaleGrossKg: '',
    scaleTareKg: '',
    nominalWeightKg: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const initialAttachmentUrlsRef = useRef<string[]>([]);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries`);
      const data = await res.json();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      showAlert('خطا در دریافت لیست فرم‌های تحویل', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [customerId]);

  // تسریع در تایید تحویل و صدور سند انبار و COGS
  const handleFulfillDelivery = async (id: number) => {
    showConfirm({
      title: 'تایید تحویل بار و صدور سند حسابداری',
      message: 'آیا مایل به تایید قطعی تحویل بار، ثبت خروج انبار و صدور سند دوبل بهای تمام‌شده (COGS) هستید؟',
      type: 'info',
      confirmText: 'تایید و صدور اسناد',
      cancelText: 'انصراف',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DELIVERED' }),
          });
          if (res.ok) {
            await fetchDeliveries();
            showAlert('حواله با موفقیت تحویل شد و سند بهای تمام‌شده (COGS) صادر گردید.', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در تایید تحویل بار', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // برگشت کالا به انبار و ابطال سند حسابداری
  const handleReturnDelivery = async (id: number) => {
    showConfirm({
      title: 'برگشت کالا به انبار کارخانه',
      message: 'با برگشت کالا، سند معکوس بهای تمام‌شده (COGS Reversal) صادر شده و موجودی به انبار بازمی‌گردد. ادامه می‌دهید؟',
      type: 'warning',
      confirmText: 'بله، برگشت ثبت شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'RETURNED', returnReason: 'مرجوعی توسط مشتری / لغو بارگیری' }),
          });
          if (res.ok) {
            await fetchDeliveries();
            showAlert('وضعیت کالا به برگشت‌خورده تغییر یافت و سند معکوس صادر شد.', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در برگشت تحویل بار', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const updateDelivery = async (id: number, data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
      message: 'آیا از حذف این فرم تحویل اطمینان دارید؟ اسناد مالی قطعی‌شده طبق قوانین حسابداری قابل حذف فیزیکی نیستند.',
      type: 'warning',
      confirmText: 'بله، بررسی و حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries?deliveryId=${id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchDeliveries();
            showAlert('فرم تحویل بار با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در حذف فرم تحویل', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      },
    });
  };

  const handleEditStart = (del: Delivery) => {
    const currentAttachments = getUrlsFromAttachments(del.attachments);
    initialAttachmentUrlsRef.current = [...currentAttachments];
    setEditingId(del.id);
    setEditForm({
      productName: del.productName,
      quantity: del.quantity,
      unit: del.unit || '',
      deliveryDate: del.deliveryDate.split('T')[0],
      status: del.status,
      description: del.description || '',
      signatureUrl: del.signatureUrl || '',
      attachmentUrls: currentAttachments,
      waybillNo: del.waybillNo || '',
      driverName: del.driverName || '',
      driverPhone: del.driverPhone || '',
      truckPlate: del.truckPlate || '',
      scaleGrossKg: del.scaleGrossKg ? String(del.scaleGrossKg) : '',
      scaleTareKg: del.scaleTareKg ? String(del.scaleTareKg) : '',
      nominalWeightKg: del.nominalWeightKg ? String(del.nominalWeightKg) : '',
    });
  };

  const handleEditCancel = async () => {
    const newUrls = editForm.attachmentUrls.filter(url => !initialAttachmentUrlsRef.current.includes(url));
    for (const url of newUrls) {
      try {
        await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      } catch (e) {
        console.error('خطا در حذف فایل اضافه:', e);
      }
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
      productName: editForm.productName,
      quantity: editForm.quantity,
      unit: editForm.unit || null,
      deliveryDate: editForm.deliveryDate,
      status: editForm.status,
      description: editForm.description,
      signatureUrl: editForm.signatureUrl,
      attachments: finalAttachments,
      waybillNo: editForm.waybillNo || null,
      driverName: editForm.driverName || null,
      driverPhone: editForm.driverPhone || null,
      truckPlate: editForm.truckPlate || null,
      scaleGrossKg: editForm.scaleGrossKg ? parseFloat(editForm.scaleGrossKg) : null,
      scaleTareKg: editForm.scaleTareKg ? parseFloat(editForm.scaleTareKg) : null,
      nominalWeightKg: editForm.nominalWeightKg ? parseFloat(editForm.nominalWeightKg) : null,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-xs font-bold"><Clock size={14}/> در انتظار تایید</span>;
      case 'PREPARING':
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-xs font-bold"><PackageSearch size={14}/> در حال بارگیری</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold"><CheckCircle2 size={14}/> تحویل قطعی کارخانه</span>;
      case 'RETURNED':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-lg text-xs font-bold"><XCircle size={14}/> برگشت‌خورده به انبار</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium">در حال بارگذاری فرم‌ها و بارنامه‌های لجستیک...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* دکمه اکشن ثبت جدید */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Truck className="text-blue-600" size={24} />
          <div>
            <h2 className="font-bold text-gray-900 text-base">مدیریت بارگیری، باسکول و حواله‌های خروج</h2>
            <p className="text-xs text-gray-500">کنترل توزین، بارنامه راننده و صدور مکانیزه اسناد بهای تمام‌شده انبار (COGS)</p>
          </div>
        </div>
        <a
          href={`/khoshmin/customers/${customerId}/deliveries/new`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm font-bold text-sm"
        >
          <Plus size={18} /> ثبت بارنامه و حواله خروج جدید
        </a>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-bold">هیچ حواله خروج یا بارنامه‌ای برای این مشتری ثبت نشده است.</p>
          <p className="text-xs text-gray-400 mt-1">با ثبت اولین تحویل بار، وزن باسکول و اسناد حسابداری انبار به طور خودکار ایجاد می‌شوند.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((del) => {
            const documentUrls = getUrlsFromAttachments(del.attachments);
            const netKg = del.scaleNetKg ? Number(del.scaleNetKg) : null;
            const grossKg = del.scaleGrossKg ? Number(del.scaleGrossKg) : null;
            const tareKg = del.scaleTareKg ? Number(del.scaleTareKg) : null;
            const variancePct = del.weightVariancePercent ? Number(del.weightVariancePercent) : null;

            return (
              <div key={del.id} className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 transition bg-white shadow-sm">
                {/* هدر ردیف */}
                <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-black border border-gray-200 flex items-center gap-1.5">
                      <Truck size={15} className="text-blue-600" /> #{del.deliveryNo}
                    </span>
                    {getStatusBadge(del.status)}

                    {del.journalVoucherId && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                        <ShieldCheck size={14} className="text-emerald-600" /> سند COGS قطعی
                      </span>
                    )}

                    {del.isToleranceExceeded && (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                        <AlertTriangle size={14} className="text-red-500" /> مغایرت باسکول بیش از ۲٪
                      </span>
                    )}
                  </div>

                  {/* اکشن‌های حواله */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedForPrint(del)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      title="چاپ حواله رسمی"
                    >
                      <Printer size={15} /> چاپ رسمی
                    </button>

                    {del.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleFulfillDelivery(del.id)}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        title="تایید خروج و صدور سند انبار"
                      >
                        <FileCheck size={15} /> خروج انبار
                      </button>
                    )}

                    {del.status === 'DELIVERED' && (
                      <button
                        onClick={() => handleReturnDelivery(del.id)}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                        title="برگشت به انبار و ابطال سند"
                      >
                        <RefreshCw size={15} /> برگشت کالا
                      </button>
                    )}

                    {editingId !== del.id && (
                      <button
                        onClick={() => handleEditStart(del)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                        title="ویرایش"
                      >
                        <Edit size={17} />
                      </button>
                    )}

                    <button
                      onClick={() => deleteDelivery(del.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف پیش‌نویس"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {/* بدنه اطلاعات در حالت نمایش معمولی */}
                {editingId !== del.id && (
                  <div className="mt-4 space-y-4">
                    {/* اطلاعات اصلی کالا */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                          <Package size={24} />
                        </div>
                        <div>
                          <span className="text-lg font-black text-gray-900 block">{del.productName}</span>
                          <div className="text-xs font-medium text-gray-500 flex items-center gap-3 mt-0.5">
                            <span>مقدار اسمی: <strong className="text-blue-700 font-mono text-sm">{del.quantity}</strong> {del.unit || 'شاخه'}</span>
                            {del.warehouse && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Warehouse size={13} className="text-gray-400" /> {del.warehouse.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left text-xs font-medium text-gray-500">
                        <div>تاریخ خروج: <strong className="text-gray-800 font-mono">{new Date(del.deliveryDate).toLocaleDateString('fa-IR')}</strong></div>
                      </div>
                    </div>

                    {/* اطلاعات باسکول دیجیتال و بارنامه ناوگان */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* کارت باسکول */}
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Scale size={14} className="text-blue-600" /> وزن‌کشی باسکول دیجیتال
                          </span>
                          {del.scaleTicketNo && (
                            <span className="text-[11px] font-mono text-gray-500">قبض: {del.scaleTicketNo}</span>
                          )}
                        </div>

                        {netKg ? (
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-white p-2 rounded border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">پر (ناخالص)</span>
                              <span className="font-mono font-bold text-gray-800">{grossKg ? grossKg.toLocaleString('fa-IR') : '---'} kg</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">خالی (تارا)</span>
                              <span className="font-mono font-bold text-gray-800">{tareKg ? tareKg.toLocaleString('fa-IR') : '---'} kg</span>
                            </div>
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <span className="text-[10px] text-blue-700 font-bold block">خالص باسکول</span>
                              <span className="font-mono font-black text-blue-900 text-sm">{netKg.toLocaleString('fa-IR')} kg</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 py-1">اطلاعات باسکول ثبت نشده است.</p>
                        )}

                        {variancePct !== null && (
                          <div className="mt-2 flex items-center justify-between text-[11px] pt-1 border-t border-gray-200">
                            <span className="text-gray-500">مغایرت با وزن اسمی:</span>
                            <span className={`font-mono font-bold ${del.isToleranceExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                              {variancePct}% {del.isToleranceExceeded ? '(بیش از حد مجاز ۲٪)' : '(مجاز)'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* کارت ناوگان و بارنامه */}
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Truck size={14} className="text-blue-600" /> ناوگان ترابری و بارنامه
                          </span>
                          {del.waybillNo && (
                            <span className="text-[11px] font-mono text-gray-500">بارنامه: {del.waybillNo}</span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">راننده:</span>
                            <span className="font-bold text-gray-900">{del.driverName || 'ثبت نشده'} {del.driverPhone ? `(${del.driverPhone})` : ''}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">پلاک تریلی:</span>
                            <span className="font-mono bg-white px-2 py-0.5 border border-gray-200 rounded font-bold text-gray-800 text-[11px]" dir="ltr">
                              {del.truckPlate || '---'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">کرایه حمل:</span>
                            <span className="text-gray-900 font-medium">
                              {del.freightCost ? `${Number(del.freightCost).toLocaleString('fa-IR')} تومان` : 'توافقی'}
                              <span className="text-[10px] text-gray-500 mr-1">
                                ({del.freightPaymentTerm === 'PAID_BY_CUSTOMER' ? 'پس‌کرایه' : 'پیش‌کرایه'})
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* امضا و مدارک پیوست */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-4">
                        {del.signatureUrl ? (
                          <div className="flex items-center gap-2 text-emerald-700 font-bold">
                            <CheckCircle2 size={16} /> دارای امضای دیجیتال تحویل
                            <a href={del.signatureUrl} target="_blank" className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition">
                              مشاهده امضا
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">بدون امضای تحویل</span>
                        )}

                        {del.scalePhotoUrl && (
                          <a href={del.scalePhotoUrl} target="_blank" className="px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition font-medium">
                            مشاهده قبض باسکول
                          </a>
                        )}
                      </div>

                      {documentUrls.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">پیوست‌ها:</span>
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono font-bold">
                            {documentUrls.length} فایل
                          </span>
                        </div>
                      )}
                    </div>

                    {del.description && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                        توضیحات: {del.description}
                      </p>
                    )}
                  </div>
                )}

                {/* فرم ویرایش اینلاین */}
                {editingId === del.id && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 bg-gray-50/70 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-gray-700">ویرایش اطلاعات حواله خروج و باسکول</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">نام محصول</label>
                        <input
                          type="text"
                          value={editForm.productName}
                          onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">مقدار</label>
                        <input
                          type="number"
                          step="any"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">واحد</label>
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">وزن ناخالص باسکول (kg)</label>
                        <input
                          type="number"
                          value={editForm.scaleGrossKg}
                          onChange={(e) => setEditForm({ ...editForm, scaleGrossKg: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">وزن خالی تارا (kg)</label>
                        <input
                          type="number"
                          value={editForm.scaleTareKg}
                          onChange={(e) => setEditForm({ ...editForm, scaleTareKg: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">نام راننده</label>
                        <input
                          type="text"
                          value={editForm.driverName}
                          onChange={(e) => setEditForm({ ...editForm, driverName: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">پلاک تریلی</label>
                        <input
                          type="text"
                          value={editForm.truckPlate}
                          onChange={(e) => setEditForm({ ...editForm, truckPlate: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">شماره بارنامه</label>
                        <input
                          type="text"
                          value={editForm.waybillNo}
                          onChange={(e) => setEditForm({ ...editForm, waybillNo: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">وضعیت تحویل</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        >
                          <option value="PENDING">در انتظار</option>
                          <option value="PREPARING">در حال بارگیری</option>
                          <option value="DELIVERED">تحویل قطعی</option>
                          <option value="RETURNED">برگشت‌خورده</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block font-bold text-gray-700 mb-1">توضیحات</label>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => handleEditSave(del.id)}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Save size={15} /> ذخیره تغییرات
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <X size={15} /> انصراف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* مدال چاپ رسمی حواله خروج */}
      {selectedForPrint && (
        <OfficialDeliveryNoteModal delivery={selectedForPrint} onClose={() => setSelectedForPrint(null)} />
      )}
    </div>
  );
}