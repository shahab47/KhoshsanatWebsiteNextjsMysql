'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  Loader2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw, 
  ShieldCheck,
  Building2,
  Cpu,
  Layers,
  Check
} from 'lucide-react';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'register_step_1' | 'register_step_2' | 'forgot_step_1' | 'forgot_step_2'>('login');
  
  // فیلدهای مشترک
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // استیت‌های کمکی
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success' | 'info' | ''; text: string }>({ type: '', text: '' });
  
  // تایمر ارسال مجدد کد (همگام با سرور)
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset');
      if (token) {
        setOtpCode(token);
        setView('forgot_step_2');
      }
    }
  }, []);

  const clearMessages = () => setMsg({ type: '', text: '' });

  // ورود به سیستم
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: 'ورود موفقیت‌آمیز. در حال انتقال به پنل مدیریت...' });
        setTimeout(() => {
          window.location.replace('/khoshmin');
        }, 600);
      } else {
        setMsg({ type: 'error', text: data.error || 'خطا در ورود به سامانه' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش کنید.' });
    }
    setLoading(false);
  };

  // ثبت‌نام مرحله ۱: ارسال مشخصات و درخواست کد تایید ایمیل
  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!name || !name.trim()) {
      setMsg({ type: 'error', text: 'لطفاً نام و نام خانوادگی را وارد کنید.' });
      return;
    }

    if (!email || !email.trim()) {
      setMsg({ type: 'error', text: 'لطفاً آدرس ایمیل معتبر وارد کنید.' });
      return;
    }

    if (password !== confirmPassword) {
      setMsg({ type: 'error', text: 'رمز عبور و تکرار آن با یکدیگر مطابقت ندارند.' });
      return;
    }

    if (password.length < 8) {
      setMsg({ type: 'error', text: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        setView('register_step_2');
        setOtpCode('');
        setResendTimer(data.resendCooldown || 90);
      } else {
        if (data.remainingCooldown) {
          setResendTimer(data.remainingCooldown);
        }
        setMsg({ type: 'error', text: data.error || 'خطا در ثبت‌نام' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    }
    setLoading(false);
  };

  // ثبت‌نام مرحله ۲: تایید کد ۶ رقمی و ساخت نهایی حساب
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!otpCode || otpCode.trim().length !== 6) {
      setMsg({ type: 'error', text: 'لطفاً کد تایید ۶ رقمی را به صورت کامل وارد نمایید.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_verify',
          email,
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setTimeout(() => {
          setView('login');
          clearMessages();
          setMsg({ type: 'success', text: data.message });
        }, 2200);
      } else {
        setMsg({ type: 'error', text: data.error || 'کد تایید وارد شده نادرست یا منقضی شده است.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در ارتباط با سرور' });
    }
    setLoading(false);
  };

  // مرحله ۱ فراموشی رمز: ارسال کد ۶ رقمی به ایمیل
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      setMsg({ type: 'error', text: 'لطفاً آدرس ایمیل خود را وارد کنید.' });
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forgot',
          email,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        setView('forgot_step_2');
        setResendTimer(data.resendCooldown || 90);
      } else {
        if (data.remainingCooldown) {
          setResendTimer(data.remainingCooldown);
        }
        setMsg({ type: 'error', text: data.error || 'خطا در ارسال کد تایید' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    }
    setLoading(false);
  };

  // مرحله ۲ فراموشی رمز: تایید کد و تنظیم پسورد جدید
  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (password !== confirmPassword) {
      setMsg({ type: 'error', text: 'رمز عبور جدید و تکرار آن با یکدیگر مطابقت ندارند.' });
      return;
    }

    if (password.length < 8) {
      setMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setMsg({ type: 'error', text: 'لطفاً کد تایید ۶ رقمی را به صورت کامل وارد نمایید.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_with_code',
          email,
          code: otpCode.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message });
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setTimeout(() => {
          setView('login');
          clearMessages();
          setMsg({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد. لطفاً وارد شوید.' });
        }, 2000);
      } else {
        setMsg({ type: 'error', text: data.error || 'کد وارد شده نامعتبر است یا منقضی شده است.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در ارتباط با سرور' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] text-slate-100 flex flex-col justify-between relative selection:bg-blue-600 selection:text-white" dir="rtl">
      
      {/* بافت ظریف گرید صنعتی پس‌زمینه */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* نوار بالای صفحه (ناوبری و بازگشت به وب‌سایت) */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5 flex items-center justify-between border-b border-white/5 bg-[#1a1d21]/80 backdrop-blur-md">
        <Link 
          href="/" 
          className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 text-blue-400" />
          <span>بازگشت به وب‌سایت اصلی</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span className="hidden sm:inline">سامانه احراز هویت امن</span>
          <span className="font-mono text-slate-500 dir-ltr">v2.5</span>
        </div>
      </header>

      {/* محتوای اصلی: ساختار دو ستونه مدرن شرکتی */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/40 overflow-hidden lg:grid lg:grid-cols-12">
          
          {/* ========================================================= */}
          {/* ستون برندینگ صنعتی (ویژه دسکتاپ - نمایش لوگو و افتخارات) */}
          {/* ========================================================= */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#21262d] via-[#1a1d21] to-[#141619] p-8 lg:p-10 flex-col justify-between border-l border-white/10 relative overflow-hidden text-slate-200">
            
            {/* گرادیان نوری ملایم تک‌رنگ */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div>
              {/* لوگوی رسمی خوش‌صنعت با لینک به صفحه اصلی */}
              <Link 
                href="/" 
                aria-label="بازگشت به صفحه اصلی خوش‌صنعت پایدار" 
                className="group inline-flex items-center gap-4 mb-8 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl p-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center p-2.5 backdrop-blur-md group-hover:border-blue-500/50 group-hover:bg-white/10 transition-all duration-300 shadow-inner">
                  <img 
                    src="/images/logo/logo-colored.svg" 
                    alt="لوگوی شرکت خوش‌صنعت پایدار" 
                    className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.src = '/Logo.svg'; }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">خوش‌صنعت پایدار</h1>
                  <p className="text-xs text-blue-400 font-medium mt-0.5">مهندسی، تولید و اتصالات مدرن صنعتی</p>
                </div>
              </Link>

              {/* شعار سازمانی */}
              <div className="space-y-2 mb-8">
                <span className="inline-block text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                  پرتال یکپارچه سازمانی
                </span>
                <h2 className="text-xl font-bold text-white leading-snug">
                  سامانه مدیریت مهندسی و زنجیره تأمین قطعات
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  دسترسی ایمن به اسناد مهندسی، کاتالوگ‌های فنی، اتصالات صنعتی و پنل برنامه‌ریزی تولید خوش‌صنعت پایدار.
                </p>
              </div>

              {/* مزیت‌های مهندسی و امنیتی */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">اتصالات و استانداردهای صنعتی</h3>
                    <p className="text-[11px] text-slate-400 font-light mt-0.5">پایگاه داده جامع محصولات و استعلامات فنی</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">سامانه جامع ERP و مدیریت</h3>
                    <p className="text-[11px] text-slate-400 font-light mt-0.5">فرآیندهای یکپارچه انبارداری، تولید و حسابداری</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">امنیت دو مرحله‌ای داده‌ها</h3>
                    <p className="text-[11px] text-slate-400 font-light mt-0.5">کنترل دسترسی پیشرفته و تایید هویت ایمن</p>
                  </div>
                </div>
              </div>
            </div>

            {/* کپی‌رایت پایین ستون برند */}
            <div className="pt-6 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
              <span>© خوش‌صنعت پایدار</span>
              <span className="font-mono dir-ltr">KS Engineering</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ستون فرم تعاملی (نمایش در دسکتاپ و تمام صفحه در موبایل) */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 bg-white text-slate-800 flex flex-col justify-center relative">
            
            {/* سربرگ مخصوص موبایل: نمایش لوگو و عنوان شرکت */}
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <Link 
                href="/" 
                className="group flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl p-2"
                aria-label="بازگشت به صفحه اصلی سایت"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-blue-300 transition-all duration-300 mb-2">
                  <img 
                    src="/images/logo/logo-colored.svg" 
                    alt="لوگوی شرکت خوش‌صنعت پایدار" 
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.src = '/Logo.svg'; }}
                  />
                </div>
                <span className="text-lg font-black text-slate-900 tracking-tight">خوش‌صنعت پایدار</span>
                <span className="text-xs text-slate-500 font-medium">پرتال جامع مهندسی و مدیریت</span>
              </Link>
            </div>

            {/* عنوان وضعیت فرم */}
            <div className="text-center sm:text-right mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {view === 'login' && 'ورود به پنل خوش‌صنعت'}
                {view === 'register_step_1' && 'ثبت‌نام کاربر جدید'}
                {view === 'register_step_2' && 'تایید ایمیل و فعال‌سازی حساب'}
                {view === 'forgot_step_1' && 'بازیابی رمز عبور'}
                {view === 'forgot_step_2' && 'تایید کد و تغییر رمز عبور'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {view === 'login' && 'برای دسترسی به پنل مدیریت خوش‌صنعت، مشخصات خود را وارد کنید.'}
                {view === 'register_step_1' && 'مشخصات اولیه را وارد فرمایید؛ کد تایید ۶ رقمی به آدرس ایمیل شما ارسال خواهد شد.'}
                {view === 'register_step_2' && `کد ۶ رقمی ارسال‌شده به ${email} را وارد نمایید (اعتبار: ۳ دقیقه).`}
                {view === 'forgot_step_1' && 'ایمیل حساب کاربری خود را وارد کنید تا کد تایید برای شما ارسال شود.'}
                {view === 'forgot_step_2' && `کد ۶ رقمی دریافتی در ${email} و رمز عبور جدید را وارد کنید.`}
              </p>
            </div>

            {/* دکمه‌های سوئیچ تب (فقط در ورود و ثبت‌نام اولیه) */}
            {(view === 'login' || view === 'register_step_1') && (
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => { setView('login'); clearMessages(); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    view === 'login' 
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock size={15} />
                  <span>ورود به سامانه</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setView('register_step_1'); clearMessages(); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    view === 'register_step_1' 
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User size={15} />
                  <span>ثبت‌نام کاربر جدید</span>
                </button>
              </div>
            )}

            {/* پیام‌های وضعیت (خطا / موفقیت / اطلاع‌رسانی) */}
            {msg.text && (
              <div
                className={`p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold border flex items-start gap-3 animate-in fade-in duration-200 ${
                  msg.type === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : msg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {msg.type === 'error' ? (
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{msg.text}</div>
              </div>
            )}

            {/* ========================================== */}
            {/* ۱. فرم ورود (Login) */}
            {/* ========================================== */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">
                    آدرس ایمیل
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type="email"
                      dir="ltr"
                      autoComplete="username"
                      placeholder="name@khoshsanat.ir"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 mr-1 ml-1">
                    <label className="block text-xs font-bold text-slate-700">رمز عبور</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot_step_1'); clearMessages(); }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      فراموشی رمز عبور؟
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute right-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-11 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                      className="absolute left-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>در حال بررسی اطلاعات...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      <span>ورود امن به سامانه</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ========================================== */}
            {/* ۲. فرم ثبت‌نام مرحله ۱: ورود مشخصات */}
            {/* ========================================== */}
            {view === 'register_step_1' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">نام و نام خانوادگی</label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="مثال: علی حسینی"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">آدرس ایمیل معتبر</label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      placeholder="ali@khoshsanat.ir"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 mr-1">
                    کد تایید ۶ رقمی به این آدرس ارسال خواهد شد.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">رمز عبور (حداقل ۸ کاراکتر)</label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute right-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-11 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                      className="absolute left-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">تکرار رمز عبور</label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute right-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-11 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'مخفی کردن تکرار رمز' : 'نمایش تکرار رمز'}
                      className="absolute left-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/50 rounded-xl text-xs text-blue-900 leading-relaxed flex items-center gap-2">
                  <span className="text-base shrink-0">📩</span>
                  <span>کد تایید ۶ رقمی پس از فشردن دکمه زیر به ایمیل شما ارسال می‌گردد.</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>در حال ارسال درخواست...</span>
                    </>
                  ) : (
                    <span>دریافت کد تایید ایمیل</span>
                  )}
                </button>
              </form>
            )}

            {/* ========================================== */}
            {/* ۳. فرم ثبت‌نام مرحله ۲: ورود کد تایید ایمیل */}
            {/* ========================================== */}
            {view === 'register_step_2' && (
              <form onSubmit={handleVerifyRegister} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5 mr-1 ml-1">
                    <label className="block text-xs font-bold text-slate-700">کد تایید ۶ رقمی ارسال‌شده</label>
                    <span className="text-xs text-slate-400 font-mono dir-ltr">{email}</span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-blue-300 rounded-xl py-3.5 px-4 text-center font-mono font-black text-2xl sm:text-3xl tracking-[10px] sm:tracking-[14px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/50 rounded-xl text-xs text-blue-900 leading-relaxed flex items-center gap-2">
                  <span className="text-base shrink-0">⏱️</span>
                  <span>کد تایید تا <strong>۳ دقیقه</strong> معتبر است (حداکثر سقف مجاز تلاش: ۳ بار).</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {resendTimer > 0 ? (
                    <span className="text-xs text-slate-400 font-medium">
                      ⏱️ امکان ارسال مجدد تا {resendTimer} ثانیه دیگر
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRegisterSubmit()}
                      disabled={loading}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw size={14} /> ارسال مجدد کد تایید
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setView('register_step_1'); clearMessages(); }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    ویرایش مشخصات
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>در حال فعال‌سازی حساب...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>تایید ایمیل و فعال‌سازی حساب</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); clearMessages(); }}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight size={15} /> بازگشت به صفحه ورود
                </button>
              </form>
            )}

            {/* ========================================== */}
            {/* ۴. مرحله ۱ فراموشی رمز: ارسال کد تایید */}
            {/* ========================================== */}
            {view === 'forgot_step_1' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">
                    آدرس ایمیل ثبت‌شده در سیستم
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="name@khoshsanat.ir"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>در حال ارسال کد...</span>
                    </>
                  ) : (
                    <span>ارسال کد تایید به ایمیل</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); clearMessages(); }}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <ArrowRight size={15} /> بازگشت به صفحه ورود
                </button>
              </form>
            )}

            {/* ========================================== */}
            {/* ۵. مرحله ۲ فراموشی رمز: ورود کد و رمز جدید */}
            {/* ========================================== */}
            {view === 'forgot_step_2' && (
              <form onSubmit={handleResetWithCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">
                    کد تایید ۶ رقمی دریافتی از ایمیل
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    placeholder="123456"
                    required
                    className="w-full bg-slate-50 border border-blue-300 rounded-xl py-3.5 px-4 text-center font-mono font-black text-2xl sm:text-3xl tracking-[10px] sm:tracking-[14px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">رمز عبور جدید (حداقل ۸ کاراکتر)</label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute right-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-11 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                      className="absolute left-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mr-1">تکرار رمز عبور جدید</label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute right-3.5 text-slate-400 pointer-events-none" size={19} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pr-11 pl-11 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'مخفی کردن تکرار رمز' : 'نمایش تکرار رمز'}
                      className="absolute left-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/50 rounded-xl text-xs text-blue-900 leading-relaxed flex items-center gap-2">
                  <span className="text-base shrink-0">⏱️</span>
                  <span>کد تایید تا <strong>۵ دقیقه</strong> دارای اعتبار است (حداکثر سقف مجاز تلاش: ۳ بار).</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {resendTimer > 0 ? (
                    <span className="text-xs text-slate-400 font-medium">
                      ⏱️ ارسال مجدد تا {resendTimer} ثانیه دیگر
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw size={14} /> ارسال مجدد کد تایید
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setView('forgot_step_1'); clearMessages(); }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    تغییر ایمیل
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>در حال تغییر رمز عبور...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>تایید کد و تغییر رمز عبور</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); clearMessages(); }}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight size={15} /> بازگشت به ورود
                </button>
              </form>
            )}

          </div>
        </div>
      </main>

      {/* فوتر ساده و شرکتی */}
      <footer className="relative z-10 py-4 px-6 text-center text-xs text-slate-500 border-t border-white/5">
        <p>تمامی حقوق این سامانه متعلق به شرکت مهندسی و بازرگانی خوش‌صنعت پایدار است.</p>
      </footer>

    </div>
  );
}