'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Printer,
  RefreshCw,
  FileText,
  CreditCard,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface StatementEntry {
  id: string;
  voucherId: string;
  voucherNo: number;
  voucherDate: string;
  voucherType: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'DEBTOR' | 'CREDITOR' | 'BALANCED';
  referenceInfo: any;
}

interface AgingBucket {
  amount: number;
  count: number;
  label: string;
}

interface AgingData {
  bucket0_30: AgingBucket;
  bucket31_60: AgingBucket;
  bucket61_90: AgingBucket;
  bucketOver90: AgingBucket;
  totalOverdue: number;
}

export function CustomerStatementTab({ customerId }: { customerId: string }) {
  const { showAlert } = useModal();
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [aging, setAging] = useState<AgingData | null>(null);
  const [creditStatus, setCreditStatus] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [finalLedgerBalance, setFinalLedgerBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  const fetchStatementData = async () => {
    try {
      setRefreshing(true);
      const [stmtRes, agingRes, creditRes] = await Promise.all([
        fetch(`/api/khoshmin/customers/${customerId}/statement`),
        fetch(`/api/khoshmin/customers/${customerId}/aging`),
        fetch(`/api/khoshmin/customers/${customerId}/credit`),
      ]);

      if (stmtRes.ok) {
        const data = await stmtRes.json();
        setStatement(data.statement || []);
        setCustomerName(data.customerName || '');
        setFinalLedgerBalance(data.finalLedgerBalance || 0);
      }

      if (agingRes.ok) {
        const agingData = await agingRes.json();
        setAging(agingData);
      }

      if (creditRes.ok) {
        const credData = await creditRes.json();
        setCreditStatus(credData);
      }
    } catch (err) {
      console.error('Error fetching statement:', err);
      showAlert('خطا در دریافت اطلاعات صورتحساب و دفاتر', 'خطا', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatementData();
  }, [customerId]);

  const handlePrint = () => {
    window.print();
  };

  const toPersianDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin mb-3 text-blue-600" size={36} />
        <p className="font-bold text-sm">در حال بارگذاری صورتحساب رسمی و دفاتر معین...</p>
      </div>
    );
  }

  const totalDebits = statement.reduce((sum, row) => sum + row.debit, 0);
  const totalCredits = statement.reduce((sum, row) => sum + row.credit, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* هدر اکشن‌ها و ابزارها */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">
              صورتحساب مالی و گردش دفتر معین مشتری
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              رهگیری کرونولوژیک تمام فاکتورها، پرداخت‌ها و اسناد دوبل ثبت‌شده در کد معین ۱۱۰۳۰۱
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatementData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            بروزرسانی
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-sm"
          >
            <Printer size={14} />
            چاپ صورتحساب
          </button>
        </div>
      </div>

      {/* کارت‌های خلاصه وضعیت دفتر معین */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* کل بدهکار */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-500 mb-1">جمع گردش بدهکار (فاکتورها)</p>
          <p className="text-xl font-black text-slate-800 font-mono">
            {totalDebits.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">تومان</span>
          </p>
        </div>

        {/* کل بستانکار */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-500 mb-1">جمع گردش بستانکار (دریافتی‌ها)</p>
          <p className="text-xl font-black text-emerald-700 font-mono">
            {totalCredits.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-500">تومان</span>
          </p>
        </div>

        {/* مانده معین نهایی */}
        <div className={`rounded-2xl p-4 border ${
          finalLedgerBalance > 0
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : finalLedgerBalance < 0
            ? 'bg-teal-50/70 border-teal-200 text-teal-900'
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <p className="text-xs font-bold mb-1 opacity-80">مانده تراز دفتر معین (پایان دوره)</p>
          <p className="text-xl font-black font-mono flex items-center gap-2">
            {Math.abs(finalLedgerBalance).toLocaleString('fa-IR')}
            <span className="text-xs font-bold">تومان</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
              finalLedgerBalance > 0
                ? 'bg-rose-200 text-rose-800'
                : finalLedgerBalance < 0
                ? 'bg-teal-200 text-teal-800'
                : 'bg-slate-200 text-slate-800'
            }`}>
              {finalLedgerBalance > 0 ? 'بدهکار' : finalLedgerBalance < 0 ? 'بستانکار' : 'تسویه'}
            </span>
          </p>
        </div>

        {/* وضعیت سقف اعتبار و ریسک */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">اعتبار آزاد در دسترس</span>
            {creditStatus && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                creditStatus.riskRating === 'A' ? 'bg-emerald-100 text-emerald-800' :
                creditStatus.riskRating === 'B' ? 'bg-blue-100 text-blue-800' :
                creditStatus.riskRating === 'C' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                رتبه {creditStatus.riskRating}
              </span>
            )}
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">
            {creditStatus && Number(creditStatus.creditLimit) > 0 ? (
              <span>
                {Math.max(0, Number(creditStatus.availableCredit)).toLocaleString('fa-IR')}{' '}
                <span className="text-xs font-bold text-slate-500">تومان</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400">نامحدود / تعریف نشده</span>
            )}
          </p>
        </div>
      </div>

      {/* ویجت تحلیل سنی مطالبات (AR Aging Analysis) */}
      {aging && aging.totalOverdue > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="text-sm font-black text-slate-800">
                تحلیل سنی مطالبات و فاکتورهای سررسیدگذشته
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-600">
              کل مطالبات تسویه‌نشده:{' '}
              <strong className="text-slate-900 font-mono">
                {aging.totalOverdue.toLocaleString('fa-IR')}
              </strong>{' '}
              تومان
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-slate-500 mb-1">{aging.bucket0_30.label}</p>
              <p className="text-sm font-black text-slate-800 font-mono">
                {aging.bucket0_30.amount.toLocaleString('fa-IR')}{' '}
                <span className="text-[10px] text-slate-400">({aging.bucket0_30.count} فاکتور)</span>
              </p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-blue-700 mb-1">{aging.bucket31_60.label}</p>
              <p className="text-sm font-black text-blue-900 font-mono">
                {aging.bucket31_60.amount.toLocaleString('fa-IR')}{' '}
                <span className="text-[10px] text-blue-400">({aging.bucket31_60.count} فاکتور)</span>
              </p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-amber-700 mb-1">{aging.bucket61_90.label}</p>
              <p className="text-sm font-black text-amber-900 font-mono">
                {aging.bucket61_90.amount.toLocaleString('fa-IR')}{' '}
                <span className="text-[10px] text-amber-500">({aging.bucket61_90.count} فاکتور)</span>
              </p>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-rose-700 mb-1">{aging.bucketOver90.label}</p>
              <p className="text-sm font-black text-rose-900 font-mono">
                {aging.bucketOver90.amount.toLocaleString('fa-IR')}{' '}
                <span className="text-[10px] text-rose-400">({aging.bucketOver90.count} فاکتور)</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* جدول گردش حساب دفتر معین */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
          <span className="font-black text-sm text-slate-800">دفتر ریز گردش حساب (روزنامه معین)</span>
          <span className="text-xs text-slate-500 font-bold">
            تعداد رخدادها: {statement.length.toLocaleString('fa-IR')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-black">
                <th className="py-3 px-3 w-12 text-center">ردیف</th>
                <th className="py-3 px-3 w-24">تاریخ</th>
                <th className="py-3 px-3 w-28">شماره سند</th>
                <th className="py-3 px-3 w-32">مدرک مرجع</th>
                <th className="py-3 px-4">شرح تراکنش مالی</th>
                <th className="py-3 px-3 text-left w-32">بدهکار (فاکتور)</th>
                <th className="py-3 px-3 text-left w-32">بستانکار (واریزی)</th>
                <th className="py-3 px-3 text-left w-36">مانده دفتر معین</th>
                <th className="py-3 px-3 text-center w-24">تشخیص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    هیچ رویداد یا سند مالی برای این مشتری ثبت نشده است.
                  </td>
                </tr>
              ) : (
                statement.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {(idx + 1).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {toPersianDate(row.voucherDate)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                        سند #{row.voucherNo}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {row.referenceInfo?.invoiceNo ? (
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {row.referenceInfo.invoiceNo}
                        </span>
                      ) : row.referenceInfo?.receiptNo ? (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          فیش {row.referenceInfo.receiptNo}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">سند افتتاحیه / اصلاحی</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 max-w-md">
                      {row.description}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-800 whitespace-nowrap">
                      {row.debit > 0 ? row.debit.toLocaleString('fa-IR') : '-'}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {row.credit > 0 ? row.credit.toLocaleString('fa-IR') : '-'}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black whitespace-nowrap text-slate-900">
                      {Math.abs(row.runningBalance).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          row.balanceType === 'DEBTOR'
                            ? 'bg-rose-100 text-rose-800'
                            : row.balanceType === 'CREDITOR'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.balanceType === 'DEBTOR'
                          ? 'بدهکار'
                          : row.balanceType === 'CREDITOR'
                          ? 'بستانکار'
                          : 'تسویه'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {statement.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-left">
                    مجموع گردش و مانده نهایی دفتر معین:
                  </td>
                  <td className="py-3 px-3 text-left font-mono whitespace-nowrap">
                    {totalDebits.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-800 whitespace-nowrap">
                    {totalCredits.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-3 text-left font-mono whitespace-nowrap text-blue-900 text-sm">
                    {Math.abs(finalLedgerBalance).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                        finalLedgerBalance > 0
                          ? 'bg-rose-200 text-rose-900'
                          : finalLedgerBalance < 0
                          ? 'bg-teal-200 text-teal-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {finalLedgerBalance > 0 ? 'بدهکار' : finalLedgerBalance < 0 ? 'بستانکار' : 'تسویه'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
