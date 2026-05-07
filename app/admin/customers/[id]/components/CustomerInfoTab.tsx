// app/admin/customers/[id]/components/CustomerInfoTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, CreditCard, Building2, MapPin, Briefcase, Edit, Save, X } from 'lucide-react';

export function CustomerInfoTab({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
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
      } catch (error) {
        console.error('خطا در دریافت اطلاعات مشتری', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId]);

  const handleNumberOnly = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'nationalId') => {
    const numeric = e.target.value.replace(/\D/g, '');
    // نوع prev در اینجا صراحتاً به صورت any تعریف شد تا خطای بیلد رفع شود
    setFormData((prev: any) => ({ ...prev, [field]: numeric }));
    if (errors[field]) setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // نوع prev در اینجا هم برای رفع خطای احتمالی بعدی صراحتاً به صورت any تعریف شد
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
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomer(updated);
        setIsEditing(false);
        alert('اطلاعات به‌روز شد');
      } else {
        alert('خطا در ذخیره');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
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

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;
  if (!customer) return <div className="text-center py-8">اطلاعاتی یافت نشد</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-xl hover:bg-blue-50">
            <Edit size={18} /> ویرایش اطلاعات
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
              <Save size={18} /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">
              <X size={18} /> انصراف
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18} /> اطلاعات شخصی</h3>
          <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2 text-gray-700"><User size={16} /><span className="font-medium w-24">نام:</span>{isEditing ? <input type="text" name="name" value={formData.name} onChange={handleChange} className="flex-1 border rounded-lg p-2" /> : <span>{customer.name}</span>}{errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}</div>
            <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /><span className="font-medium w-24">ایمیل:</span>{isEditing ? <input type="email" name="email" value={formData.email} onChange={handleChange} className="flex-1 border rounded-lg p-2" /> : <span>{customer.email}</span>}{errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}</div>
            <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /><span className="font-medium w-24">تلفن:</span>{isEditing ? <input type="tel" inputMode="numeric" value={formData.phone} onChange={(e) => handleNumberOnly(e, 'phone')} className="flex-1 border rounded-lg p-2" /> : <span>{customer.phone || '-'}</span>}</div>
            <div className="flex items-center gap-2 text-gray-700"><CreditCard size={16} /><span className="font-medium w-24">کد ملی:</span>{isEditing ? <input type="text" inputMode="numeric" value={formData.nationalId} onChange={(e) => handleNumberOnly(e, 'nationalId')} className="flex-1 border rounded-lg p-2" /> : <span>{customer.nationalId || '-'}</span>}</div>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} /> اطلاعات سازمانی</h3>
          <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2 text-gray-700"><Briefcase size={16} /><span className="font-medium w-24">شرکت:</span>{isEditing ? <input type="text" name="company" value={formData.company} onChange={handleChange} className="flex-1 border rounded-lg p-2" /> : <span>{customer.company || '-'}</span>}</div>
            <div className="flex items-start gap-2 text-gray-700"><MapPin size={16} className="mt-0.5" /><span className="font-medium w-24">آدرس:</span>{isEditing ? <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="flex-1 border rounded-lg p-2" /> : <span className="flex-1">{customer.address || '-'}</span>}</div>
            <div className="flex items-center gap-2 text-gray-700"><span className="font-medium w-24">وضعیت:</span>{isEditing ? <select name="status" value={formData.status} onChange={handleChange} className="border rounded-lg p-2"><option value="ACTIVE">فعال</option><option value="LEAD">سرنخ</option><option value="INACTIVE">غیرفعال</option><option value="BLOCKED">مسدود</option></select> : <span>{customer.status === 'ACTIVE' ? 'فعال' : customer.status === 'LEAD' ? 'سرنخ' : customer.status === 'INACTIVE' ? 'غیرفعال' : 'مسدود'}</span>}</div>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-400">تاریخ عضویت: {new Date(customer.createdAt).toLocaleDateString('fa-IR')}</p>
    </div>
  );
}