'use client';
import { useEffect, useState } from 'react';

export function FinancialSummaryCards({ customerId }: { customerId: string }) {
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        const data = await res.json();
        setTotalDebt(data.totalDebt || 0);
        setTotalPaid(data.totalPaid || 0);
      } catch (err) {
        console.error('خطا در دریافت اطلاعات مالی', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
        <p className="text-sm opacity-80">مجموع بدهی</p>
        <p className="text-2xl font-bold">{totalDebt.toLocaleString()} تومان</p>
      </div>
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 text-white">
        <p className="text-sm opacity-80">مجموع پرداختی</p>
        <p className="text-2xl font-bold">{totalPaid.toLocaleString()} تومان</p>
      </div>
      <div className={`rounded-2xl p-4 text-white ${totalDebt > 0 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
        <p className="text-sm opacity-80">وضعیت تسویه</p>
        <p className="text-2xl font-bold">{totalDebt > 0 ? `${totalDebt.toLocaleString()} تومان بدهکار` : 'تسویه شده'}</p>
      </div>
    </div>
  );
}