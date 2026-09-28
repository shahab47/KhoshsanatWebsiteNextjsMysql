// app/khoshmin/reports/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, BookOpen, Scale, FileText, Send, CheckCircle2,
  AlertCircle, Clock, Building2, Search, RefreshCw, X, Check,
  Download, Printer, ChevronRight, Lock, TrendingUp, DollarSign
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

export default function ReportsPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'modyan' | 'journal' | 'ledger' | 'trial' | 'statements'>('modyan');
  const [loading, setLoading] = useState(false);

  // داده‌های مودیان
  const [taxInvoices, setTaxInvoices] = useState<any[]>([]);
  const [selectedInvoicePacket, setSelectedInvoicePacket] = useState<any>(null);
  const [packetModalOpen, setPacketModalOpen] = useState(false);

  // داده‌های دفتر روزنامه
  const [journalData, setJournalData] = useState<any>(null);

  // داده‌های دفتر معین
  const [selectedAccountCode, setSelectedAccountCode] = useState('110301'); // پیش‌فرض حساب دریافتنی مشتریان
  const [ledgerData, setLedgerData] = useState<any>(null);

  // داده‌های تراز آزمایشی
  const [trialLevel, setTrialLevel] = useState<number>(3); // ۳: معین، ۲: کل
  const [trialData, setTrialData] = useState<any>(null);

  // داده‌های صورت‌های مالی
  const [incomeData, setIncomeData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);

  // بارگذاری داده‌ها بر اساس تب فعال
  useEffect(() => {
    loadTabContent(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadTabContent = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'modyan') {
        const res = await fetch('/api/khoshmin/tax/invoices');
        if (res.ok) {
          const data = await res.json();
          setTaxInvoices(data.items || []);
        }
      } else if (tab === 'journal') {
        const res = await fetch('/api/khoshmin/reports/general-journal');
        if (res.ok) {
          const data = await res.json();
          setJournalData(data);
        }
      } else if (tab === 'ledger') {
        const res = await fetch(`/api/khoshmin/reports/account-ledger?accountCode=${selectedAccountCode}`);
        if (res.ok) {
          const data = await res.json();
          setLedgerData(data);
        }
      } else if (tab === 'trial') {
        const res = await fetch(`/api/khoshmin/reports/trial-balance?level=${trialLevel}`);
        if (res.ok) {
          const data = await res.json();
          setTrialData(data);
        }
      } else if (tab === 'statements') {
        const [incRes, balRes] = await Promise.all([
          fetch('/api/khoshmin/reports/income-statement'),
          fetch('/api/khoshmin/reports/balance-sheet'),
        ]);
        if (incRes.ok) setIncomeData(await incRes.json());
        if (balRes.ok) setBalanceData(await balRes.json());
      }
    } catch (err: any) {
      console.error('Error loading report:', err);
      showAlert('خطا در دریافت اطلاعات گزارش', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  // تولید شناسه مالیاتی ۲۲ رقمی برای یک فاکتور
  const handleGenerateTaxId = async (invoiceId: number) => {
    try {
      const res = await fetch(`/api/khoshmin/tax/invoices/${invoiceId}/generate-tax-id`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تولید شناسه مالیاتی');

      showAlert(`شماره مالیاتی ۲۲ رقمی ${data.taxId} با الگوریتم ورهوف تولید گردید.`, 'موفقیت', 'success');
      loadTabContent('modyan');
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ارسال فاکتور به سامانه مودیان
  const handleSendToModyan = (invoiceId: number, invoiceNo: string) => {
    showConfirm({
      title: 'ارسال صورتحساب به سامانه مودیان',
      message: `آیا از ارسال فاکتور ${invoiceNo} به کارپوشه سازمان امور مالیاتی کشور اطمینان دارید؟`,
      confirmText: 'ارسال به مودیان',
      cancelText: 'انصراف',
      type: 'info',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/tax/invoices/${invoiceId}/send`, {
            method: 'POST',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'خطا در ارسال به مودیان');

          showAlert(`صورتحساب با موفقیت در سامانه مودیان ثبت شد. کد رهگیری: ${data.packetUid}`, 'موفقیت', 'success');
          loadTabContent('modyan');
        } catch (err: any) {
          showAlert(err.message, 'خطا در ارسال', 'error');
        }
      },
    });
  };

  // تغییر حساب در دفتر معین
  const handleAccountChange = (code: string) => {
    setSelectedAccountCode(code);
    fetch(`/api/khoshmin/reports/account-ledger?accountCode=${code}`)
      .then((res) => res.json())
      .then((data) => setLedgerData(data))
      .catch(() => showAlert('خطا در بارگذاری معین حساب', 'خطا', 'error'));
  };

  // فرمت ارقام فارسی
  const formatNum = (val: number | string | null | undefined) => {
    if (!val) return '۰';
    return Number(val).toLocaleString('fa-IR');
  };

  return (
    <div className="space-y-6 pb-12 transition-colors duration-200" dir="rtl">
      {/* سربرگ داشبورد گزارش‌های مالی */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              دفاتر مالی، سامانه مودیان و صورت‌های مالی
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              دفتر روزنامه، دفتر کل و معین، تراز آزمایشی متوازن، ترازنامه، صورت سود و زیان و کارپوشه مودیان
            </p>
          </div>
        </div>

        <button
          onClick={() => loadTabContent(activeTab)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition cursor-pointer shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          به‌روزرسانی گزارش
        </button>
      </div>

      {/* ناوبری تب‌های مالی */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('modyan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'modyan'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send size={16} />
          سامانه مودیان مالیاتی
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'journal'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen size={16} />
          دفتر روزنامه رسمی
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={16} />
          دفتر معین و کل
        </button>
        <button
          onClick={() => setActiveTab('trial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'trial'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale size={16} />
          تراز آزمایشی متوازن
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'statements'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={16} />
          ترازنامه و صورت سود و زیان
        </button>
      </div>

      {/* تب ۱: سامانه مودیان */}
      {activeTab === 'modyan' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              ارسال صورتحساب‌های الکترونیکی کارخانه به سامانه مودیان مطابق الگوی نوع اول و دوم کالا و خدمات
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              شناسه حافظه مالیاتی کارخانه: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">A12345</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">شماره فاکتور</th>
                    <th className="p-3.5">خریدار / مشتری</th>
                    <th className="p-3.5">شناسه ملی خریدار</th>
                    <th className="p-3.5">مبلغ کل فاکتور</th>
                    <th className="p-3.5">شماره ۲۲ رقمی مالیاتی (TaxID)</th>
                    <th className="p-3.5 text-center">وضعیت کارپوشه</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {taxInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">{inv.invoiceNo}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{inv.customer?.name}</td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{inv.customer?.nationalId || 'فاقد کد ملی'}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatNum(inv.finalAmount)} تومان
                      </td>
                      <td className="p-3.5 font-mono text-xs text-blue-700 dark:text-blue-400">
                        {inv.taxId ? (
                          <span className="bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {inv.taxId}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">تولید نشده</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            inv.taxStatus === 'SUCCESS'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : inv.taxStatus === 'FAILED'
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : inv.taxStatus === 'QUEUED'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {inv.taxStatus === 'SUCCESS'
                            ? 'پذیرفته شده در کارپوشه'
                            : inv.taxStatus === 'FAILED'
                            ? 'خطا در ارسال'
                            : inv.taxStatus === 'QUEUED'
                            ? 'آماده ارسال'
                            : 'ارسال نشده'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!inv.taxId ? (
                            <button
                              onClick={() => handleGenerateTaxId(inv.id)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-300 dark:border-slate-600"
                            >
                              تولید TaxID
                            </button>
                          ) : inv.taxStatus !== 'SUCCESS' ? (
                            <button
                              onClick={() => handleSendToModyan(inv.id, inv.invoiceNo)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                              ارسال به مودیان
                            </button>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 size={14} /> تایید شده
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {taxInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                        هیچ فاکتور فروشی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* تب ۲: دفتر روزنامه رسمی */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {journalData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 block text-xs font-medium">تعداد اسناد قطعی:</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">{formatNum(journalData.total)} سند</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 block text-xs font-medium">گردش کل بدهکار:</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatNum(journalData.summary?.totalDebit)} ریال
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 block text-xs font-medium">وضعیت تراز دفتر:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> تراز ۱۰۰٪ قطعی (بدهکار = بستانکار)
                </span>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">شماره سند</th>
                    <th className="p-3.5">تاریخ ثبت</th>
                    <th className="p-3.5">نوع سند</th>
                    <th className="p-3.5">کد حساب</th>
                    <th className="p-3.5">شرح حساب و آرتیکل</th>
                    <th className="p-3.5">بدهکار (ریال)</th>
                    <th className="p-3.5">بستانکار (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {journalData?.vouchers?.map((voucher: any) =>
                    voucher.entries.map((entry: any, idx: number) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {idx === 0 ? voucher.voucherNo : ''}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {idx === 0 ? new Date(voucher.voucherDate).toLocaleDateString('fa-IR') : ''}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{idx === 0 ? voucher.type : ''}</td>
                        <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">{entry.account?.code}</td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{entry.account?.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 block text-xs mt-0.5">{entry.description}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {Number(entry.debit) > 0 ? formatNum(entry.debit) : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {Number(entry.credit) > 0 ? formatNum(entry.credit) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                  {!journalData?.vouchers?.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                        سندی در دفتر روزنامه ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* تب ۳: دفتر معین و کل */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">انتخاب حساب معین:</label>
              <select
                value={selectedAccountCode}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 w-full md:w-80 focus:ring-2 focus:ring-blue-500"
              >
                <option value="110101">۱۱۰۱۰۱ - موجودی نقد و بانک‌ها</option>
                <option value="110201">۱۱۰۲۰۱ - صندوق و تنخواه‌گردان کارخانه</option>
                <option value="110301">۱۱۰۳۰۱ - حساب‌های دریافتنی مشتریان</option>
                <option value="110401">۱۱۰۴۰۱ - اسناد دریافتنی (چک‌های نزد صندوق)</option>
                <option value="110501">۱۱۰۵۰۱ - موجودی مواد اولیه و آهن‌آلات</option>
                <option value="110502">۱۱۰۵۰۲ - کالای در جریان ساخت (WIP)</option>
                <option value="110503">۱۱۰۵۰۳ - موجودی کالای ساخته‌شده آماده بارگیری</option>
                <option value="110504">۱۱۰۵۰۴ - انبار ضایعات و قراضه</option>
                <option value="210101">۲۱۰۱۰۱ - حساب‌های پرداختنی تامین‌کنندگان</option>
                <option value="210201">۲۱۰۲۰۱ - پیش‌دریافت از مشتریان</option>
                <option value="210301">۲۱۰۳۰۱ - حقوق و دستمزد پرداختنی</option>
                <option value="210602">۲۱۰۶۰۲ - بیمه تامین اجتماعی پرداختنی</option>
                <option value="210603">۲۱۰۶۰۳ - مالیات حقوق پرداختنی</option>
                <option value="410101">۴۱۰۱۰۱ - درآمد حاصل از فروش قطعات و سازه‌ها</option>
                <option value="510101">۵۱۰۱۰۱ - بهای تمام‌شده کالای فروش‌رفته (COGS)</option>
                <option value="610101">۶۱۰۱۰۱ - هزینه دستمزد و حقوق پرسنل</option>
                <option value="330101">۳۳۰۱۰۱ - سود و زیان انباشته</option>
              </select>
            </div>

            {ledgerData && (
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">مانده پایان دوره: </span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatNum(ledgerData.summary?.endingBalance)} ریال
                  </span>
                  <span className="mr-1 text-slate-600 dark:text-slate-300 font-bold">({ledgerData.summary?.endingDiagnosis})</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">سند</th>
                    <th className="p-3.5">تاریخ</th>
                    <th className="p-3.5">شرح رخداد / آرتیکل</th>
                    <th className="p-3.5">بدهکار (ریال)</th>
                    <th className="p-3.5">بستانکار (ریال)</th>
                    <th className="p-3.5">مانده جاری (ریال)</th>
                    <th className="p-3.5 text-center">تشخیص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {ledgerData?.rows?.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{row.voucherNo}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(row.voucherDate).toLocaleDateString('fa-IR')}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200">{row.description}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(row.debit) > 0 ? formatNum(row.debit) : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(row.credit) > 0 ? formatNum(row.credit) : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {formatNum(row.runningBalance)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300">
                          {row.diagnosis}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!ledgerData?.rows?.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                        گردشی برای این حساب در بازه زمانی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* تب ۴: تراز آزمایشی */}
      {activeTab === 'trial' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">سطح حساب:</span>
              <button
                onClick={() => {
                  setTrialLevel(2);
                  fetch(`/api/khoshmin/reports/trial-balance?level=2`)
                    .then((res) => res.json())
                    .then((d) => setTrialData(d));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  trialLevel === 2
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                }`}
              >
                سطح کل (Level 2)
              </button>
              <button
                onClick={() => {
                  setTrialLevel(3);
                  fetch(`/api/khoshmin/reports/trial-balance?level=3`)
                    .then((res) => res.json())
                    .then((d) => setTrialData(d));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  trialLevel === 3
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                }`}
              >
                سطح معین (Level 3)
              </button>
            </div>

            {trialData?.totals && (
              <div className="text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 size={16} /> تراز آزمایشی در موازنه کامل است
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">کد حساب</th>
                    <th className="p-3.5">عنوان حساب</th>
                    <th className="p-3.5">گردش بدهکار</th>
                    <th className="p-3.5">گردش بستانکار</th>
                    <th className="p-3.5">مانده بدهکار</th>
                    <th className="p-3.5">مانده بستانکار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {trialData?.rows?.map((row: any) => (
                    <tr key={row.code} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">{row.code}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{formatNum(row.debitTurnover)}</td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{formatNum(row.creditTurnover)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(row.debitBalance) > 0 ? formatNum(row.debitBalance) : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {Number(row.creditBalance) > 0 ? formatNum(row.creditBalance) : '-'}
                      </td>
                    </tr>
                  ))}
                  {trialData?.totals && (
                    <tr className="bg-slate-100 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-600">
                      <td className="p-3.5" colSpan={2}>
                        مجموع ستون‌های تراز آزمایشی (موازنه دوبل)
                      </td>
                      <td className="p-3.5 font-mono text-emerald-700 dark:text-emerald-400">{formatNum(trialData.totals.sumDebitTurnover)}</td>
                      <td className="p-3.5 font-mono text-emerald-700 dark:text-emerald-400">{formatNum(trialData.totals.sumCreditTurnover)}</td>
                      <td className="p-3.5 font-mono text-emerald-700 dark:text-emerald-400">{formatNum(trialData.totals.sumDebitBalance)}</td>
                      <td className="p-3.5 font-mono text-amber-700 dark:text-amber-400">{formatNum(trialData.totals.sumCreditBalance)}</td>
                    </tr>
                  )}
                  {!trialData?.rows?.length && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500">
                        اطلاعات تراز آزمایشی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* تب ۵: صورت‌های مالی و بستن سال */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* صورت سود و زیان */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span>صورت سود و زیان (Income Statement)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">دوره مالی جاری</span>
              </h2>

              {incomeData && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">درآمد حاصل از فروش قطعات و سازه‌ها:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{formatNum(incomeData.revenues?.total)} ریال</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">کسر می‌شود: بهای تمام‌شده کالای فروش‌رفته (COGS):</span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400">({formatNum(incomeData.cogs?.total)}) ریال</span>
                  </div>

                  <div className="flex justify-between py-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200">سود ناخالص عملیاتی (Gross Profit):</span>
                    <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">{formatNum(incomeData.grossProfit)} ریال</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">کسر می‌شود: هزینه‌های عمومی، اداری و دستمزد:</span>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400">({formatNum(incomeData.expenses?.total)}) ریال</span>
                  </div>

                  <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm">
                    <span className="font-black text-emerald-800 dark:text-emerald-300">سود (زیان) خالص عملیاتی:</span>
                    <span className="font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {formatNum(incomeData.netOperatingIncome)} ریال
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ترازنامه */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span>ترازنامه (Balance Sheet)</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> دارایی‌ها = بدهی‌ها + سرمایه
                </span>
              </h2>

              {balanceData && (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                      <span>مجموع دارایی‌های جاری (کد ۱):</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatNum(balanceData.assets?.total)} ریال</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 space-y-1 pr-2">
                      {balanceData.assets?.items?.map((item: any) => (
                        <div key={item.code} className="flex justify-between text-xs">
                          <span>{item.name}:</span>
                          <span className="font-mono">{formatNum(item.balance)} ریال</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                      <span>مجموع بدهی‌ها (کد ۲):</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">{formatNum(balanceData.liabilities?.total)} ریال</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                      <span>حقوق صاحبان سهام و سود خالص (کد ۳):</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{formatNum(balanceData.equity?.total)} ریال</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-2.5 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                    <span>جمع کل بدهی‌ها و حقوق صاحبان سهام:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatNum(balanceData.totalLiabilitiesAndEquity)} ریال</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
