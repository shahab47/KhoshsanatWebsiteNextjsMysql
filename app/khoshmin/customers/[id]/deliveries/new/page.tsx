// app/khoshmin/customers/[id]/deliveries/new/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, X, Upload, FileText, Trash2, Package, Calendar, Clock, CheckCircle, AlertCircle, Printer, Download, Share2
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function NewDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert, showConfirm } = useModal();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    unit: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    description: ''
  });

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialFormData = useRef({
    productName: '',
    quantity: '',
    unit: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    description: ''
  });
  const initialSignatureFile = useRef<File | null>(null);
  const initialAttachmentsCount = useRef(0);

  const isDirty = () => {
    if (JSON.stringify(formData) !== JSON.stringify(initialFormData.current)) return true;
    if (signatureFile !== initialSignatureFile.current) return true;
    if (attachments.length !== initialAttachmentsCount.current) return true;
    return false;
  };

  const handleGoBack = () => {
    if (isDirty()) {
      showConfirm({
        title: 'خروج بدون ذخیره',
        message: 'تغییرات شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: () => {
          if (signaturePreview) URL.revokeObjectURL(signaturePreview);
          attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
          router.push(`/khoshmin/customers/${customerId}?tab=deliveries`);
        },
      });
    } else {
      router.push(`/khoshmin/customers/${customerId}?tab=deliveries`);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, signatureFile, attachments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleDateChange = (dateObj: any) => {
    if (dateObj) {
      const date = dateObj.toDate();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setFormData(prev => ({ ...prev, deliveryDate: `${year}-${month}-${day}` }));
    } else {
      setFormData(prev => ({ ...prev, deliveryDate: '' }));
    }
  };

  const getInitialDate = (): Date | undefined => {
    if (formData.deliveryDate) {
      const [year, month, day] = formData.deliveryDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('فایل امضا باید تصویر باشد (jpg, png)', 'خطا', 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showAlert('حجم فایل امضا نباید بیشتر از 2 مگابایت باشد', 'خطا', 'error');
        return;
      }
      setSignatureFile(file);
      if (signaturePreview) URL.revokeObjectURL(signaturePreview);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const removeSignature = () => {
    if (signaturePreview) {
      URL.revokeObjectURL(signaturePreview);
      setSignaturePreview(null);
    }
    setSignatureFile(null);
    if (signatureInputRef.current) signatureInputRef.current.value = '';
  };

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert(`فایل ${file.name} بزرگتر از 5 مگابایت است`, 'خطا', 'error');
        continue;
      }
      setAttachments(prev => [...prev, file]);
      setAttachmentNames(prev => [...prev, file.name]);
      if (file.type.startsWith('image/')) {
        setAttachmentPreviews(prev => [...prev, URL.createObjectURL(file)]);
      } else {
        setAttachmentPreviews(prev => [...prev, '']);
      }
    }
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    if (attachmentPreviews[index]) {
      URL.revokeObjectURL(attachmentPreviews[index]);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentNames(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.productName.trim()) newErrors.productName = 'نام محصول الزامی است';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) newErrors.quantity = 'مقدار محصول معتبر نیست';
    if (!formData.deliveryDate) newErrors.deliveryDate = 'تاریخ تحویل الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const submitFormData = new FormData();
    submitFormData.append('productName', formData.productName);
    submitFormData.append('quantity', formData.quantity);
    submitFormData.append('unit', formData.unit);
    submitFormData.append('deliveryDate', formData.deliveryDate);
    submitFormData.append('status', formData.status);
    submitFormData.append('description', formData.description);
    if (signatureFile) submitFormData.append('signature', signatureFile);
    attachments.forEach(file => submitFormData.append('attachments', file));

    try {
      const response = await fetch(`/api/khoshmin/customers/${customerId}/deliveries`, { method: 'POST', body: submitFormData });
      if (response.ok) {
        showAlert('فرم تحویل بار با موفقیت ثبت شد', 'موفقیت', 'success');
        router.push(`/khoshmin/customers/${customerId}?tab=deliveries`);
      } else {
        const error = await response.json();
        showAlert(error.error || 'خطا در ثبت فرم تحویل بار', 'خطا', 'error');
      }
    } catch (error) {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'PENDING', label: 'در انتظار', icon: <Clock size={16} />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { value: 'PREPARING', label: 'در حال آماده‌سازی', icon: <Package size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'DELIVERED', label: 'تحویل داده شده', icon: <CheckCircle size={16} />, color: 'text-green-600', bg: 'bg-green-50' },
    { value: 'RETURNED', label: 'برگشت خورده', icon: <AlertCircle size={16} />, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  const units = [
    { value: '', label: 'بدون واحد' },
    { value: 'کیلوگرم', label: 'کیلوگرم (kg)' },
    { value: 'گرم', label: 'گرم (g)' },
    { value: 'متر', label: 'متر (m)' },
    { value: 'سانتی‌متر', label: 'سانتی‌متر (cm)' },
    { value: 'عدد', label: 'عدد' },
    { value: 'بسته', label: 'بسته' },
    { value: 'تن', label: 'تن' },
    { value: 'لیتر', label: 'لیتر' }
  ];

  const handleDownloadLocalFile = (file: File, name: string) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLocalFile = async (file: File, name: string) => {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'مدرک پیوست',
          files: [file],
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showAlert('اشتراک‌گذاری لغو شد یا با خطا مواجه گردید.', 'خطا', 'error');
        }
      }
    } else {
      handleDownloadLocalFile(file, name);
      showAlert('مرورگر شما از اشتراک فایل پشتیبانی نمی‌کند. فایل دانلود شد.', 'اطلاعات', 'info');
    }
  };

  const handlePrintLocalImage = (previewUrl: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showAlert('پاپ‌آپ مسدود شده است. لطفاً اجازه دهید.', 'خطا', 'error');
      return;
    }
    printWindow.document.write(`
      <html><head><title>چاپ تصویر</title></head>
      <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
        <img src="${previewUrl}" style="max-width:100%;max-height:100%;" />
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={handleGoBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">ثبت تحویل بار جدید</h1>
          <p className="text-gray-500 mt-1">اطلاعات مربوط به تحویل محصول به مشتری را وارد کنید</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
              <Package size={20} className="text-blue-600" />
              اطلاعات محصول
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400 ${
                    errors.productName ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="مثال: سیمان پرتلند 50 کیلویی"
                />
                {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مقدار <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    step="0.01"
                    className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400 ${
                      errors.quantity ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="0"
                  />
                  {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">واحد</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                  >
                    {units.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
              <Calendar size={20} className="text-blue-600" />
              تاریخ و وضعیت
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div dir="rtl">
                <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تحویل (شمسی) <span className="text-red-500">*</span></label>
                <DatePicker
                  value={getInitialDate()}
                  onChange={handleDateChange}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass={`w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deliveryDate ? 'border-red-500' : 'border-gray-200'}`}
                  containerClassName="w-full"
                  placeholder="انتخاب تاریخ"
                />
                {errors.deliveryDate && <p className="text-red-500 text-xs mt-1">{errors.deliveryDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت تحویل</label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map(option => (
                    <label key={option.value} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition ${formData.status === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="status" value={option.value} checked={formData.status === option.value} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className={`flex items-center gap-1 text-sm ${option.color}`}>{option.icon}{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات اضافی</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400"
              placeholder="توضیحات مربوط به تحویل بار، شرایط حمل، نکات خاص و... (اختیاری)"
            />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
              <FileText size={20} className="text-blue-600" />
              مستندات
            </h2>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">امضای مشتری (اختیاری)</label>
              {!signaturePreview ? (
                <div onClick={() => signatureInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition">
                  <Upload size={32} className="text-gray-400" />
                  <p className="text-sm text-gray-500">برای آپلود امضا کلیک کنید</p>
                  <p className="text-xs text-gray-400">فرمت‌های مجاز: JPG, PNG (حداکثر 2MB)</p>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img 
                    src={signaturePreview} 
                    alt="امضا" 
                    className="max-h-32 border rounded-lg p-2 bg-gray-50" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                  <div className="hidden text-red-500 text-sm">خطا در بارگذاری تصویر</div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => handlePrintLocalImage(signaturePreview)} className="p-1 bg-gray-100 rounded" title="چاپ"><Printer size={16} /></button>
                    <button type="button" onClick={() => signatureFile && handleDownloadLocalFile(signatureFile, 'signature.png')} className="p-1 bg-gray-100 rounded" title="دانلود"><Download size={16} /></button>
                    <button type="button" onClick={() => signatureFile && handleShareLocalFile(signatureFile, 'signature.png')} className="p-1 bg-gray-100 rounded" title="اشتراک"><Share2 size={16} /></button>
                  </div>
                  <button type="button" onClick={removeSignature} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={14} /></button>
                </div>
              )}
              <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureChange} className="hidden" />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">فایل‌های پیوست (اختیاری)</label>
              <div onClick={() => attachmentInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition">
                <Upload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500">برای آپلود فایل کلیک کنید</span>
              </div>
              <input ref={attachmentInputRef} type="file" multiple onChange={handleAttachmentsChange} className="hidden" />
              {attachmentNames.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachmentNames.map((name, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {attachmentPreviews[idx] && (
                          <img src={attachmentPreviews[idx]} alt="پیش‌نمایش" className="w-8 h-8 object-cover rounded" />
                        )}
                        <span className="text-sm text-gray-700">{name}</span>
                      </div>
                      <div className="flex gap-2">
                        {attachmentPreviews[idx] && (
                          <button type="button" onClick={() => handlePrintLocalImage(attachmentPreviews[idx])} className="p-1 hover:bg-gray-200 rounded" title="چاپ"><Printer size={14} /></button>
                        )}
                        <button type="button" onClick={() => handleDownloadLocalFile(attachments[idx], name)} className="p-1 hover:bg-gray-200 rounded" title="دانلود"><Download size={14} /></button>
                        <button type="button" onClick={() => handleShareLocalFile(attachments[idx], name)} className="p-1 hover:bg-gray-200 rounded" title="اشتراک"><Share2 size={14} /></button>
                        <button type="button" onClick={() => {
                          showConfirm({
                            title: 'حذف فایل',
                            message: 'آیا از حذف این فایل اطمینان دارید؟',
                            type: 'warning',
                            confirmText: 'بله، حذف شود',
                            cancelText: 'انصراف',
                            onConfirm: () => removeAttachment(idx)
                          });
                        }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="حذف"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={20} /> {loading ? 'در حال ثبت...' : 'ثبت فرم تحویل بار'}
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition text-center"
            >
              انصراف
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}