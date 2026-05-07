// src/app/admin/customers/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Mail, Phone, Eye, UserPlus, DollarSign, Trash2 } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  totalDebt: number;
  status: string;
  createdAt: string;
  hasNotification: boolean;
  _count?: {
    unreadMessages: number;
    newNotes: number;
  };
}

export default function AdminCustomersPage() {
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
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `آیا از حذف مشتری "${name}" اطمینان دارید؟\nتوجه: تمام اطلاعات مرتبط (فاکتورها، پرداخت‌ها، پیام‌ها و یادداشت‌ها) نیز حذف خواهند شد و این عمل غیرقابل بازگشت است.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('مشتری با موفقیت حذف شد.');
        await fetchCustomers();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در حذف مشتری');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('خطا در ارتباط با سرور');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.includes(search) || 
                          customer.email.includes(search) ||
                          (customer.phone && customer.phone.includes(search));
    const matchesFilter = filter === 'all' || 
                         (filter === 'has_debt' && customer.totalDebt > 0) ||
                         (filter === 'no_debt' && customer.totalDebt === 0);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">مدیریت مشتریان</h1>
          <p className="text-gray-500 mt-1">مدیریت اطلاعات، فاکتورها و وضعیت مشتریان</p>
        </div>
        <Link 
          href="/admin/customers/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <UserPlus size={20} />
          افزودن مشتری جدید
        </Link>
      </div>

      {/* فیلترها و جستجو */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، ایمیل یا شماره تماس..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              همه
            </button>
            <button
              onClick={() => setFilter('has_debt')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${filter === 'has_debt' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <DollarSign size={16} />
              بدهکاران
            </button>
            <button
              onClick={() => setFilter('no_debt')}
              className={`px-4 py-2 rounded-xl transition ${filter === 'no_debt' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              بدون بدهی
            </button>
          </div>
        </div>
      </div>

      {/* جدول مشتریان */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">مشتری</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">اطلاعات تماس</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">وضعیت مالی</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">فعالیت‌ها</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                    customer.hasNotification ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-gray-800">{customer.name}</p>
                      {customer.company && (
                        <p className="text-sm text-gray-500">{customer.company}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className={`font-bold ${customer.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {customer.totalDebt.toLocaleString()} تومان
                      </p>
                      <p className="text-xs text-gray-400">
                        {customer.totalDebt > 0 ? 'بدهکار' : 'تسویه شده'}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {((customer._count?.unreadMessages ?? 0) > 0) && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                          {customer._count?.unreadMessages} پیام جدید
                        </span>
                      )}
                      {((customer._count?.newNotes ?? 0) > 0) && (
                        <span className="bg-yellow-100 text-yellow-600 text-xs px-2 py-1 rounded-full">
                          {customer._count?.newNotes} یادداشت جدید
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(customer.id, customer.name)}
                        disabled={deletingId === customer.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="حذف مشتری"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">مشتری‌ای یافت نشد</p>
          </div>
        )}
      </div>
    </div>
  );
}