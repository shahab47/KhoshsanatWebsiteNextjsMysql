// app/khoshmin/emails/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail, Send, Settings, History, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Search, Trash2, Eye, User, FileText, Sparkles, Check,
  ShieldCheck, ArrowRight, ExternalLink, HelpCircle, Copy, Clock
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface EmailLog {
  id: number;
  senderId: number | null;
  senderEmail: string;
  senderName: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  hasPass?: boolean;
  fromEmail: string;
  fromName: string;
}

interface ContactSuggestion {
  id: number;
  name: string;
  email: string;
  company?: string;
}

export default function EmailsPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'compose' | 'logs' | 'settings'>('compose');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // وضعیت‌های تب ارسال (Compose)
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // مخاطبین پیشنهادی
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // وضعیت‌های تب لاگ‌ها (Logs)
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  // وضعیت‌های تب تنظیمات (Settings)
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: 'mail.khoshsanat.ir',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromEmail: 'info@khoshsanat.ir',
    fromName: 'خوش‌صنعت پایدار',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // قالب‌های آماده
  const emailTemplates = [
    {
      name: 'استعلام قیمت و پیش‌فاکتور',
      subject: 'پیش‌فاکتور و مشخصات فنی سفارش شما | خوش‌صنعت پایدار',
      body: `با سلام و احترام،\n\nعطف به درخواست استعلام قیمت و مشخصات فنی جنابعالی، اطلاعات درخواستی به شرح زیر خدمتتان تقدیم می‌گردد:\n\nلطفاً در صورت نیاز به هماهنگی بیشتر یا تغییر در مشخصات درخواستی با واحد فروش تماس حاصل فرمایید.\n\nبا سپاس از حسن انتخاب شما\nواحد مهندسی و فروش خوش‌صنعت پایدار`,
    },
    {
      name: 'اطلاع‌رسانی وضعیت سفارش و تولید',
      subject: 'گزارش پیشرفت و وضعیت تولید سفارش | خوش‌صنعت پایدار',
      body: `مشتری گرامی،\n\nبه استحضار می‌رساند سفارش شما در خط تولید کارخانه در حال انجام بوده و مراحل کنترل کیفیت را با موفقیت سپری می‌کند.\n\nزمان تقریبی تحویل و ارسال بر اساس زمان‌بندی توافق‌شده انجام خواهد شد.\n\nجهت هرگونه پیگیری می‌توانید با کارشناس مربوطه در تماس باشید.`,
    },
    {
      name: 'پاسخ به پیام ارتباط با ما',
      subject: 'پاسخ به درخواست و پیام شما | شرکت خوش‌صنعت پایدار',
      body: `با سلام و درود،\n\nپیام شما دریافت و توسط کارشناسان فنی و اداری بررسی گردید.\n\nدر پاسخ به موضوع مطروحه جنابعالی:\n\n[متن پاسخ خود را اینجا درج کنید]\n\nدر صورت نیاز به توضیحات بیشتر، ما همواره در دسترس شما هستیم.`,
    },
    {
      name: 'معرفی خدمات و کاتالوگ صنعتی',
      subject: 'معرفی توانمندی‌ها و کاتالوگ محصولات ماشین‌آلات صنعتی | خوش‌صنعت',
      body: `مدیریت محترم،\n\nشرکت فنی مهندسی خوش‌صنعت پایدار با سال‌ها تجربه در طراحی و ساخت انواع ماشین‌آلات صنعتی، افتخار دارد توانمندی‌ها و راهکارهای نوین خود را جهت ارتقای خطوط تولید آن مجموعه محترم معرفی نماید.\n\nجهت دریافت کاتالوگ و مشاوره رایگان با مهندسان ما در ارتباط باشید.`,
    },
  ];

  // بارگذاری اطلاعات احراز هویت و پارامترهای URL
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setFromName(data.user.name || 'مدیریت خوش‌صنعت');
          // پیشنهاد ایمیل سازمانی اختصاصی ادمین بر اساس دامنه khoshsanat.ir
          if (data.user.email) {
            setFromEmail(data.user.email);
            setTestEmailRecipient(data.user.email);
          }
        }
      })
      .catch(console.error);

    // اگر از صفحه مشتری آمده باشد
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const recipientParam = urlParams.get('to');
      const subjectParam = urlParams.get('subject');
      if (recipientParam) setTo(recipientParam);
      if (subjectParam) setSubject(subjectParam);
    }
  }, []);

  // جستجوی مخاطبین هنگام تایپ
  useEffect(() => {
    if (to.length >= 2 && !to.includes(',')) {
      fetch(`/api/khoshmin/emails/recipients?q=${encodeURIComponent(to)}`)
        .then((res) => res.json())
        .then((data) => {
          const list: ContactSuggestion[] = [];
          if (data.customers) {
            data.customers.forEach((c: any) => {
              if (c.email) list.push({ id: c.id, name: c.name, email: c.email, company: c.company });
            });
          }
          if (data.users) {
            data.users.forEach((u: any) => {
              if (u.email && !list.some((item) => item.email === u.email)) {
                list.push({ id: u.id, name: `${u.name} (مدیر)`, email: u.email });
              }
            });
          }
          setSuggestions(list);
          setShowSuggestions(list.length > 0);
        })
        .catch(() => {});
    } else {
      setShowSuggestions(false);
    }
  }, [to]);

  // بارگذاری لاگ‌ها
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let url = `/api/khoshmin/emails/logs?search=${encodeURIComponent(searchQuery)}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  // بارگذاری تنظیمات SMTP
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/khoshmin/emails/settings');
      if (res.ok) {
        const data = await res.json();
        setSmtpSettings({
          host: data.host || 'mail.khoshsanat.ir',
          port: data.port || 465,
          secure: data.secure !== undefined ? data.secure : true,
          user: data.user || '',
          pass: '',
          hasPass: data.hasPass,
          fromEmail: data.fromEmail || 'info@khoshsanat.ir',
          fromName: data.fromName || 'خوش‌صنعت پایدار',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  // ارسال ایمیل
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) {
      showAlert('لطفاً آدرس گیرنده، موضوع و متن پیام را وارد کنید.', 'خطا', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/khoshmin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          text: body.trim(),
          fromEmail: fromEmail.trim() || undefined,
          fromName: fromName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('ایمیل با موفقیت به گیرنده ارسال شد ✅', 'موفقیت', 'success');
        setTo('');
        setSubject('');
        setBody('');
        setPreviewMode(false);
      } else {
        showAlert(data.error || 'خطا در ارسال ایمیل. لطفاً تنظیمات سرور SMTP را بررسی فرمایید.', 'خطا در ارسال', 'error');
      }
    } catch (err: any) {
      showAlert('مشکلی در برقراری ارتباط با سرور رخ داد.', 'خطای شبکه', 'error');
    } finally {
      setSending(false);
    }
  };

  // ذخیره تنظیمات SMTP
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/khoshmin/emails/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('تنظیمات سرور ایمیل با موفقیت ذخیره شد ✅', 'موفقیت', 'success');
        fetchSettings();
      } else {
        showAlert(data.error || 'خطا در ذخیره تنظیمات', 'خطا', 'error');
      }
    } catch {
      showAlert('خطای غیرمنتظره در ذخیره تنظیمات', 'خطا', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // تست آنلاین سرور SMTP
  const handleTestConnection = async () => {
    if (!testEmailRecipient.trim()) {
      showAlert('لطفاً ایمیل گیرنده پیام تست را مشخص کنید.', 'خطا', 'error');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/khoshmin/emails/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          testRecipient: testEmailRecipient.trim(),
          ...smtpSettings,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
        showAlert(data.message, 'تست اتصال موفق', 'success');
      } else {
        setTestResult({ success: false, message: data.error || 'ارتباط با سرور SMTP برقرار نشد.' });
        showAlert(data.error || 'ارتباط با سرور SMTP برقرار نشد.', 'خطای اتصال', 'error');
      }
    } catch {
      const msg = 'عدم دسترسی به سرور برای تست اتصال.';
      setTestResult({ success: false, message: msg });
      showAlert(msg, 'خطا', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // حذف لاگ
  const handleDeleteLog = (id: number) => {
    showConfirm({
      title: 'حذف تاریخچه ایمیل',
      message: 'آیا از حذف این رکورد ارسالی مطمئن هستید؟',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/emails/logs?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchLogs();
            if (selectedLog?.id === id) setSelectedLog(null);
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 text-gray-800" dir="rtl">
      {/* سربرگ */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">سیستم ایمیل سازمانی</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck size={14} /> دامنه اختصاصی khoshsanat.ir
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">
            ارسال ایمیل‌های رسمی به مشتریان و همکاران با آدرس‌های سازمانی (مانند {currentUser?.email || 'shayankhoshkar@khoshsanat.ir'})
          </p>
        </div>

        {/* دکمه‌های ناوبری تب‌ها */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'compose'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Send size={16} /> ارسال ایمیل
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <History size={16} /> تاریخچه و لاگ‌ها
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Settings size={16} /> تنظیمات SMTP
          </button>
        </div>
      </div>

      {/* ======================= تب ۱: ارسال ایمیل (Compose) ======================= */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* فرم ارسال */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                <Send size={20} className="text-blue-600" />
                <span>نگارش ایمیل جدید</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                  previewMode ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Eye size={14} /> {previewMode ? 'حالت ویرایش' : 'پیش‌نمایش زنده'}
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* فرستنده و نام */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">نام نمایشی فرستنده</label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="مثال: شایان خوش‌کار"
                    className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">ایمیل فرستنده (سازمانی)</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="shayankhoshkar@khoshsanat.ir"
                    className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                  />
                </div>
              </div>

              {/* گیرنده */}
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-600">
                    آدرس گیرنده <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">امکان تایپ نام مشتری برای انتخاب سریع</span>
                </div>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                />

                {/* منوی پیشنهادات مشتریان */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 max-h-56 overflow-y-auto">
                    <div className="text-[10px] font-black text-gray-400 px-3 py-1">پیشنهادات مشتریان و ادمین‌ها:</div>
                    {suggestions.map((item) => (
                      <div
                        key={item.email}
                        onClick={() => {
                          setTo(item.email);
                          setShowSuggestions(false);
                        }}
                        className="flex items-center justify-between p-2.5 hover:bg-blue-50 rounded-xl cursor-pointer transition text-xs"
                      >
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          <User size={14} className="text-blue-500" />
                          <span>{item.name} {item.company ? `(${item.company})` : ''}</span>
                        </div>
                        <span className="font-mono text-gray-500" dir="ltr">{item.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* موضوع ایمیل */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">
                  موضوع ایمیل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="موضوع پیام رسمی..."
                  className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                />
              </div>

              {/* متن ایمیل / پیش‌نمایش */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">
                  متن پیام <span className="text-red-500">*</span>
                </label>

                {previewMode ? (
                  <div className="border border-blue-200 bg-gray-50 p-4 rounded-2xl min-h-[220px]">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="border-b border-gray-100 pb-3 mb-3">
                        <span className="text-xs text-gray-400">پیش‌نمایش خروجی:</span>
                        <h4 className="font-black text-gray-900 mt-1">{subject || '(بدون عنوان)'}</h4>
                      </div>
                      <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {body || '(متنی نوشته نشده است)'}
                      </div>
                      <div className="mt-6 pt-3 border-t border-dashed border-gray-200 text-xs text-gray-500">
                        <strong>ارسال از طرف:</strong> {fromName || 'مدیریت'} &lt;{fromEmail || 'info@khoshsanat.ir'}&gt;
                      </div>
                    </div>
                  </div>
                ) : (
                  <textarea
                    required
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="متن کامل پیام خود را اینجا وارد کنید..."
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
                  />
                )}
              </div>

              {/* دکمه ارسال */}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>در حال ارسال ایمیل از طریق سرور...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>ارسال ایمیل رسمی</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* سایدبار قالب‌های سریع و راهنما */}
          <div className="space-y-6">
            {/* قالب‌های آماده */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
                <Sparkles size={18} className="text-amber-500" />
                <span>قالب‌های آماده سازمانی</span>
              </div>
              <div className="space-y-2.5">
                {emailTemplates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSubject(tmpl.subject);
                      setBody(tmpl.body);
                    }}
                    className="p-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-2xl cursor-pointer transition group"
                  >
                    <div className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition flex items-center justify-between">
                      <span>{tmpl.name}</span>
                      <FileText size={14} className="text-gray-400 group-hover:text-blue-500" />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{tmpl.subject}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* کارت راهنما و نکات ارسال */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md">
              <div className="flex items-center gap-2 font-bold text-blue-400 mb-3">
                <HelpCircle size={18} />
                <span>نکات ایمیل سازمانی</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed list-disc list-inside">
                <li>ایمیل‌ها با هویت بصری و قالب رسمی شرکت خوش‌صنعت ارسال می‌شوند.</li>
                <li>برای ارسال به چند نفر، ایمیل‌ها را با کاما انگلیسی (,) جدا کنید.</li>
                <li>وضعیت موفق یا ناموفق بودن هر ارسال در تب «تاریخچه و لاگ‌ها» ثبت می‌گردد.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================= تب ۲: تاریخچه و لاگ‌ها (Logs) ======================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          {/* فیلترها و جستجو */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search size={18} className="absolute right-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  placeholder="جستجو در گیرنده، فرستنده یا عنوان..."
                  className="w-full bg-gray-50 border border-gray-200 pr-10 pl-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <button
                onClick={fetchLogs}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl transition cursor-pointer"
                title="تازه‌سازی"
              >
                <RefreshCw size={18} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* فیلتر وضعیت */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setStatusFilter('SENT')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'SENT' ? 'bg-green-600 text-white shadow-sm' : 'text-green-700'
                }`}
              >
                موفق
              </button>
              <button
                onClick={() => setStatusFilter('FAILED')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'FAILED' ? 'bg-red-600 text-white shadow-sm' : 'text-red-700'
                }`}
              >
                ناموفق
              </button>
            </div>
          </div>

          {/* جدول لاگ‌ها */}
          {logsLoading ? (
            <div className="text-center py-20 font-bold text-gray-400 animate-pulse">در حال دریافت تاریخچه ایمیل‌ها...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Mail size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">هنوز هیچ ایمیلی در این بخش ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-100">
                    <th className="p-3.5 font-bold">گیرنده</th>
                    <th className="p-3.5 font-bold">موضوع</th>
                    <th className="p-3.5 font-bold">فرستنده</th>
                    <th className="p-3.5 font-bold text-center">وضعیت</th>
                    <th className="p-3.5 font-bold">تاریخ و ساعت</th>
                    <th className="p-3.5 font-bold text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="p-3.5 font-bold font-mono text-gray-800" dir="ltr">
                        {log.recipient}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900 max-w-xs truncate">{log.subject}</td>
                      <td className="p-3.5 text-gray-500 font-mono" dir="ltr">
                        {log.senderEmail}
                      </td>
                      <td className="p-3.5 text-center">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700">
                            <CheckCircle2 size={12} /> موفق
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 cursor-help"
                            title={log.errorMessage || 'خطا در ارسال'}
                          >
                            <XCircle size={12} /> خطا
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="مشاهده متن"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="حذف رکورد"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* مودال جزئیات ایمیل */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full p-6 md:p-8 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-black text-lg text-gray-900">{selectedLog.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      تاریخ ارسال: {new Date(selectedLog.createdAt).toLocaleString('fa-IR')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                  >
                    <XCircle size={22} />
                  </button>
                </div>

                <div className="space-y-3 text-xs mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-500">فرستنده:</span>
                    <span className="font-mono font-bold" dir="ltr">
                      {selectedLog.senderName ? `${selectedLog.senderName} <${selectedLog.senderEmail}>` : selectedLog.senderEmail}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">گیرنده:</span>
                    <span className="font-mono font-bold" dir="ltr">{selectedLog.recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">وضعیت ارسال:</span>
                    <span className={`font-bold ${selectedLog.status === 'SENT' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedLog.status === 'SENT' ? 'موفق' : 'ناموفق'}
                    </span>
                  </div>
                  {selectedLog.errorMessage && (
                    <div className="text-red-600 pt-2 border-t border-red-100">
                      <strong>علت خطا:</strong> {selectedLog.errorMessage}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 max-h-64 overflow-y-auto bg-white">
                  <div className="text-xs font-bold text-gray-400 mb-2">محتوای پیام:</div>
                  <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {selectedLog.body}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= تب ۳: تنظیمات SMTP ======================= */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b border-gray-100 text-lg font-bold text-gray-800">
              <Settings size={20} className="text-blue-600" />
              <span>پیکربندی سرور ایمیل (SMTP Server)</span>
            </div>

            {settingsLoading ? (
              <div className="text-center py-12 font-bold text-gray-400 animate-pulse">در حال دریافت تنظیمات...</div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* هاست و پورت */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      آدرس سرور SMTP (Host) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={smtpSettings.host}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                      placeholder="mail.khoshsanat.ir"
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      پورت (Port) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      dir="ltr"
                      value={smtpSettings.port}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value, 10) || 465 })}
                      placeholder="465"
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-center"
                    />
                  </div>
                </div>

                {/* وضعیت SSL / TLS */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <input
                    type="checkbox"
                    id="secureCheck"
                    checked={smtpSettings.secure}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded-lg cursor-pointer"
                  />
                  <label htmlFor="secureCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                    استفاده از پروتکل امن SSL/TLS (برای پورت ۴۶۵ فعال شود)
                  </label>
                </div>

                {/* یوزرنیم و پسورد SMTP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">نام کاربری SMTP (Username)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={smtpSettings.user}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                      placeholder="info@khoshsanat.ir"
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      رمز عبور SMTP {smtpSettings.hasPass && <span className="text-green-600 font-normal">(قبلاً ثبت شده)</span>}
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={smtpSettings.pass}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                      placeholder={smtpSettings.hasPass ? '••••••••••••' : 'رمز عبور ایمیل'}
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                    />
                  </div>
                </div>

                {/* ایمیل و نام نمایشی پیش‌فرض */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">نام نمایشی پیش‌فرض</label>
                    <input
                      type="text"
                      value={smtpSettings.fromName}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                      placeholder="شرکت خوش‌صنعت پایدار"
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">ایمیل فرستنده پیش‌فرض</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={smtpSettings.fromEmail}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                      placeholder="info@khoshsanat.ir"
                      className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-left"
                    />
                  </div>
                </div>

                {/* دکمه ذخیره */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingSettings ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                    <span>ذخیره تنظیمات سرور</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* باکس تست اتصال زنده */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
                <ShieldCheck size={18} className="text-green-600" />
                <span>تست زنده اتصال (SMTP Ping)</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                جهت اطمینان از صحت رمز عبور، پورت و اتصال به سرور ایمیل، یک ایمیل آزمایشی به آدرس زیر ارسال فرمایید:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">ایمیل دریافت‌کننده پیام تست</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-xs font-mono text-left"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>در حال تست اتصال و ارسال...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>تست اتصال و ارسال آزمایشی</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs mt-3 flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* راهنمای اطلاعات هاست */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">
              <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
                <HelpCircle size={16} className="text-blue-500" />
                <span>نمونه تنظیمات میل‌سرور اختصاصی</span>
              </h4>
              <div className="text-[11px] text-gray-600 space-y-1.5 font-mono" dir="ltr">
                <div>• Host: <strong>mail.khoshsanat.ir</strong></div>
                <div>• Port: <strong>465</strong> (SSL) یا <strong>587</strong> (TLS)</div>
                <div>• Username: <strong>shayankhoshkar@khoshsanat.ir</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
