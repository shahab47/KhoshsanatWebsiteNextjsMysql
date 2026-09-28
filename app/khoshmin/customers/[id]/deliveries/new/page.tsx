// app/khoshmin/customers/[id]/deliveries/new/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, X, Upload, FileText, Trash2, Package, Calendar, Clock, 
  CheckCircle, AlertCircle, Scale, Truck, Warehouse, ShieldAlert, Sparkles, 
  Loader2, CheckCircle2, ChevronDown
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface InvoiceOption {
  id: number;
  invoiceNo: string;
  finalAmount: number;
}

export default function NewDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert, showConfirm } = useModal();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);

  // اطلاعات پایه کالا و سفارش
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('شاخه');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('PENDING');
  const [description, setDescription] = useState('');

  // اطلاعات توزین و باسکول دیجیتال
  const [scaleTicketNo, setScaleTicketNo] = useState('');
  const [scaleGrossKg, setScaleGrossKg] = useState('');
  const [scaleTareKg, setScaleTareKg] = useState('');
  const [nominalWeightKg, setNominalWeightKg] = useState('');
  const [scalePhotoFile, setScalePhotoFile] = useState<File | null>(null);
  const [scalePhotoPreview, setScalePhotoPreview] = useState<string | null>(null);

  // اطلاعات بارنامه، ناوگان و راننده
  const [waybillNo, setWaybillNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverNationalId, setDriverNationalId] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [freightPaymentTerm, setFreightPaymentTerm] = useState<'PAID_BY_CUSTOMER' | 'PAID_BY_COMPANY'>('PAID_BY_CUSTOMER');

  // امضا و پیوست‌ها
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // بارگذاری لیست انبارها و فاکتورهای مشتری
  useEffect(() => {
    async function loadOptions() {
      try {
        const [whRes, invRes] = await Promise.all([
          fetch('/api/khoshmin/warehouses'),
          fetch(`/api/khoshmin/customers/${customerId}/invoices`),
        ]);
        if (whRes.ok) {
          const whData = await whRes.json();
          setWarehouses(whData);
          const fg = whData.find((w: WarehouseOption) => w.type === 'FINISHED_GOODS');
          if (fg) setWarehouseId(fg.id);
        }
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(Array.isArray(invData) ? invData : []);
        }
      } catch (err) {
        console.error('Error loading options:', err);
      }
    }
    loadOptions();
  }, [customerId]);

  // محاسبات زنده باسکول دیجیتال (Single Source of Truth)
  const gross = parseFloat(scaleGrossKg) || 0;
  const tare = parseFloat(scaleTareKg) || 0;
  const netWeight = gross > tare ? gross - tare : 0;
  const nominal = parseFloat(nominalWeightKg) || 0;

  let variancePercent: number | null = null;
  let isToleranceExceeded = false;
  if (nominal > 0 && netWeight > 0) {
    variancePercent = Math.round((Math.abs(netWeight - nominal) / nominal) * 10000) / 100;
    if (variancePercent > 2.0) {
      isToleranceExceeded = true;
    }
  }

  // تولید خودکار شماره قبض باسکول و بارنامه
  const generateScaleTicketNo = () => {
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    setScaleTicketNo(`SCL-${randomSeq}`);
  };

  const generateWaybillNo = () => {
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    setWaybillNo(`WAY-${randomSeq}`);
  };

  // اعتبارسنجی فرم
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!productName.trim()) newErrors.productName = 'نام یا شرح محصول الزامی است.';
    if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = 'مقدار ارسالی باید بزرگتر از صفر باشد.';
    if (!deliveryDate) newErrors.deliveryDate = 'تاریخ تحویل الزامی است.';

    if (scaleGrossKg && scaleTareKg) {
      if (gross <= tare) {
        newErrors.scaleGrossKg = 'وزن پر باسکول باید بیشتر از وزن خالی (تارا) باشد.';
      }
    }

    if (driverNationalId && !/^\d{10}$/.test(driverNationalId.trim())) {
      newErrors.driverNationalId = 'کد ملی راننده باید دقیقاً ۱۰ رقم باشد.';
    }

    if (driverPhone && !/^09\d{9}$/.test(driverPhone.trim())) {
      newErrors.driverPhone = 'شماره تلفن راننده باید با ۰۹ شروع شده و ۱۱ رقم باشد.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showAlert('لطفاً خطاهای فرم را برطرف نمایید.', 'خطا در اعتبارسنجی', 'error');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('quantity', quantity);
      formData.append('unit', unit);
      formData.append('deliveryDate', deliveryDate);
      formData.append('status', status);
      formData.append('description', description);

      if (warehouseId) formData.append('warehouseId', warehouseId);
      if (invoiceId) formData.append('invoiceId', invoiceId);

      // باسکول
      if (scaleTicketNo) formData.append('scaleTicketNo', scaleTicketNo);
      if (scaleGrossKg) formData.append('scaleGrossKg', scaleGrossKg);
      if (scaleTareKg) formData.append('scaleTareKg', scaleTareKg);
      if (nominalWeightKg) formData.append('nominalWeightKg', nominalWeightKg);
      if (scalePhotoFile) formData.append('scalePhoto', scalePhotoFile);

      // بارنامه
      if (waybillNo) formData.append('waybillNo', waybillNo);
      if (driverName) formData.append('driverName', driverName);
      if (driverNationalId) formData.append('driverNationalId', driverNationalId);
      if (driverPhone) formData.append('driverPhone', driverPhone);
      if (truckPlate) formData.append('truckPlate', truckPlate);
      if (shippingCompany) formData.append('shippingCompany', shippingCompany);
      if (freightCost) formData.append('freightCost', freightCost);
      formData.append('freightPaymentTerm', freightPaymentTerm);

      // امضا و پیوست‌ها
      if (signatureFile) formData.append('signature', signatureFile);
      attachments.forEach((file) => formData.append('attachments', file));

      const res = await fetch(`/api/khoshmin/customers/${customerId}/deliveries`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        showAlert('حواله خروج و بارنامه با موفقیت در سیستم ثبت گردید.', 'ثبت موفق', 'success');
        router.push(`/khoshmin/customers/${customerId}?tab=deliveries`);
      } else {
        const errorData = await res.json();
        showAlert(errorData.error || 'خطا در ثبت حواله تحویل', 'خطا', 'error');
      }
    } catch (err) {
      console.error('Error submitting delivery:', err);
      showAlert('خطای ارتباط با سرور در حین ثبت اطلاعات.', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showAlert(`فایل ${file.name} بیشتر از ۱۰ مگابایت است.`, 'خطا', 'error');
        continue;
      }
      setAttachments((prev) => [...prev, file]);
      setAttachmentNames((prev) => [...prev, file.name]);
      if (file.type.startsWith('image/')) {
        setAttachmentPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      } else {
        setAttachmentPreviews((prev) => [...prev, '']);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentNames((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12" dir="rtl">
      {/* هدر صفحه */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/khoshmin/customers/${customerId}?tab=deliveries`)}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition text-gray-600"
            title="بازگشت به لیست تحویل‌ها"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              ثبت بارنامه، توزین باسکول و حواله خروج انبار
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              کنترل یکپارچه توزین صنعتی، ناوگان حمل و نقل و صدور سند دوبل بهای تمام‌شده (COGS)
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="font-mono bg-blue-50 text-blue-800 text-xs px-3 py-1.5 rounded-xl font-bold border border-blue-200">
            کارخانه مرکزی خوش‌صنعت پایدار
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ۱. اطلاعات کالا، انبار و فاکتور */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
            <Package size={20} className="text-blue-600" />
            مشخصات کالا و حواله فروش
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">
                نام یا شرح کالای تحویلی <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثال: بست و اتصالات سازه‌ای گالوانیزه رده ۴۰"
                className={`w-full p-2.5 border rounded-xl bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.productName ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.productName && <p className="text-red-500 text-[11px] mt-1">{errors.productName}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">انبار مبدا بارگیری</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                مقدار / تعداد تحویلی <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className={`w-full p-2.5 border rounded-xl bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.quantity && <p className="text-red-500 text-[11px] mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">واحد سنجش</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
              >
                <option value="شاخه">شاخه</option>
                <option value="کیلوگرم">کیلوگرم (kg)</option>
                <option value="تن">تن</option>
                <option value="عدد">عدد</option>
                <option value="بسته">بسته</option>
                <option value="متر">متر</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">فاکتور فروش مرتبط (اختیاری)</label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
              >
                <option value="">-- بدون انتخاب فاکتور --</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    فاکتور #{inv.invoiceNo} (مبلغ: {Number(inv.finalAmount).toLocaleString('fa-IR')} تومان)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ۲. باسکول دیجیتال و توزین (Single Source of Truth) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
              <Scale size={20} className="text-blue-600" />
              توزین باسکول دیجیتال کارخانه (Single Source of Truth)
            </h2>
            <button
              type="button"
              onClick={generateScaleTicketNo}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <Sparkles size={14} /> تولید شماره قبض خودکار
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">شماره قبض باسکول</label>
              <input
                type="text"
                value={scaleTicketNo}
                onChange={(e) => setScaleTicketNo(e.target.value)}
                placeholder="مثال: SCL-104820"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">وزن ناخالص پر (Gross Kg)</label>
              <input
                type="number"
                step="any"
                value={scaleGrossKg}
                onChange={(e) => setScaleGrossKg(e.target.value)}
                placeholder="وزن کامیون با بار"
                className={`w-full p-2.5 border rounded-xl bg-white text-gray-900 outline-none font-mono ${
                  errors.scaleGrossKg ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.scaleGrossKg && <p className="text-red-500 text-[11px] mt-1">{errors.scaleGrossKg}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">وزن خالی تارا (Tare Kg)</label>
              <input
                type="number"
                step="any"
                value={scaleTareKg}
                onChange={(e) => setScaleTareKg(e.target.value)}
                placeholder="وزن تریلی بدون بار"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">وزن محاسباتی اسمی (Nominal Kg)</label>
              <input
                type="number"
                step="any"
                value={nominalWeightKg}
                onChange={(e) => setNominalWeightKg(e.target.value)}
                placeholder="وزن مهندسی استاندارد"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
              />
            </div>
          </div>

          {/* باکس مقایسه و محاسبه زنده وزن خالص */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-gray-500 block mb-1">وزن خالص باسکول (Net = Gross - Tare)</span>
              <span className="text-base font-black font-mono text-blue-700">
                {netWeight > 0 ? `${netWeight.toLocaleString('fa-IR')} کیلوگرم` : '---'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-gray-500 block mb-1">درصد انحراف از وزن اسمی</span>
              <span className={`text-base font-black font-mono ${isToleranceExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {variancePercent !== null ? `${variancePercent}%` : '---'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-center items-center">
              <span className="text-gray-500 block mb-1">وضعیت تلورانس مجاز (۲٪)</span>
              {variancePercent !== null ? (
                isToleranceExceeded ? (
                  <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs">
                    <ShieldAlert size={14} /> خارج از تلورانس مجاز
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <CheckCircle2 size={14} /> تطابق استاندارد
                  </span>
                )
              ) : (
                <span className="text-gray-400">نیازمند ورود اوزان</span>
              )}
            </div>
          </div>

          {isToleranceExceeded && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>
                <strong>توجه:</strong> مغایرت وزن خالص با وزن اسمی فراتر از سقف تلورانس ۲ درصد است. تایید حواله مستلزم بازبینی سرپرست انبار و متصدی باسکول خواهد بود.
              </span>
            </div>
          )}

          {/* آپلود تصویر قبض باسکول */}
          <div className="pt-2 text-xs">
            <label className="block font-bold text-gray-700 mb-1">تصویر یا اسکن قبض باسکول دیجیتال</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl cursor-pointer transition">
                <Upload size={16} className="text-gray-500" />
                <span className="text-gray-600 font-medium">انتخاب تصویر قبض باسکول</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setScalePhotoFile(f);
                      setScalePhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>

              {scalePhotoPreview && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-blue-800">
                  <span className="text-[11px] truncate max-w-[200px]">{scalePhotoFile?.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScalePhotoFile(null);
                      setScalePhotoPreview(null);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ۳. مشخصات ناوگان، راننده و بارنامه جاده‌ای */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
              <Truck size={20} className="text-blue-600" />
              مشخصات راننده، ناوگان ترابری و بارنامه جاده‌ای
            </h2>
            <button
              type="button"
              onClick={generateWaybillNo}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <Sparkles size={14} /> تولید شماره بارنامه خودکار
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">شماره بارنامه</label>
              <input
                type="text"
                value={waybillNo}
                onChange={(e) => setWaybillNo(e.target.value)}
                placeholder="مثال: WAY-000452"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">نام و نام خانوادگی راننده</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="مثال: علی احمدی"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">کد ملی راننده (۱۰ رقم)</label>
              <input
                type="text"
                value={driverNationalId}
                onChange={(e) => setDriverNationalId(e.target.value)}
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                className={`w-full p-2.5 border rounded-xl bg-white text-gray-900 outline-none font-mono ${
                  errors.driverNationalId ? 'border-red-500' : 'border-gray-200'
                }`}
                dir="ltr"
              />
              {errors.driverNationalId && <p className="text-red-500 text-[11px] mt-1">{errors.driverNationalId}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">شماره موبایل راننده</label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className={`w-full p-2.5 border rounded-xl bg-white text-gray-900 outline-none font-mono ${
                  errors.driverPhone ? 'border-red-500' : 'border-gray-200'
                }`}
                dir="ltr"
              />
              {errors.driverPhone && <p className="text-red-500 text-[11px] mt-1">{errors.driverPhone}</p>}
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">شماره پلاک تریلی / ناوگان</label>
              <input
                type="text"
                value={truckPlate}
                onChange={(e) => setTruckPlate(e.target.value)}
                placeholder="۱۲ ع ۳۴۵ ایران ۶۷"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">شرکت باربری / حمل‌ونقل</label>
              <input
                type="text"
                value={shippingCompany}
                onChange={(e) => setShippingCompany(e.target.value)}
                placeholder="مثال: باربری پارس ترابر"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">کرایه حمل (تومان)</label>
              <input
                type="number"
                step="any"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
                placeholder="0"
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">شرایط پرداخت کرایه حمل</label>
              <select
                value={freightPaymentTerm}
                onChange={(e) => setFreightPaymentTerm(e.target.value as any)}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
              >
                <option value="PAID_BY_CUSTOMER">پس‌کرایه (به عهده خریدار در مقصد)</option>
                <option value="PAID_BY_COMPANY">پیش‌کرایه (به عهده شرکت خوش‌صنعت)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ۴. تاریخ، وضعیت اولیه، رسید و پیوست‌ها */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
            <Calendar size={20} className="text-blue-600" />
            تاریخ بارگیری، وضعیت و تاییدیه تحویل
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                تاریخ تحویل / خروج (شمسی) <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={new Date(deliveryDate)}
                onChange={(dateObj: any) => {
                  if (dateObj) {
                    const date = dateObj.toDate();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setDeliveryDate(`${year}-${month}-${day}`);
                  }
                }}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none"
                containerClassName="w-full"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">وضعیت اولیه تحویل بار</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none font-bold"
              >
                <option value="PENDING">در انتظار تایید (پیش‌نویس)</option>
                <option value="PREPARING">در حال بارگیری در کارخانه</option>
                <option value="DELIVERED">تحویل قطعی (صدور آنی حواله انبار و سند COGS)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">رسید / امضای تحویل‌گیرنده</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSignatureFile(f);
                    setSignaturePreview(URL.createObjectURL(f));
                  }
                }}
                className="w-full p-2 border border-gray-200 rounded-xl bg-white text-gray-700 text-xs"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-bold text-gray-700 mb-1">سایر مدارک و پیوست‌های تحویل</label>
              <input
                type="file"
                multiple
                onChange={handleAttachmentsChange}
                className="w-full p-2 border border-gray-200 rounded-xl bg-white text-gray-700 text-xs"
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 text-xs">
                      <span>{att.name}</span>
                      <button type="button" onClick={() => removeAttachment(i)} className="text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="block font-bold text-gray-700 mb-1">توضیحات تکمیلی</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="نکات مربوط به بارگیری، محل تخلیه یا ملاحظات فنی..."
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* دکمه‌های ثبت و انصراف */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/khoshmin/customers/${customerId}?tab=deliveries`)}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition"
          >
            انصراف و بازگشت
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-md disabled:bg-blue-400"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            ثبت نهایی حواله خروج و بارنامه
          </button>
        </div>
      </form>
    </div>
  );
}