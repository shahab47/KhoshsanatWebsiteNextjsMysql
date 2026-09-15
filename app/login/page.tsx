'use client';
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, KeyRound, Eye, EyeOff, User, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'register' | 'forgot_step_1' | 'forgot_step_2'>('login');
  
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
  
  // تایمر ارسال مجدد کد
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
        setMsg({ type: 'success', text: 'ورود موفقیت‌آمیز. در حال انتقال به پنل...' });
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

  // ثبت‌نام کاربر جدید
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (password !== confirmPassword) {
      setMsg({ type: 'error', text: 'رمز عبور و تکرار آن با یکدیگر مطابقت ندارند.' });
      return;
    }

    if (password.length < 6) {
      setMsg({ type: 'error', text: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
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
        setPassword('');
        setConfirmPassword('');
      } else {
        setMsg({ type: 'error', text: data.error || 'خطا در ثبت‌نام' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
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
        setResendTimer(60); // ۶۰ ثانیه تایمر برای ارسال مجدد
      } else {
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

    if (password.length < 6) {
      setMsg({ type: 'error', text: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 text-gray-800" dir="rtl">
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800/10 relative overflow-hidden">
        
        {/* هدر باکس */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
            {view === 'register' ? (
              <User size={30} />
            ) : view.startsWith('forgot') ? (
              <ShieldCheck size={30} />
            ) : (
              <Lock size={30} />
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {view === 'login' && 'ورود به پنل خوش‌صنعت'}
            {view === 'register' && 'ثبت‌نام کاربر جدید'}
            {view === 'forgot_step_1' && 'بازیابی رمز عبور'}
            {view === 'forgot_step_2' && 'تایید کد و تغییر رمز عبور'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            {view === 'login' && 'برای دسترسی به پنل مدیریت، اطلاعات حساب خود را وارد کنید.'}
            {view === 'register' && 'پس از ثبت‌نام، حساب شما توسط مدیر ارشد بررسی و تایید خواهد شد.'}
            {view === 'forgot_step_1' && 'ایمیل حساب خود را وارد کنید تا کد تایید ۶ رقمی با اعتبار ۳۰ دقیقه برای شما ارسال شود.'}
            {view === 'forgot_step_2' && `کد ۶ رقمی ارسال‌شده به ${email} و رمز جدید را وارد نمایید (اعتبار: ۳۰ دقیقه).`}
          </p>
        </div>

        {/* دکمه‌های سوئیچ تب (فقط در صفحات ورود و ثبت‌نام) */}
        {(view === 'login' || view === 'register') && (
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setView('login'); clearMessages(); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                view === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ورود به سیستم
            </button>
            <button
              type="button"
              onClick={() => { setView('register'); clearMessages(); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                view === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ثبت‌نام کاربر جدید
            </button>
          </div>
        )}

        {/* پیام‌های وضعیت (خطا / موفقیت / اطلاع‌رسانی) */}
        {msg.text && (
          <div
            className={`p-4 rounded-2xl mb-6 text-sm font-bold border flex items-start gap-3 animate-in fade-in duration-200 ${
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
        {/* 1. فرم ورود (Login) */}
        {/* ========================================== */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">ایمیل کاربری</label>
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="name@khoshsanat.ir"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 mr-1 ml-1">
                <label className="block text-xs font-bold text-slate-600">رمز عبور</label>
                <button
                  type="button"
                  onClick={() => { setView('forgot_step_1'); clearMessages(); }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                >
                  فراموشی رمز عبور؟
                </button>
              </div>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-4 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-12 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ورود امن به سامانه'}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* 2. فرم ثبت‌نام کاربر جدید (Register) */}
        {/* ========================================== */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">نام و نام خانوادگی</label>
              <div className="relative">
                <User className="absolute right-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="مثال: علی حسینی"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">آدرس ایمیل</label>
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="ali@khoshsanat.ir"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 mr-1">
                ایمیل تایید و فعال‌سازی حساب به این آدرس ارسال خواهد شد.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">رمز عبور (حداقل ۶ کاراکتر)</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-4 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-12 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">تکرار رمز عبور</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-4 text-slate-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-12 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-4 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-2xl text-xs text-amber-800 leading-relaxed">
              🔔 <strong>توجه:</strong> پس از تکمیل ثبت‌نام، حساب شما در وضعیت «در انتظار تایید» قرار می‌گیرد و پس از تایید توسط ادمین ارشد فعال خواهد شد.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ثبت‌نام و ارسال برای تایید ادمین'}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* 3. مرحله ۱ فراموشی رمز: ارسال کد تایید */}
        {/* ========================================== */}
        {view === 'forgot_step_1' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">آدرس ایمیل ثبت شده در سیستم</label>
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="name@khoshsanat.ir"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ارسال کد تایید به ایمیل'}
            </button>

            <button
              type="button"
              onClick={() => { setView('login'); clearMessages(); }}
              className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <ArrowRight size={16} /> بازگشت به صفحه ورود
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* 4. مرحله ۲ فراموشی رمز: ورود کد ۶ رقمی و رمز جدید */}
        {/* ========================================== */}
        {view === 'forgot_step_2' && (
          <form onSubmit={handleResetWithCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">کد تایید ۶ رقمی دریافتی از ایمیل</label>
              <input
                type="text"
                dir="ltr"
                maxLength={6}
                placeholder="123456"
                required
                className="w-full bg-slate-50 border border-blue-300 rounded-2xl py-3.5 px-4 text-center font-mono font-black text-2xl tracking-[8px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">رمز عبور جدید</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-4 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-12 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 mr-1">تکرار رمز عبور جدید</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute right-4 text-slate-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-12 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-4 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200/60 rounded-2xl text-xs text-blue-900 leading-relaxed flex items-center gap-2">
              <span className="text-base">⏱️</span>
              <span>این کد تایید تا <strong>۳۰ دقیقه</strong> دارای اعتبار است. پس از اتمام زمان، باید دوباره درخواست ارسال کد دهید.</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              {resendTimer > 0 ? (
                <span className="text-xs text-slate-400 font-bold">
                  ⏱️ ارسال مجدد کد تا {resendTimer} ثانیه دیگر
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'تایید کد و تغییر رمز عبور'}
            </button>

            <button
              type="button"
              onClick={() => { setView('login'); clearMessages(); }}
              className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={16} /> بازگشت به ورود
            </button>
          </form>
        )}

      </div>
    </div>
  );
}