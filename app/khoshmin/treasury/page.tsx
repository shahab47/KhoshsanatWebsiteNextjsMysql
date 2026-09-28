// app/khoshmin/treasury/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark, Banknote, ShieldCheck, AlertTriangle, Clock, CheckCircle2,
  XCircle, Plus, Search, Filter, RefreshCw, ArrowUpRight, ArrowDownLeft,
  FileText, ExternalLink, Calendar, Building2, UserCheck, Loader2, Sparkles, X, ChevronDown
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string | null;
  branchCode: string | null;
  accountNumber: string;
  iban: string | null;
  isDefault: boolean;
  isActive: boolean;
  initialBalance: number;
}

interface Cheque {
  id: string;
  type: string;
  sayadId: string;
  chequeNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: string;
  bankName: string;
  bankBranch: string | null;
  drawerName: string;
  drawerNationalId: string | null;
  bounceReason: string | null;
  clearedAt: string | null;
  depositedAt: string | null;
  bouncedAt: string | null;
  customer?: { id: number; name: string; phone: string | null } | null;
  bankAccount?: { id: string; bankName: string; accountNumber: string } | null;
}

interface PettyCashFund {
  id: string;
  code: string;
  title: string;
  holderName: string;
  holderPhone: string | null;
  limitAmount: number;
  currentBalance: number;
  _count?: { transactions: number };
}

export default function TreasuryPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'cheques' | 'banks' | 'pettyCash'>('cheques');

  // داده‌ها
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [loading, setLoading] = useState(true);

  // فیلترهای چک
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // مدال‌ها
  const [depositModalCheque, setDepositModalCheque] = useState<Cheque | null>(null);
  const [selectedBankForDeposit, setSelectedBankForDeposit] = useState('');
  const [bounceModalCheque, setBounceModalCheque] = useState<Cheque | null>(null);
  const [bounceReason, setBounceReason] = useState('');
  const [newBankModalOpen, setNewBankModalOpen] = useState(false);
  const [fundCashModalFund, setFundCashModalFund] = useState<PettyCashFund | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [selectedBankForFund, setSelectedBankForFund] = useState('');

  // فرم حساب بانکی جدید
  const [newBankForm, setNewBankForm] = useState({
    bankName: '',
    branchName: '',
    branchCode: '',
    accountNumber: '',
    iban: '',
    initialBalance: '',
    isDefault: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [banksRes, chequesRes, fundsRes] = await Promise.all([
        fetch('/api/khoshmin/treasury/banks'),
        fetch('/api/khoshmin/treasury/cheques'),
        fetch('/api/khoshmin/treasury/petty-cash'),
      ]);

      if (banksRes.ok) setBanks(await banksRes.json());
      if (chequesRes.ok) setCheques(await chequesRes.json());
      if (fundsRes.ok) setFunds(await fundsRes.json());
    } catch (err) {
      console.error('Error loading treasury data:', err);
      showAlert('خطا در بارگذاری اطلاعات خزانه‌داری', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // محاسبات کارت‌های آماری
  const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.initialBalance || 0), 0);
  const chequesInPortfolio = cheques
    .filter((c) => c.status === 'RECEIVED' || c.status === 'IN_PORTFOLIO')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const chequesInClearing = cheques
    .filter((c) => c.status === 'DEPOSITED')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const chequesBounced = cheques
    .filter((c) => c.status === 'BOUNCED')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  // عملیات خواباندن به حساب (واگذاری به بانک)
  const handleDepositSubmit = async () => {
    if (!depositModalCheque || !selectedBankForDeposit) {
      showAlert('لطفاً حساب بانکی مقصد را انتخاب نمایید.', 'خطا', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/khoshmin/treasury/cheques/${depositModalCheque.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit',
          bankAccountId: selectedBankForDeposit,
        }),
      });

      if (res.ok) {
        showAlert('چک با موفقیت به بانک واگذار گردید و سند دوبل صادر شد.', 'موفقیت', 'success');
        setDepositModalCheque(null);
        loadData();
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در واگذاری چک', 'خطا', 'error');
      }
    } catch {
      showAlert('خطای ارتباط با سرور', 'خطا', 'error');
    }
  };

  // عملیات اعلام وصول چک
  const handleClearCheque = (cheque: Cheque) => {
    showConfirm({
      title: 'وصول قطعی چک صیادی',
      message: `آیا از اعلام وصول قطعی چک شماره ${cheque.chequeNumber} به مبلغ ${Number(cheque.amount).toLocaleString('fa-IR')} تومان اطمینان دارید؟ موجودی بانک افزایش یافته و سند دوبل صادر خواهد شد.`,
      type: 'info',
      confirmText: 'بله، وصول ثبت شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/treasury/cheques/${cheque.id}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear' }),
          });

          if (res.ok) {
            showAlert('وصول قطعی چک در حساب بانکی با موفقیت ثبت گردید.', 'موفقیت', 'success');
            loadData();
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در ثبت وصول چک', 'خطا', 'error');
          }
        } catch {
          showAlert('خطای ارتباط با سرور', 'خطا', 'error');
        }
      },
    });
  };

  // عملیات اعلام برگشت چک
  const handleBounceSubmit = async () => {
    if (!bounceModalCheque) return;

    try {
      const res = await fetch(`/api/khoshmin/treasury/cheques/${bounceModalCheque.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bounce',
          reason: bounceReason || 'کسری موجودی و واخواست بانکی',
        }),
      });

      if (res.ok) {
        showAlert('برگشت چک ثبت شد، بدهی مشتری احیا گردید و رتبه ریسک به‌روز شد.', 'موفقیت', 'success');
        setBounceModalCheque(null);
        setBounceReason('');
        loadData();
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در اعلام برگشت چک', 'خطا', 'error');
      }
    } catch {
      showAlert('خطای ارتباط با سرور', 'خطا', 'error');
    }
  };

  // ایجاد حساب بانکی جدید
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankForm.bankName || !newBankForm.accountNumber) {
      showAlert('نام بانک و شماره حساب الزامی است.', 'خطا', 'error');
      return;
    }

    try {
      const res = await fetch('/api/khoshmin/treasury/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBankForm,
          initialBalance: newBankForm.initialBalance ? parseFloat(newBankForm.initialBalance) : 0,
        }),
      });

      if (res.ok) {
        showAlert('حساب بانکی جدید با موفقیت اضافه گردید.', 'موفقیت', 'success');
        setNewBankModalOpen(false);
        setNewBankForm({ bankName: '', branchName: '', branchCode: '', accountNumber: '', iban: '', initialBalance: '', isDefault: false });
        loadData();
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در ایجاد حساب بانکی', 'خطا', 'error');
      }
    } catch {
      showAlert('خطای ارتباط با سرور', 'خطا', 'error');
    }
  };

  // شارژ صندوق تنخواه از بانک
  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundCashModalFund || !selectedBankForFund || !fundAmount) {
      showAlert('لطفاً حساب مبدا و مبلغ را مشخص نمایید.', 'خطا', 'error');
      return;
    }

    try {
      const res = await fetch('/api/khoshmin/treasury/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fund',
          fundId: fundCashModalFund.id,
          bankAccountId: selectedBankForFund,
          amount: parseFloat(fundAmount),
        }),
      });

      if (res.ok) {
        showAlert('صندوق تنخواه با موفقیت شارژ گردید و سند دوبل صادر شد.', 'موفقیت', 'success');
        setFundCashModalFund(null);
        setFundAmount('');
        loadData();
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در شارژ تنخواه', 'خطا', 'error');
      }
    } catch {
      showAlert('خطای ارتباط با سرور', 'خطا', 'error');
    }
  };

  // فیلتر کردن چک‌ها
  const filteredCheques = cheques.filter((c) => {
    if (chequeStatusFilter !== 'ALL' && c.status !== chequeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSayad = c.sayadId.includes(q);
      const matchNum = c.chequeNumber.includes(q);
      const matchDrawer = c.drawerName?.toLowerCase().includes(q);
      const matchCustomer = c.customer?.name?.toLowerCase().includes(q);
      return matchSayad || matchNum || matchDrawer || matchCustomer;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold"><Clock size={13}/> نزد صندوق</span>;
      case 'DEPOSITED':
        return <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold"><ArrowUpRight size={13}/> در جریان وصول (بانک)</span>;
      case 'CLEARED':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold"><CheckCircle2 size={13}/> وصول شده</span>;
      case 'BOUNCED':
        return <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg text-xs font-bold"><XCircle size={13}/> برگشت‌خورده</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 transition-colors duration-200" dir="rtl">
      {/* سربرگ صفحه خزانه‌داری */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <Landmark size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              خزانه‌داری، چک‌های صیادی و تنخواه‌گردان کارخانه
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              مدیریت حساب‌های بانکی، کنترل استعلام و وصول چک‌های صیادی و گردش صندوق‌های تنخواه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="به‌روزرسانی اطلاعات"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* کارت‌های خلاصه آماری ۴ گانه */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ۱. موجودی حساب‌های بانکی */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">موجودی حساب‌های بانکی</span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono">
              {totalBankBalance.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1.5 font-bold">تومان</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Landmark size={24} />
          </div>
        </div>

        {/* ۲. چک‌های نزد صندوق */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">چک‌های نزد صندوق اسناد</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
              {chequesInPortfolio.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1.5 font-bold">تومان</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Banknote size={24} />
          </div>
        </div>

        {/* ۳. چک‌های در جریان وصول */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">در جریان وصول (واگذار به بانک)</span>
            <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
              {chequesInClearing.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1.5 font-bold">تومان</span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Clock size={24} />
          </div>
        </div>

        {/* ۴. چک‌های برگشتی */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">چک‌های برگشتی (واخواست)</span>
            <span className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
              {chequesBounced.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1.5 font-bold">تومان</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* ناوبری تب‌های خزانه‌داری */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 rounded-2xl shadow-sm gap-2 transition-colors">
        <button
          onClick={() => setActiveTab('cheques')}
          className={`py-4 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'cheques'
              ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Banknote size={17} />
          کارتابل چک‌های صیادی
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-mono">
            {cheques.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`py-4 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'banks'
              ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Landmark size={17} />
          حساب‌های بانکی کارخانه
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-mono">
            {banks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pettyCash')}
          className={`py-4 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'pettyCash'
              ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 size={17} />
          صندوق‌های تنخواه‌گردان
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-mono">
            {funds.length}
          </span>
        </button>
      </div>

      {/* محتوای تب ۱: کارتابل چک‌های صیادی */}
      {activeTab === 'cheques' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4 transition-colors">
          {/* فیلترها و جستجو */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">فیلتر وضعیت:</span>
              {(['ALL', 'RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setChequeStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    chequeStatusFilter === st
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-650'
                  }`}
                >
                  {st === 'ALL' && 'همه چک‌ها'}
                  {st === 'RECEIVED' && 'نزد صندوق'}
                  {st === 'DEPOSITED' && 'در جریان وصول'}
                  {st === 'CLEARED' && 'وصول شده'}
                  {st === 'BOUNCED' && 'برگشت‌خورده'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی شناسه صیاد، شماره چک، مشتری..."
                className="w-full pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* جدول چک‌های صیادی */}
          {filteredCheques.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <Banknote size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">هیچ چکی با شرایط مورد نظر یافت نشد.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="p-3">شناسه ۱۶ رقمی صیاد</th>
                    <th className="p-3">شماره چک / بانک</th>
                    <th className="p-3">مشتری / صاحب حساب</th>
                    <th className="p-3 text-center">مبلغ چک (تومان)</th>
                    <th className="p-3 text-center">تاریخ سررسید</th>
                    <th className="p-3 text-center">وضعیت</th>
                    <th className="p-3 text-center">اقدامات خزانه‌داری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredCheques.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="p-3">
                        <span className="font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 px-2.5 py-1 rounded-lg font-bold border border-blue-200 dark:border-blue-800 inline-block" dir="ltr">
                          {c.sayadId}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{c.chequeNumber}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.bankName} {c.bankBranch ? `(${c.bankBranch})` : ''}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.customer?.name || '---'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">صادرکننده: {c.drawerName}</div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {Number(c.amount).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                        {new Date(c.dueDate).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* دکمه واگذاری به بانک */}
                          {(c.status === 'RECEIVED' || c.status === 'IN_PORTFOLIO') && (
                            <button
                              onClick={() => {
                                setDepositModalCheque(c);
                                const defaultB = banks.find((b) => b.isDefault);
                                if (defaultB) setSelectedBankForDeposit(defaultB.id);
                              }}
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg text-xs font-bold transition border border-blue-200 dark:border-blue-800 cursor-pointer"
                              title="خواباندن به حساب بانک"
                            >
                              واگذاری به بانک
                            </button>
                          )}

                          {/* دکمه اعلام وصول قطعی */}
                          {(c.status === 'DEPOSITED' || c.status === 'RECEIVED') && (
                            <button
                              onClick={() => handleClearCheque(c)}
                              className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                              title="وصول قطعی چک"
                            >
                              وصول شد
                            </button>
                          )}

                          {/* دکمه اعلام برگشتی */}
                          {c.status !== 'CLEARED' && c.status !== 'BOUNCED' && (
                            <button
                              onClick={() => setBounceModalCheque(c)}
                              className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg text-xs font-bold transition border border-red-200 dark:border-red-800 cursor-pointer"
                              title="اعلام برگشت چک"
                            >
                              برگشت
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* محتوای تب ۲: حساب‌های بانکی کارخانه */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">حساب‌های بانکی و تنخواه‌گردان رسمی کارخانه</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">حساب‌های متصل به درگاه، دستگاه‌های پوز کارخانه و دریافت حواله‌های خریداران</p>
            </div>
            <button
              onClick={() => setNewBankModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} /> افزودن حساب بانکی جدید
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banks.map((b) => (
              <div key={b.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl">
                      <Landmark size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{b.bankName}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.branchName || 'شعبه مرکزی'} {b.branchCode ? `(کد: ${b.branchCode})` : ''}</p>
                    </div>
                  </div>
                  {b.isDefault && (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      حساب پیش‌فرض
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 text-xs border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">شماره حساب:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{b.accountNumber}</span>
                  </div>
                  {b.iban && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">شماره شبا:</span>
                      <span className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700" dir="ltr">
                        {b.iban}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 dark:text-slate-400">موجودی دفتری:</span>
                    <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                      {Number(b.initialBalance).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* محتوای تب ۳: صندوق‌های تنخواه‌گردان */}
      {activeTab === 'pettyCash' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">صندوق‌های تنخواه‌گردان و هزینه‌های جاری کارخانه</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">پایش مانده تنخواه، ثبت هزینه‌ها با مراکز هزینه و صدور خودکار سند تسویه در دفتر کل</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funds.map((f) => (
              <div key={f.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded text-xs font-bold border border-blue-200 dark:border-blue-800 mb-1 inline-block">
                      {f.code}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{f.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">مسئول تنخواه: {f.holderName} {f.holderPhone ? `(${f.holderPhone})` : ''}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFundCashModalFund(f);
                      const defB = banks.find((b) => b.isDefault);
                      if (defB) setSelectedBankForFund(defB.id);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <Plus size={15} /> شارژ تنخواه از بانک
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">سقف مجاز تنخواه:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {Number(f.limitAmount).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">موجودی فعلی صندوق:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {Number(f.currentBalance).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* مدال واگذاری چک به بانک */}
      {depositModalCheque && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">واگذاری چک به بانک جهت وصول</h3>
              <button onClick={() => setDepositModalCheque(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <div>شماره صیاد: <strong className="font-mono">{depositModalCheque.sayadId}</strong></div>
              <div>مبلغ چک: <strong className="font-mono text-blue-700 dark:text-blue-400">{Number(depositModalCheque.amount).toLocaleString('fa-IR')} تومان</strong></div>
              <div>سررسید: <strong>{new Date(depositModalCheque.dueDate).toLocaleDateString('fa-IR')}</strong></div>
            </div>

            <div className="text-xs space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">انتخاب حساب بانکی کارخانه جهت خواباندن چک:</label>
              <select
                value={selectedBankForDeposit}
                onChange={(e) => setSelectedBankForDeposit(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber} ({b.branchName || 'مرکزی'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDepositModalCheque(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDepositSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                تایید واگذاری به بانک
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال اعلام برگشت چک */}
      {bounceModalCheque && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-red-600 dark:text-red-400 text-base flex items-center gap-1.5">
                <AlertTriangle size={18} /> اعلام واخواست و برگشت چک
              </h3>
              <button onClick={() => setBounceModalCheque(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800 text-red-900 dark:text-red-300">
              <p>با اعلام برگشت چک، بدهی مشتری احیا شده و رتبه ریسک به C ارتقا می‌یابد.</p>
              <div>شماره چک: <strong>{bounceModalCheque.chequeNumber}</strong> | مبلغ: <strong>{Number(bounceModalCheque.amount).toLocaleString('fa-IR')} تومان</strong></div>
            </div>

            <div className="text-xs space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">دلیل برگشت چک (اعلام بانک):</label>
              <input
                type="text"
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
                placeholder="کسری موجودی / امضای ناخوانا / مسدودی حساب..."
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setBounceModalCheque(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleBounceSubmit}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                ثبت برگشت چک و احیای بدهی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال افزودن حساب بانکی */}
      {newBankModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateBank} className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">افزودن حساب بانکی جدید کارخانه</h3>
              <button type="button" onClick={() => setNewBankModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نام بانک *</label>
                <input
                  type="text"
                  value={newBankForm.bankName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                  placeholder="مثال: بانک صادرات"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره حساب *</label>
                <input
                  type="text"
                  value={newBankForm.accountNumber}
                  onChange={(e) => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })}
                  placeholder="۰۲۱۴۵۶۷۸۹۰۰۱"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نام شعبه</label>
                <input
                  type="text"
                  value={newBankForm.branchName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, branchName: e.target.value })}
                  placeholder="شعبه بازار آهن"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">کد شعبه</label>
                <input
                  type="text"
                  value={newBankForm.branchCode}
                  onChange={(e) => setNewBankForm({ ...newBankForm, branchCode: e.target.value })}
                  placeholder="۱۲۳۴"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره شبا (IBAN)</label>
                <input
                  type="text"
                  value={newBankForm.iban}
                  onChange={(e) => setNewBankForm({ ...newBankForm, iban: e.target.value })}
                  placeholder="IR..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">موجودی اولیه دفتری (تومان)</label>
                <input
                  type="number"
                  value={newBankForm.initialBalance}
                  onChange={(e) => setNewBankForm({ ...newBankForm, initialBalance: e.target.value })}
                  placeholder="0"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setNewBankModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                ثبت حساب بانکی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* مدال شارژ صندوق تنخواه از بانک */}
      {fundCashModalFund && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleFundSubmit} className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">شارژ تنخواه از حساب بانکی کارخانه</h3>
              <button type="button" onClick={() => setFundCashModalFund(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-slate-700 dark:text-slate-300">
              <div>صندوق مقصد: <strong>{fundCashModalFund.title}</strong></div>
              <div>سقف مجاز: <strong>{Number(fundCashModalFund.limitAmount).toLocaleString('fa-IR')} تومان</strong></div>
              <div>موجودی فعلی: <strong>{Number(fundCashModalFund.currentBalance).toLocaleString('fa-IR')} تومان</strong></div>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">حساب بانکی مبدا جهت برداشت:</label>
                <select
                  value={selectedBankForFund}
                  onChange={(e) => setSelectedBankForFund(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.branchName || 'مرکزی'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مبلغ شارژ تنخواه (تومان) *</label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="مثال: ۵۰۰۰۰۰۰"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFundCashModalFund(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                تایید و صدور سند شارژ تنخواه
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
