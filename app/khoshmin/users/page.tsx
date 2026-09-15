'use client';
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, XCircle, Eye, EyeOff, CheckCircle2, Clock, UserCheck, Shield, AlertTriangle } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

export default function UsersManager() {
  const { showConfirm, showAlert } = useModal();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    role: 'CONTENT_ADMIN',
    status: 'APPROVED',
    allowedPaths: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (authData?.user?.role !== 'MAIN_ADMIN') {
        setFormData({
          id: authData.user.id,
          name: authData.user.name,
          email: authData.user.email,
          password: '',
          role: authData.user.role,
          status: authData.user.status || 'APPROVED',
          allowedPaths: authData.user.allowedPaths || ''
        });
        setView('form');
        setLoading(false);
        return;
      }

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = formData.id ? 'PUT' : 'POST';
    const res = await fetch('/api/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      showAlert('اطلاعات با موفقیت ذخیره شد.', 'عملیات موفق', 'success');
      if (currentUser?.role === 'MAIN_ADMIN') {
        fetchData();
        setView('list');
      } else {
        setFormData(prev => ({ ...prev, password: '' }));
      }
      setShowPassword(false);
    } else {
      const err = await res.json();
      showAlert(err.error || 'خطا در ذخیره اطلاعات', 'خطا', 'error');
    }
  };

  // تایید سریع کاربر و ارسال خودکار ایمیل
  const handleQuickApprove = (user: any) => {
    showConfirm({
      title: 'تأیید حساب کاربری',
      message: `آیا از تأیید حساب کاربری «${user.name}» (${user.email}) مطمئن هستید؟ یک ایمیل تاییدیه نیز برای کاربر ارسال خواهد شد.`,
      type: 'info',
      confirmText: 'بله، تأیید و فعال شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        setActionLoading(user.id);
        try {
          const res = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: 'APPROVED',
              allowedPaths: user.allowedPaths,
            }),
          });

          if (res.ok) {
            showAlert(`حساب کاربری «${user.name}» با موفقیت تایید و فعال شد و ایمیل تاییدیه ارسال گردید.`, 'فعال‌سازی موفق', 'success');
            fetchData();
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در تایید کاربر', 'خطا', 'error');
          }
        } catch (err) {
          console.error(err);
          showAlert('خطا در برقراری ارتباط با سرور', 'خطای شبکه', 'error');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDelete = (id: number, userName?: string) => {
    showConfirm({
      title: 'حذف حساب کاربری',
      message: `آیا از حذف ${userName ? `«${userName}»` : 'این کاربر'} مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`,
      type: 'error',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            showAlert('کاربر با موفقیت از سیستم حذف شد.', 'حذف موفق', 'success');
            fetchData();
          } else {
            showAlert((await res.json()).error || 'خطا در حذف کاربر', 'خطا', 'error');
          }
        } catch (err) {
          showAlert('خطا در برقراری ارتباط با سرور', 'خطای شبکه', 'error');
        }
      },
    });
  };

  const resetFormAndGoList = () => {
    setView('list');
    setShowPassword(false);
  };

  const pendingCount = users.filter(u => u.status === 'PENDING').length;
  const filteredUsers = users.filter(u => {
    if (filterTab === 'pending') return u.status === 'PENDING';
    if (filterTab === 'approved') return u.status === 'APPROVED';
    return true;
  });

  if (loading) return <div className="text-center py-20 font-bold text-gray-400 animate-pulse">در حال بررسی سطوح دسترسی...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 text-gray-800" dir="rtl">
      {/* هدر صفحه */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black">{currentUser?.role === 'MAIN_ADMIN' ? 'مدیریت کاربران و دسترسی‌ها' : 'مدیریت پروفایل'}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {currentUser?.role === 'MAIN_ADMIN' ? 'بررسی درخواست‌های ثبت‌نام، تایید کاربران جدید و تنظیم سطوح دسترسی' : 'تغییر نام و رمز عبور شخصی'}
          </p>
        </div>
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={32} /></div>
      </div>

      {view === 'list' && currentUser?.role === 'MAIN_ADMIN' ? (
        <div className="space-y-6">
          
          {/* نوار وضعیت درخواست‌های در انتظار */}
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-amber-900">
                <AlertTriangle size={24} className="text-amber-600 shrink-0" />
                <div>
                  <div className="font-black text-sm sm:text-base">{pendingCount} کاربر جدید در انتظار تایید ثبت‌نام هستند!</div>
                  <div className="text-xs text-amber-700 mt-0.5">کاربران پس از تایید توسط شما ایمیل فعال‌سازی دریافت کرده و امکان ورود خواهند داشت.</div>
                </div>
              </div>
              <button
                onClick={() => setFilterTab('pending')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer"
              >
                مشاهده درخواست‌ها ({pendingCount})
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
            
            {/* ابزارها و تب‌های فیلتر */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  همه ({users.length})
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${filterTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  در انتظار تایید
                  {pendingCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === 'pending' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'}`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFilterTab('approved')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filterTab === 'approved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  تایید شده ({users.filter(u => u.status === 'APPROVED').length})
                </button>
              </div>

              <button
                onClick={() => {
                  setFormData({ id: null, name: '', email: '', password: '', role: 'CONTENT_ADMIN', status: 'APPROVED', allowedPaths: '' });
                  setShowPassword(false);
                  setView('form');
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus size={18} /> افزودن کاربر / مدیر جدید
              </button>
            </div>

            {/* جدول لیست کاربران */}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-100">
                    <th className="p-4 font-bold">نام و نام خانوادگی</th>
                    <th className="p-4 font-bold">ایمیل</th>
                    <th className="p-4 font-bold text-center">نقش</th>
                    <th className="p-4 font-bold text-center">وضعیت حساب</th>
                    <th className="p-4 font-bold text-center">تاریخ ثبت‌نام</th>
                    <th className="p-4 font-bold text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 font-bold text-sm">
                        هیچ کاربری در این بخش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-4 font-bold text-sm text-gray-900">{u.name}</td>
                        <td className="p-4 text-gray-500 text-sm font-mono" dir="ltr">{u.email}</td>
                        
                        {/* نقش کاربری */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black ${
                            u.role === 'MAIN_ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            <Shield size={12} />
                            {u.role === 'MAIN_ADMIN' ? 'مدیر ارشد' : 'مدیر محتوا'}
                          </span>
                        </td>

                        {/* وضعیت تایید */}
                        <td className="p-4 text-center">
                          {u.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              <Clock size={12} /> در انتظار تایید
                            </span>
                          )}
                          {u.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} /> تایید و فعال
                            </span>
                          )}
                          {u.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle size={12} /> رد شده
                            </span>
                          )}
                          {u.status === 'BLOCKED' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-gray-200 text-gray-700">
                              مسدود
                            </span>
                          )}
                        </td>

                        {/* تاریخ ثبت‌نام */}
                        <td className="p-4 text-center text-xs text-gray-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fa-IR') : '---'}
                        </td>

                        {/* دکمه‌های عملیات */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* دکمه تایید سریع برای کاربران در انتظار */}
                            {u.status === 'PENDING' && (
                              <button
                                onClick={() => handleQuickApprove(u)}
                                disabled={actionLoading === u.id}
                                title="تایید و فعال‌سازی حساب + ارسال ایمیل"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-sm shadow-emerald-600/20"
                              >
                                <UserCheck size={14} /> تایید و فعال‌سازی
                              </button>
                            )}

                            {/* ویرایش */}
                            <button
                              onClick={() => {
                                setFormData({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                  password: '',
                                  role: u.role,
                                  status: u.status || 'APPROVED',
                                  allowedPaths: u.allowedPaths || ''
                                });
                                setShowPassword(false);
                                setView('form');
                              }}
                              title="ویرایش مشخصات و دسترسی‌ها"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit size={16} />
                            </button>

                            {/* حذف */}
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleDelete(u.id, u.name)}
                                title="حذف کاربر"
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* فرم ویرایش یا ایجاد کاربر */
        <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h3 className="text-xl font-bold">{formData.id ? 'ویرایش کاربر / دسترسی‌ها' : 'ثبت کاربر جدید'}</h3>
            {currentUser?.role === 'MAIN_ADMIN' && (
              <button type="button" onClick={resetFormAndGoList} className="text-gray-400 hover:text-gray-950 cursor-pointer"><XCircle size={24} /></button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">نام کامل</label>
              <input type="text" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">ایمیل کاربری / سازمانی</label>
              <input type="email" required dir="ltr" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={currentUser?.role !== 'MAIN_ADMIN'} />
              <p className="text-[11px] text-gray-400 mt-1.5 mr-2">
                این ایمیل جهت ورود به پنل، دریافت اعلان‌ها و مکاتبات استفاده می‌شود.
              </p>
            </div>

            {currentUser?.role === 'MAIN_ADMIN' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">سطح دسترسی (نقش)</label>
                    <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                      <option value="CONTENT_ADMIN">مدیر محتوا (ویرایشگر)</option>
                      <option value="MAIN_ADMIN">مدیر ارشد (دسترسی کامل)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">وضعیت تایید و فعالیت</label>
                    <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="APPROVED">تایید و فعال (Approved)</option>
                      <option value="PENDING">در انتظار تایید (Pending)</option>
                      <option value="REJECTED">رد شده (Rejected)</option>
                      <option value="BLOCKED">مسدود (Blocked)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">دسترسی به مسیرها (با کاما جدا کنید)</label>
                  <textarea
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="/khoshmin/products,/khoshmin/customers,/khoshmin/education"
                    value={formData.allowedPaths}
                    onChange={e => setFormData({ ...formData, allowedPaths: e.target.value })}
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    مسیرهای مجاز را با کاما انگلیسی (,) جدا کنید. مثال: <code className="bg-gray-100 px-1 rounded">/khoshmin/products,/khoshmin/customers</code>
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 mr-2">{formData.id ? "رمز عبور جدید (اختیاری)" : "رمز عبور اولیه"}</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!formData.id}
                  dir="ltr"
                  className="w-full bg-gray-50 border border-gray-200 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 mt-4 flex items-center justify-center gap-2 cursor-pointer">
              <Save size={20} /> ذخیره تغییرات
            </button>
          </div>
        </form>
      )}
    </div>
  );
}