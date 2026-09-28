'use client';
// مسیر فایل: src/app/khoshmin/customers/[id]/_components/FinancialSummaryCards.tsx

import { useEffect, useState } from 'react';
import { Banknote, FileText, CheckCircle2, TrendingDown, TrendingUp, ShieldAlert, ShieldCheck } from 'lucide-react';
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
  const [creditData, setCreditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const [invRes, payRes, credRes] = await Promise.all([
          fetch(`/api/khoshmin/customers/${customerId}/invoices`),
          fetch(`/api/khoshmin/customers/${customerId}/payments`),
          fetch(`/api/khoshmin/customers/${customerId}/credit`),
        ]);
        
        if (!invRes.ok || !payRes.ok) {
          throw new Error('خطا در دریافت اطلاعات مالی');
        }

        const invoices = await invRes.json();
        const payments = await payRes.json();
        if (credRes.ok) {
          const cred = await credRes.json();
          setCreditData(cred);
        }

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
    <div className="space-y-4 mb-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* مجموع فاکتورها */}
        <div className="bg-gradient-to-l from-blue-700 to-blue-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
            <FileText size={100} />
          </div>
          <p className="text-blue-100 font-medium mb-1 text-sm">مجموع فاکتورها (بدهی ناخالص)</p>
          <p className="text-3xl font-black relative z-10 flex items-end gap-2 font-mono">
            {totalInvoices.toLocaleString('fa-IR')} <span className="text-sm font-bold text-blue-200 mb-1 font-sans">تومان</span>
          </p>
        </div>

        {/* مجموع پرداختی‌ها */}
        <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute left-0 top-0 opacity-10 transform -translate-x-4 -translate-y-4">
            <Banknote size={100} />
          </div>
          <p className="text-emerald-100 font-medium mb-1 text-sm">مجموع دریافتی‌ها / پرداختی‌ها</p>
          <p className="text-3xl font-black relative z-10 flex items-end gap-2 font-mono">
            {totalPaid.toLocaleString('fa-IR')} <span className="text-sm font-bold text-emerald-200 mb-1 font-sans">تومان</span>
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
          <p className="text-3xl font-black relative z-10 flex items-center gap-2 font-mono">
            {totalDebt > 0 ? (
              <span className="flex items-end gap-2">
                {totalDebt.toLocaleString('fa-IR')} <span className="text-sm font-bold text-rose-200 mb-1 font-sans">تومان مانده</span>
              </span>
            ) : totalDebt < 0 ? (
              <span className="flex items-end gap-2 text-teal-100">
                {Math.abs(totalDebt).toLocaleString('fa-IR')} <span className="text-sm font-bold text-teal-200 mb-1 font-sans">تومان بستانکار</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-2xl text-slate-100 font-sans">
                تسویه کامل (بی‌حساب) <CheckCircle2 size={24} className="text-emerald-400" />
              </span>
            )}
          </p>
        </div>
      </div>

      {/* نوار پایش سقف اعتبار ریالی و ریسک صنعتی */}
      {creditData && Number(creditData.creditLimit) > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {creditData.isCreditBlocked ? (
                <ShieldAlert size={18} className="text-rose-600" />
              ) : (
                <ShieldCheck size={18} className="text-emerald-600" />
              )}
              <span className="text-xs font-black text-slate-800">
                سقف اعتبار ریالی:{' '}
                <strong className="font-mono text-slate-900">
                  {Number(creditData.creditLimit).toLocaleString('fa-IR')}
                </strong>{' '}
                تومان
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                creditData.riskRating === 'A' ? 'bg-emerald-100 text-emerald-800' :
                creditData.riskRating === 'B' ? 'bg-blue-100 text-blue-800' :
                creditData.riskRating === 'C' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                رتبه {creditData.riskRating}
              </span>
            </div>

            <div className="text-xs text-slate-600 font-bold">
              اعتبار آزاد قابل خرید:{' '}
              <span className={`font-mono font-black ${Number(creditData.availableCredit) <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {Number(creditData.availableCredit).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                creditData.utilizationRate >= 100
                  ? 'bg-rose-600'
                  : creditData.utilizationRate >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, creditData.utilizationRate))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-1 font-mono">
            <span>ریسک تعهدات باز: {Number(creditData.totalExposure).toLocaleString('fa-IR')} تومان</span>
            <span>مصرف اعتبار: {creditData.utilizationRate}%</span>
          </div>
        </div>
      )}
    </div>
  );
}