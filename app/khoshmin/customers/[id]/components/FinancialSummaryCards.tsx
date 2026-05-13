'use client';
// مسیر فایل: src/app/khoshmin/customers/[id]/_components/FinancialSummaryCards.tsx

import { useEffect, useState } from 'react';
import { Banknote, FileText, CheckCircle2, TrendingDown } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

// 🟢 تعریف صریح پراپ‌ها
interface FinancialSummaryCardsProps {
  customerId: string;
  refreshTrigger?: number;
}

export function FinancialSummaryCards({ customerId, refreshTrigger = 0 }: FinancialSummaryCardsProps) {
  const { showAlert } = useModal();
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const [invRes, payRes] = await Promise.all([
          fetch(`/api/khoshmin/customers/${customerId}/invoices`),
          fetch(`/api/khoshmin/customers/${customerId}/payments`)
        ]);
        
        if (!invRes.ok || !payRes.ok) {
          throw new Error('خطا در دریافت اطلاعات مالی');
        }

        const invoices = await invRes.json();
        const payments = await payRes.json();

        const totalInvAmount = invoices.reduce((sum: number, inv: any) => {
          if (inv.status === 'CANCELLED') return sum;
          return sum + (inv.finalAmount || 0);
        }, 0);
        
        const totalPayAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        setTotalPaid(totalPayAmount);
        setTotalDebt(totalInvAmount - totalPayAmount);
      } catch (err) {
        console.error('خطا در محاسبه اطلاعات مالی', err);
        showAlert('خطا در دریافت اطلاعات مالی مشتری. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFinances();
  }, [customerId, refreshTrigger, showAlert]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-500 mb-6">
      <div className="bg-gradient-to-l from-blue-600 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/30 relative overflow-hidden">
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          <FileText size={100} />
        </div>
        <p className="text-blue-100 font-medium mb-1 text-sm">مجموع فاکتورها (بدهی کل)</p>
        <p className="text-3xl font-black relative z-10 flex items-end gap-2">
          {(totalDebt + totalPaid).toLocaleString()} <span className="text-sm font-bold text-blue-200 mb-1">تومان</span>
        </p>
      </div>

      <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/30 relative overflow-hidden">
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          <Banknote size={100} />
        </div>
        <p className="text-emerald-100 font-medium mb-1 text-sm">مجموع پرداختی‌ها</p>
        <p className="text-3xl font-black relative z-10 flex items-end gap-2">
          {totalPaid.toLocaleString()} <span className="text-sm font-bold text-emerald-200 mb-1">تومان</span>
        </p>
      </div>

      <div className={`rounded-3xl p-6 text-white shadow-lg relative overflow-hidden transition-colors ${totalDebt > 0 ? 'bg-gradient-to-l from-rose-600 to-rose-500 shadow-rose-500/30' : 'bg-gradient-to-l from-slate-700 to-slate-600 shadow-slate-500/30'}`}>
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          {totalDebt > 0 ? <TrendingDown size={100} /> : <CheckCircle2 size={100} />}
        </div>
        <p className={`font-medium mb-1 text-sm ${totalDebt > 0 ? 'text-rose-100' : 'text-slate-300'}`}>وضعیت تسویه</p>
        <p className="text-3xl font-black relative z-10 flex items-center gap-2">
          {totalDebt > 0 ? (
            <span className="flex items-end gap-2">
              {totalDebt.toLocaleString()} <span className="text-sm font-bold text-rose-200 mb-1">تومان مانده</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-2xl">
              تسویه شده کامل <CheckCircle2 size={24} />
            </span>
          )}
        </p>
      </div>
    </div>
  );
}