// app/contact/page.tsx
'use client';

import { Phone, Mail, MapPin, Clock, Send, MessageSquare, User, Mail as MailIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // اطلاعات تماس از دیتابیس
  const [contactInfo, setContactInfo] = useState({
    address: 'تهران، شهرک صنعتی، خیابان مهندسان، پلاک ۱۲',
    phone: '+98 935 18 77 305',
    email: 'info@ks-engineering.com'
  });
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await fetch('/api/texts');
        if (res.ok) {
          const data = await res.json();
          setContactInfo({
            address: data.FOOTER_ADDRESS || contactInfo.address,
            phone: data.FOOTER_PHONE || contactInfo.phone,
            email: data.FOOTER_EMAIL || contactInfo.email
          });
        }
      } catch (error) {
        console.error('خطا در دریافت اطلاعات تماس:', error);
      } finally {
        setLoadingInfo(false);
      }
    };
    fetchContactInfo();
  }, []);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

  if (loadingInfo) {
    return <div className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>;
  }

  return (
    <div className="min-h-screen pb-10 pt-20" style={{ backgroundColor: 'rgb(247, 249, 250)' }} dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row-reverse gap-8">
          
          {/* بخش فرم تماس */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl p-6 md:p-8 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare style={{ color: '#2563EB' }} size={28} />
                <h2 className="text-2xl font-bold" style={{ color: '#2D3644' }}>ارسال پیام</h2>
              </div>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>نام و نام خانوادگی *</label>
                    <div className="relative">
                      <User className="absolute right-3 top-3" style={{ color: '#9ca3af' }} size={18} />
                      <input 
                        type="text" name="name" value={formData.name} onChange={handleChange}
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
                    <label className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>آدرس ایمیل *</label>
                    <div className="relative">
                      <MailIcon className="absolute right-3 top-3" style={{ color: '#9ca3af' }} size={18} />
                      <input 
                        type="email" name="email" value={formData.email} onChange={handleChange}
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
                  <label className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>موضوع پیام *</label>
                  <input 
                    type="text" name="subject" value={formData.subject} onChange={handleChange}
                    className={`w-full border-2 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.subject ? 'border-red-500' : 'border-blue-500'
                    }`}
                    style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
                    placeholder="درخواست مشاوره / استعلام قیمت / ..." 
                  />
                  {errors.subject && <p className="text-red-500 text-xs mt-1 mr-1">{errors.subject}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#2D3644' }}>متن پیام *</label>
                  <textarea 
                    name="message" rows={6} value={formData.message} onChange={handleChange}
                    className={`w-full border-2 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.message ? 'border-red-500' : 'border-blue-500'
                    }`}
                    style={{ backgroundColor: '#ffffff', color: '#2D3644' }}
                    placeholder="پیام خود را اینجا بنویسید..."
                  />
                  {errors.message && <p className="text-red-500 text-xs mt-1 mr-1">{errors.message}</p>}
                </div>
                <div>
                  <button 
                    type="submit" disabled={isSubmitting}
                    className="w-full md:w-auto text-white font-bold py-3 px-8 rounded-xl transition duration-300 flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    <Send size={20} />
                    {isSubmitting ? 'در حال ارسال...' : 'ارسال پیام'}
                  </button>
                </div>
                {successMessage && (
                  <div className={`p-3 rounded-xl text-center text-sm ${
                    successMessage.includes('✅') 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}>
                    {successMessage}
                  </div>
                )}
                <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                  پس از ثبت درخواست، کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.
                </p>
              </form>
            </div>

            {/* نقشه */}
            <div className="mt-8 bg-white rounded-2xl p-4 border-2 shadow-md overflow-hidden" style={{ borderColor: '#2563EB' }}>
              <h3 className="font-bold mb-3 mr-2" style={{ color: '#2D3644' }}>موقعیت ما روی نقشه</h3>
              <div className="rounded-xl overflow-hidden h-64 w-full">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3239.917457370039!2d51.389144!3d35.689197!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f8e0e9e8f3b0f3b%3A0x7c3c6f5b4f8a67e3!2sTehran!5e0!3m2!1sen!2s!4v1712345678901!5m2!1sen!2s" 
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all"
                />
              </div>
            </div>
          </div>

          {/* بخش اطلاعات تماس (دریافت شده از دیتابیس) */}
          <div className="lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl p-6 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#2563EB20' }}>
                  <MapPin style={{ color: '#2563EB' }} size={24} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#2D3644' }}>آدرس دفتر مرکزی</h3>
              </div>
              <p className="leading-relaxed" style={{ color: '#4a5568' }}>{contactInfo.address}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#2563EB20' }}>
                  <Phone style={{ color: '#2563EB' }} size={24} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#2D3644' }}>شماره تماس</h3>
              </div>
              <p className="text-lg font-mono" style={{ color: '#2D3644' }} dir="ltr">{contactInfo.phone}</p>
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>ساعات پاسخگویی: ۸ الی ۱۷ (شنبه تا چهارشنبه)</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#2563EB20' }}>
                  <Mail style={{ color: '#2563EB' }} size={24} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#2D3644' }}>پست الکترونیک</h3>
              </div>
              <p style={{ color: '#2D3644' }} dir="ltr">{contactInfo.email}</p>
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>ارسال درخواست‌ها از طریق فرم زیر نیز امکان‌پذیر است.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 shadow-md" style={{ borderColor: '#2563EB' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#2563EB20' }}>
                  <Clock style={{ color: '#2563EB' }} size={24} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#2D3644' }}>ساعات کاری</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex justify-between" style={{ color: '#4a5568' }}><span>شنبه تا چهارشنبه</span><span>۸:۰۰ – ۱۷:۰۰</span></li>
                <li className="flex justify-between" style={{ color: '#4a5568' }}><span>پنجشنبه</span><span>۸:۰۰ – ۱۳:۰۰</span></li>
                <li className="flex justify-between" style={{ color: '#4a5568' }}><span>جمعه</span><span>تعطیل</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}