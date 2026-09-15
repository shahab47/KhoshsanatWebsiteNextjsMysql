// components/contact/ContactForm.tsx
'use client';

import React, { useState } from 'react';
import { Send, MessageSquare, User, Mail as MailIcon } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'نام و نام خانوادگی الزامی است';
    if (!formData.email.trim()) newErrors.email = 'آدرس ایمیل الزامی است';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'آدرس ایمیل معتبر نیست';
    if (!formData.subject.trim()) newErrors.subject = 'موضوع پیام الزامی است';
    if (!formData.message.trim()) newErrors.message = 'متن پیام الزامی است';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('✅ پیام شما با موفقیت ارسال شد. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setErrors({});
      } else {
        setSuccessMessage(`❌ ${data.error || 'خطا در ارسال پیام. لطفا مجددا تلاش کنید.'}`);
      }
    } catch (error) {
      setSuccessMessage('❌ خطا در ارتباط با سرور. لطفا مجددا تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="text-ks-blue-500" size={28} />
        <h2 className="text-2xl font-bold text-gray-900">ارسال پیام و استعلام قیمت</h2>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-bold mb-2 text-gray-800">
              نام و نام خانوادگی <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <User className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
              <input
                id="contact-name"
                type="text"
                name="name"
                required
                aria-required="true"
                aria-invalid={errors.name ? "true" : "false"}
                value={formData.name}
                onChange={handleChange}
                className={`w-full border rounded-xl py-3 pr-11 pl-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ks-blue-500 transition-colors ${
                  errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-ks-blue-500'
                }`}
                placeholder="مثال: علی محمدی"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1 mr-1" role="alert">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-bold mb-2 text-gray-800">
              آدرس ایمیل <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <MailIcon className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
              <input
                id="contact-email"
                type="email"
                name="email"
                dir="ltr"
                required
                aria-required="true"
                aria-invalid={errors.email ? "true" : "false"}
                value={formData.email}
                onChange={handleChange}
                className={`w-full border rounded-xl py-3 pr-11 pl-4 text-left bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ks-blue-500 transition-colors ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-ks-blue-500'
                }`}
                placeholder="example@domain.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 mr-1" role="alert">{errors.email}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="contact-subject" className="block text-sm font-bold mb-2 text-gray-800">
            موضوع پیام <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-subject"
            type="text"
            name="subject"
            required
            aria-required="true"
            aria-invalid={errors.subject ? "true" : "false"}
            value={formData.subject}
            onChange={handleChange}
            className={`w-full border rounded-xl py-3 px-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ks-blue-500 transition-colors ${
              errors.subject ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-ks-blue-500'
            }`}
            placeholder="درخواست مشاوره / استعلام قیمت / سفارش ساخت"
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1 mr-1" role="alert">{errors.subject}</p>}
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-bold mb-2 text-gray-800">
            متن پیام <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            required
            aria-required="true"
            aria-invalid={errors.message ? "true" : "false"}
            value={formData.message}
            onChange={handleChange}
            className={`w-full border rounded-xl py-3 px-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ks-blue-500 transition-colors ${
              errors.message ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-ks-blue-500'
            }`}
            placeholder="شرح درخواست، ابعاد، تیراژ یا مشخصات فنی قطعات مورد نظر..."
          />
          {errors.message && <p className="text-red-500 text-xs mt-1 mr-1" role="alert">{errors.message}</p>}
        </div>
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm bg-ks-blue-500 hover:bg-ks-blue-600 focus:outline-none focus:ring-2 focus:ring-ks-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={20} />
            {isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست استعلام'}
          </button>
        </div>
        {successMessage && (
          <div
            className={`p-4 rounded-xl text-center text-sm font-medium ${
              successMessage.includes('✅')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            role="status"
          >
            {successMessage}
          </div>
        )}
        <p className="text-xs text-center text-gray-500">
          پس از ثبت درخواست، کارشناسان فنی و مهندسی خوش‌صنعت در اسرع وقت با شما تماس خواهند گرفت.
        </p>
      </form>
    </div>
  );
}
