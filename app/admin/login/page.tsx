'use client';
// مسیر فایل: src/app/admin/login/page.tsx

import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, KeyRound, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // 🟢 رفع خطا: استفاده از روش مستقیم برای دریافت پارامترهای URL بجای next/navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset');
      if (token) {
        setResetToken(token);
        setView('reset');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    
    let action: any = view;
    if (view === 'reset' && !resetToken) action = 'login';

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action, 
        email, 
        password: password, 
        token: resetToken, 
        newPassword: password 
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      if (action === 'login') window.location.href = '/admin';
      else {
        setMsg({ type: 'success', text: data.message });
        if (action === 'reset') setTimeout(() => setView('login'), 2000);
      }
    } else {
      setMsg({ type: 'error', text: data.error });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-gray-800" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black">
            {view === 'login' ? 'ورود به پنل مدیریت' : view === 'forgot' ? 'فراموشی رمز عبور' : 'تنظیم رمز جدید'}
          </h1>
        </div>

        {msg.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {view !== 'reset' && (
            <div className="relative">
              <Mail className="absolute right-4 top-4 text-gray-400" size={20} />
              <input type="email" placeholder="ایمیل سازمانی" required className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}
          
          {view !== 'forgot' && (
            <div className="relative">
              <KeyRound className="absolute right-4 top-4 text-gray-400" size={20} />
              <input type="password" placeholder={view === 'reset' ? "رمز عبور جدید" : "رمز عبور"} required className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : (view === 'login' ? 'ورود امن' : 'ارسال درخواست')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setView(view === 'login' ? 'forgot' : 'login'); setMsg({type:'', text:''}); }} className="text-sm font-bold text-gray-500 hover:text-blue-600 transition">
            {view === 'login' ? 'رمز عبور را فراموش کرده‌اید؟' : 'بازگشت به صفحه ورود'}
          </button>
        </div>
      </div>
    </div>
  );
}