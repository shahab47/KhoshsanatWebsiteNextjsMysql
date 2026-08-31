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
    <div className="bg-white rounded-2xl p-6 md:p-8 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare style={{ color: '#2563EB' }} size={28} />
        <h2 className="text-2xl font-bold" style={{ color: '#2D3644' }}>ارسال پیام و استعلام قیمت</h2>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>
              نام و نام خانوادگی *
            </label>
            <div className="relative">
              <User className="absolute right-3 top-3" style={{ color: '#9ca3af' }} size={18} />
              <input
                id="contact-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full border-2 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-blue-500'
                }`}
                style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
                placeholder="مثال: علی محمدی"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1 mr-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>
              آدرس ایمیل *
            </label>
            <div className="relative">
              <MailIcon className="absolute right-3 top-3" style={{ color: '#9ca3af' }} size={18} />
              <input
                id="contact-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full border-2 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.email ? 'border-red-500' : 'border-blue-500'
                }`}
                style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
                placeholder="example@domain.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 mr-1">{errors.email}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="contact-subject" className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>
            موضوع پیام *
          </label>
          <input
            id="contact-subject"
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={`w-full border-2 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.subject ? 'border-red-500' : 'border-blue-500'
            }`}
            style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
            placeholder="درخواست مشاوره / استعلام قیمت / سفارش ساخت"
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1 mr-1">{errors.subject}</p>}
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>
            متن پیام *
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            value={formData.message}
            onChange={handleChange}
            className={`w-full border-2 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.message ? 'border-red-500' : 'border-blue-500'
            }`}
            style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
            placeholder="شرح درخواست، ابعاد، تیراژ یا مشخصات فنی قطعات مورد نظر..."
          />
          {errors.message && <p className="text-red-500 text-xs mt-1 mr-1">{errors.message}</p>}
        </div>
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto text-white font-bold py-3 px-8 rounded-xl transition duration-300 flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ backgroundColor: '#2563EB' }}
          >
            <Send size={20} />
            {isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست استعلام'}
          </button>
        </div>
        {successMessage && (
          <div
            className={`p-3 rounded-xl text-center text-sm ${
              successMessage.includes('✅')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
          >
            {successMessage}
          </div>
        )}
        <p className="text-xs text-center" style={{ color: '#6b7280' }}>
          پس از ثبت درخواست، کارشناسان فنی و مهندسی خوش‌صنعت در اسرع وقت با شما تماس خواهند گرفت.
        </p>
      </form>
    </div>
  );
}
