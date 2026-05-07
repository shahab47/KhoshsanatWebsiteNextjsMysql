'use client';
// مسیر فایل: src/app/admin/users/page.tsx

import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Edit, Trash2, Save, XCircle, KeyRound, Mail, User } from 'lucide-react';

export default function UsersManager() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ id: null, name: '', email: '', password: '', role: 'CONTENT_ADMIN' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = formData.id ? 'PUT' : 'POST';
    const res = await fetch('/api/users', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      alert('اطلاعات با موفقیت ذخیره شد.');
      fetchData(); setView('list');
    } else {
      const err = await res.json(); alert(err.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این مدیر مطمئن هستید؟')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
    else alert((await res.json()).error);
  };

  if (loading) return <div className="text-center py-20 font-bold text-gray-400 animate-pulse">در حال دریافت لیست مدیران...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 text-gray-800" dir="rtl">
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black">{currentUser?.role === 'MAIN_ADMIN' ? 'مدیریت مدیران سیستم' : 'تنظیمات حساب کاربری'}</h2>
          <p className="text-gray-500 text-sm mt-1">مدیریت سطوح دسترسی و امنیت پنل مدیریت</p>
        </div>
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={32} /></div>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
          {currentUser?.role === 'MAIN_ADMIN' && (
            <button onClick={() => { setFormData({id:null, name:'', email:'', password:'', role:'CONTENT_ADMIN'}); setView('form'); }} className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
              <Plus size={18} /> افزودن مدیر جدید
            </button>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                  <th className="p-4 font-bold">نام</th>
                  <th className="p-4 font-bold">ایمیل</th>
                  <th className="p-4 font-bold text-center">نقش</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 text-gray-500 text-sm" dir="ltr">{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${u.role === 'MAIN_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role === 'MAIN_ADMIN' ? 'مدیر ارشد' : 'مدیر محتوا'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setFormData({id: u.id, name: u.name, email: u.email, password: '', role: u.role}); setView('form'); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={18} /></button>
                        {currentUser?.role === 'MAIN_ADMIN' && u.id !== currentUser.id && (
                          <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h3 className="text-xl font-bold">{formData.id ? 'ویرایش پروفایل' : 'ثبت مدیر جدید'}</h3>
            <button type="button" onClick={() => setView('list')} className="text-gray-400 hover:text-gray-950"><XCircle size={24} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">نام کامل</label>
              <input type="text" required className="w-full bg-gray-50 border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">ایمیل سازمانی</label>
              <input type="email" required dir="ltr" className="w-full bg-gray-50 border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            
            {currentUser?.role === 'MAIN_ADMIN' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">سطح دسترسی</label>
                <select className="w-full bg-gray-50 border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="CONTENT_ADMIN">مدیر محتوا (فقط ویرایش محتوا و رمز شخصی)</option>
                  <option value="MAIN_ADMIN">مدیر ارشد (دسترسی کامل به تمام تنظیمات)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">{formData.id ? "رمز عبور جدید (اختیاری)" : "رمز عبور اولیه"}</label>
              <input type="password" required={!formData.id} dir="ltr" className="w-full bg-gray-50 border p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 mt-4 flex items-center justify-center gap-2">
              <Save size={20} /> ذخیره تغییرات
            </button>
          </div>
        </form>
      )}
    </div>
  );
}