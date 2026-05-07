// src/app/admin/customers/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  CreditCard,
  X
} from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',      // فقط عدد
    company: '',
    address: '',
    nationalId: '', // فقط عدد
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // تابع کمکی برای نگه‌داری فقط اعداد
  const handleNumberOnly = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'phone' | 'nationalId'
  ) => {
    const rawValue = e.target.value;
    const numericValue = rawValue.replace(/\D/g, ''); // حذف هر کاراکتر غیر عددی
    setFormData(prev => ({ ...prev, [fieldName]: numericValue }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  // جلوگیری از paste متن غیرعددی
  const handlePasteNumberOnly = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!/^\d*$/.test(pastedText)) {
      e.preventDefault();
      alert('لطفاً فقط عدد وارد کنید');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // برای فیلدهای معمولی (غیر عددی)
    if (name !== 'phone' && name !== 'nationalId') {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
    // فیلدهای عددی توسط handleNumberOnly مدیریت می‌شوند
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'نام و نام خانوادگی الزامی است';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'آدرس ایمیل الزامی است';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'آدرس ایمیل معتبر نیست';
    }
    // اعتبارسنجی اختیاری برای شماره تلفن (حداقل طول و فقط عدد)
    if (formData.phone && !/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'شماره تماس فقط می‌تواند شامل عدد باشد';
    }
    if (formData.nationalId && !/^\d+$/.test(formData.nationalId)) {
      newErrors.nationalId = 'کد ملی فقط می‌تواند شامل عدد باشد';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const newCustomer = await res.json();
        alert('مشتری با موفقیت اضافه شد');
        router.push(`/admin/customers/${newCustomer.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در افزودن مشتری');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">افزودن مشتری جدید</h1>
          <p className="text-gray-500 mt-1">اطلاعات مشتری را وارد کنید</p>
        </div>
      </div>

      {/* فرم اصلی */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          
          {/* اطلاعات شخصی */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
              <User size={20} className="text-blue-600" />
              اطلاعات شخصی
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام و نام خانوادگی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800 ${
                    errors.name ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="مثال: علی محمدی"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  آدرس ایمیل <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800 ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="example@domain.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  شماره تماس
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 text-gray-400" size={18} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => handleNumberOnly(e, 'phone')}
                    onPaste={handlePasteNumberOnly}
                    className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                    placeholder="09123456789"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کد ملی
                </label>
                <div className="relative">
                  <CreditCard className="absolute right-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.nationalId}
                    onChange={(e) => handleNumberOnly(e, 'nationalId')}
                    onPaste={handlePasteNumberOnly}
                    className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                    placeholder="1234567890"
                  />
                </div>
                {errors.nationalId && (
                  <p className="text-red-500 text-xs mt-1">{errors.nationalId}</p>
                )}
              </div>
            </div>
          </div>

          {/* اطلاعات سازمانی */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
              <Building2 size={20} className="text-blue-600" />
              اطلاعات سازمانی
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام شرکت
                </label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                    placeholder="شرکت نمونه"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  وضعیت
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                >
                  <option value="ACTIVE">فعال</option>
                  <option value="LEAD">سرنخ</option>
                  <option value="INACTIVE">غیرفعال</option>
                  <option value="BLOCKED">مسدود</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                آدرس
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 text-gray-400" size={18} />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-gray-800"
                  placeholder="آدرس کامل"
                />
              </div>
            </div>
          </div>

          {/* دکمه‌های ارسال */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'در حال ثبت...' : 'ثبت مشتری جدید'}
            </button>
            <Link
              href="/admin/customers"
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition text-center"
            >
              انصراف
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}