'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Mail, Phone, Eye, UserPlus, DollarSign, Trash2, MessageSquare, StickyNote, AlertCircle } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  totalDebt: number;
  totalPaid: number;
  status: string;
  createdAt: string;
  hasNotification: boolean;
  _count?: {
    messages: number;
    notes: number;
  };
  unreadMessagesCount?: number;
  newNotesCount?: number;
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const { showConfirm, showAlert } = useModal();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/khoshmin/customers');
      if (!res.ok) throw new Error('خطا در دریافت مشتریان');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showAlert('مشکلی در دریافت لیست مشتریان وجود دارد. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    showConfirm({
      title: 'حذف مشتری',
      message: `آیا از حذف مشتری "${name}" اطمینان دارید؟\nتوجه: تمام اطلاعات مرتبط (فاکتورها، پرداخت‌ها و غیره) نیز حذف خواهند شد.`,
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          const res = await fetch(`/api/khoshmin/customers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showAlert('مشتری با موفقیت حذف شد.', 'موفقیت', 'success');
            await fetchCustomers();
          } else {
            const error = await res.json();
            showAlert(error.error || 'خطا در حذف مشتری', 'خطا', 'error');
          }
        } catch (error) {
          showAlert('خطا در ارتباط با سرور. لطفاً مجدد تلاش کنید.', 'خطا', 'error');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      (customer.phone && customer.phone.includes(search));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'has_debt' && (customer.totalDebt || 0) > 0) ||
      (filter === 'is_creditor' && (customer.totalDebt || 0) < 0) ||
      (filter === 'no_debt' && (customer.totalDebt || 0) === 0);

    return matchesSearch && matchesFilter;
  });

  const renderBalance = (debtAmount: number) => {
    if (debtAmount > 0) {
      return (
        <div className="flex flex-col items-end">
          <p className="font-black text-red-600 text-lg">{Math.abs(debtAmount).toLocaleString()} <span className="text-[10px] font-normal">تومان</span></p>
          <p className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">بدهکار</p>
        </div>
      );
    } else if (debtAmount < 0) {
      return (
        <div className="flex flex-col items-end">
          <p className="font-black text-emerald-600 text-lg">{Math.abs(debtAmount).toLocaleString()} <span className="text-[10px] font-normal">تومان</span></p>
          <p className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">بستانکار (طلبکار)</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-end">
        <p className="font-bold text-gray-400 text-lg">0 <span className="text-[10px] font-normal">تومان</span></p>
        <p className="text-[10px] font-bold text-gray-300">بی‌حساب / تسویه</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-bold animate-pulse">در حال دریافت لیست مشتریان...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* بخش بالای صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">مدیریت مشتریان</h1>
          <p className="text-slate-500 mt-1">مانیتورینگ تراز مالی، پیام‌های جدید و مدیریت کلی مشتریان</p>
        </div>
        <Link
          href="/khoshmin/customers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          <UserPlus size={20} />
          <span className="font-bold">افزودن مشتری جدید</span>
        </Link>
      </div>

      {/* فیلترها */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-4 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، شرکت، موبایل یا ایمیل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {[
              { id: 'all', label: 'همه', color: 'slate' },
              { id: 'has_debt', label: 'بدهکاران', color: 'red', icon: <DollarSign size={16} /> },
              { id: 'is_creditor', label: 'طلبکاران', color: 'emerald' },
              { id: 'no_debt', label: 'تسویه شده', color: 'blue' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 ${
                  filter === btn.id
                    ? `bg-slate-800 text-white shadow-md`
                    : `bg-slate-100 text-slate-500 hover:bg-slate-200`
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* جدول مشتریان */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-sm font-black text-slate-600">اطلاعات مشتری</th>
                <th className="p-6 text-sm font-black text-slate-600">تماس و ارتباط</th>
                <th className="p-6 text-sm font-black text-slate-600 text-left">تراز مالی نهایی</th>
                <th className="p-6 text-sm font-black text-slate-600">فعالیت‌های جدید</th>
                <th className="p-6 text-sm font-black text-slate-600 w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/khoshmin/customers/${customer.id}`)}
                  className={`group cursor-pointer hover:bg-blue-50/40 transition-all duration-200 ${
                    customer.unreadMessagesCount || customer.newNotesCount ? 'bg-amber-50/10' : ''
                  }`}
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-base group-hover:text-blue-600 transition-colors">{customer.name}</p>
                        {customer.company && (
                          <p className="text-xs text-slate-400 font-bold mt-0.5">{customer.company}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Mail size={14} className="text-blue-400" />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold font-mono">
                          <Phone size={14} className="text-emerald-400" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-left">
                    {renderBalance(customer.totalDebt || 0)}
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {(customer.unreadMessagesCount || 0) > 0 && (
                        <span className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[11px] font-black px-2.5 py-1.5 rounded-xl border border-red-100 animate-pulse">
                          <MessageSquare size={12} />
                          {customer.unreadMessagesCount} پیام جدید
                        </span>
                      )}
                      {(customer.newNotesCount || 0) > 0 && (
                        <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 text-[11px] font-black px-2.5 py-1.5 rounded-xl border border-amber-100">
                          <StickyNote size={12} />
                          {customer.newNotesCount} یادداشت
                        </span>
                      )}
                      {!(customer.unreadMessagesCount || customer.newNotesCount) && (
                        <span className="text-slate-300 text-[11px] font-bold italic">بدون اعلان جدید</span>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/khoshmin/customers/${customer.id}`); }}
                        className="p-2.5 text-blue-500 hover:bg-blue-100 rounded-2xl transition-colors"
                        title="مشاهده پروفایل"
                      >
                        <Eye size={22} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, customer.id, customer.name)}
                        disabled={deletingId === customer.id}
                        className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all disabled:opacity-30"
                        title="حذف دائمی"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-24 bg-slate-50/30">
            <AlertCircle className="mx-auto text-slate-200 mb-3" size={64} />
            <p className="text-slate-400 font-black text-lg">مشتری مورد نظر در لیست یافت نشد.</p>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="mt-4 text-blue-600 font-bold hover:underline">
              نمایش همه مشتریان
            </button>
          </div>
        )}
      </div>
    </div>
  );
}