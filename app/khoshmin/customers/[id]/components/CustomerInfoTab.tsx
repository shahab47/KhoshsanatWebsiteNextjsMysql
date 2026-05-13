'use client';
// مسیر فایل: src/app/khoshmin/customers/[id]/components/CustomerInfoTab.tsx

import { useState, useEffect } from 'react';
import { User, Mail, Phone, CreditCard, Building2, MapPin, Briefcase, Edit, Save, X, Loader2 } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

export function CustomerInfoTab({ customerId }: { customerId: string }) {
  const { showAlert } = useModal();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/khoshmin/customers/${customerId}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data);
          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            company: data.company || '',
            address: data.address || '',
            nationalId: data.nationalId || '',
            status: data.status,
          });
        } else {
          showAlert('خطا در دریافت اطلاعات مشتری', 'خطا', 'error');
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات مشتری', error);
        showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId, showAlert]);

  const handleNumberOnly = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'nationalId') => {
    const numeric = e.target.value.replace(/\D/g, '');
    setFormData((prev: any) => ({ ...prev, [field]: numeric }));
    if (errors[field]) setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'نام الزامی است';
    if (!formData.email?.trim()) newErrors.email = 'ایمیل الزامی است';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'ایمیل نامعتبر است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setCustomer(updated);
        setIsEditing(false);
        showAlert('اطلاعات مشتری با موفقیت به‌روز شد ✅', 'موفقیت', 'success');
      } else {
        const errData = await res.json();
        showAlert(errData.error || 'در ذخیره اطلاعات مشکلی پیش آمد.', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      nationalId: customer.nationalId || '',
      status: customer.status,
    });
    setErrors({});
    setIsEditing(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 text-blue-500">
      <Loader2 className="animate-spin mb-2" size={32} />
      <p className="font-bold">در حال دریافت اطلاعات...</p>
    </div>
  );
  
  if (!customer) return <div className="text-center py-8 text-gray-500 font-bold">اطلاعاتی یافت نشد</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end border-b border-gray-100 pb-4">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-colors font-bold shadow-sm">
            <Edit size={18} /> ویرایش اطلاعات مشتری
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={submitting} className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold shadow-lg shadow-green-500/20 transition-all">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
              {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
            <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-all">
              <X size={18} /> انصراف
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* اطلاعات شخصی */}
        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><User size={20} /></div>
            اطلاعات شخصی
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5"><User size={16} className="text-gray-400" /> نام:</span>
              {isEditing ? (
                <div className="flex-1"><input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full border ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500`} />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}</div>
              ) : <span className="flex-1 font-medium">{customer.name}</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5"><Mail size={16} className="text-gray-400" /> ایمیل:</span>
              {isEditing ? (
                <div className="flex-1"><input type="email" dir="ltr" name="email" value={formData.email} onChange={handleChange} className={`w-full text-left border ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500`} />{errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}</div>
              ) : <span className="flex-1 font-mono text-sm">{customer.email}</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5"><Phone size={16} className="text-gray-400" /> تلفن:</span>
              {isEditing ? (
                <input type="tel" dir="ltr" inputMode="numeric" value={formData.phone} onChange={(e) => handleNumberOnly(e, 'phone')} className="flex-1 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-left" />
              ) : <span className="flex-1 font-mono">{customer.phone || <span className="text-gray-400 text-sm">ثبت نشده</span>}</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5"><CreditCard size={16} className="text-gray-400" /> کد ملی:</span>
              {isEditing ? (
                <input type="text" dir="ltr" inputMode="numeric" value={formData.nationalId} onChange={(e) => handleNumberOnly(e, 'nationalId')} className="flex-1 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-left" />
              ) : <span className="flex-1 font-mono tracking-widest">{customer.nationalId || <span className="text-gray-400 text-sm tracking-normal">ثبت نشده</span>}</span>}
            </div>
          </div>
        </div>

        {/* اطلاعات سازمانی */}
        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Building2 size={20} /></div>
            اطلاعات سازمانی و وضعیت
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5"><Briefcase size={16} className="text-gray-400" /> شرکت:</span>
              {isEditing ? (
                <input type="text" name="company" value={formData.company} onChange={handleChange} className="flex-1 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              ) : <span className="flex-1 font-medium">{customer.company || <span className="text-gray-400 text-sm">ثبت نشده</span>}</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-gray-700">
              <span className="font-bold w-24 flex items-center gap-1.5 mt-2"><MapPin size={16} className="text-gray-400" /> آدرس:</span>
              {isEditing ? (
                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="flex-1 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              ) : <span className="flex-1 font-medium leading-relaxed mt-2">{customer.address || <span className="text-gray-400 text-sm">ثبت نشده</span>}</span>}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700 pt-2">
              <span className="font-bold w-24">وضعیت کاربر:</span>
              {isEditing ? (
                <select name="status" value={formData.status} onChange={handleChange} className="flex-1 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                  <option value="ACTIVE">فعال (مشتری جاری)</option>
                  <option value="LEAD">سرنخ (مشتری بالقوه)</option>
                  <option value="INACTIVE">غیرفعال (آرشیو شده)</option>
                  <option value="BLOCKED">مسدود (بلک‌لیست)</option>
                </select>
              ) : (
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                  customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                  customer.status === 'LEAD' ? 'bg-blue-100 text-blue-700' : 
                  customer.status === 'INACTIVE' ? 'bg-gray-200 text-gray-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {customer.status === 'ACTIVE' ? 'فعال' : customer.status === 'LEAD' ? 'سرنخ' : customer.status === 'INACTIVE' ? 'غیرفعال' : 'مسدود'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-left">
        <span className="inline-block bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200">
          تاریخ عضویت در سیستم: {new Date(customer.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}