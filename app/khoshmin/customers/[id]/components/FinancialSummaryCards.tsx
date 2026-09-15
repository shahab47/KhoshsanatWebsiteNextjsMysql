'use client';
// مسیر فایل: src/app/khoshmin/customers/[id]/_components/FinancialSummaryCards.tsx

import { useEffect, useState } from 'react';
import { Banknote, FileText, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface FinancialSummaryCardsProps {
  customerId: string;
  refreshTrigger?: number;
}

export function FinancialSummaryCards({ customerId, refreshTrigger = 0 }: FinancialSummaryCardsProps) {
  const { showAlert } = useModal();
  const [totalInvoices, setTotalInvoices] = useState(0);
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

        setTotalInvoices(totalInvAmount);
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
  }, [customerId, refreshTrigger]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
      <div className="bg-gray-100 rounded-3xl p-4 h-28 animate-pulse"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-500 mb-6">
      {/* مجموع فاکتورها */}
      <div className="bg-gradient-to-l from-blue-700 to-blue-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          <FileText size={100} />
        </div>
        <p className="text-blue-100 font-medium mb-1 text-sm">مجموع فاکتورها (بدهی ناخالص)</p>
        <p className="text-3xl font-black relative z-10 flex items-end gap-2">
          {totalInvoices.toLocaleString('fa-IR')} <span className="text-sm font-bold text-blue-200 mb-1">تومان</span>
        </p>
      </div>

      {/* مجموع پرداختی‌ها */}
      <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          <Banknote size={100} />
        </div>
        <p className="text-emerald-100 font-medium mb-1 text-sm">مجموع دریافتی‌ها / پرداختی‌ها</p>
        <p className="text-3xl font-black relative z-10 flex items-end gap-2">
          {totalPaid.toLocaleString('fa-IR')} <span className="text-sm font-bold text-emerald-200 mb-1">تومان</span>
        </p>
      </div>

      {/* تراز نهایی وضعیت تسویه */}
      <div className={`rounded-3xl p-6 text-white shadow-md relative overflow-hidden transition-colors ${
        totalDebt > 0 
          ? 'bg-gradient-to-l from-rose-700 to-rose-600' 
          : totalDebt < 0 
          ? 'bg-gradient-to-l from-teal-700 to-teal-600'
          : 'bg-gradient-to-l from-slate-700 to-slate-600'
      }`}>
        <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
          {totalDebt > 0 ? <TrendingDown size={100} /> : totalDebt < 0 ? <TrendingUp size={100} /> : <CheckCircle2 size={100} />}
        </div>
        <p className="font-medium mb-1 text-sm text-white/80">
          {totalDebt > 0 ? 'مانده بدهی (بدهکار)' : totalDebt < 0 ? 'بستانکار (طلب مشتری / پیش‌پرداخت)' : 'وضعیت حساب (تسویه شده)'}
        </p>
        <p className="text-3xl font-black relative z-10 flex items-center gap-2">
          {totalDebt > 0 ? (
            <span className="flex items-end gap-2">
              {totalDebt.toLocaleString('fa-IR')} <span className="text-sm font-bold text-rose-200 mb-1">تومان مانده</span>
            </span>
          ) : totalDebt < 0 ? (
            <span className="flex items-end gap-2 text-teal-100">
              {Math.abs(totalDebt).toLocaleString('fa-IR')} <span className="text-sm font-bold text-teal-200 mb-1">تومان بستانکار</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-2xl text-slate-100">
              تسویه کامل (بی‌حساب) <CheckCircle2 size={24} className="text-emerald-400" />
            </span>
          )}
        </p>
      </div>
    </div>
  );
}