// app/khoshmin/payroll/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Calculator, FileText, Download, CheckCircle2,
  AlertCircle, Clock, Building2, Landmark, DollarSign, Search,
  RefreshCw, Check, X, Printer, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Employee {
  id: string;
  personnelCode: string;
  nationalCode: string;
  insuranceNo: string | null;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  phone: string | null;
  jobTitle: string;
  department: string;
  workshopCode: string;
  baseDailyWage: number | string;
  housingAllowance: number | string;
  foodSubsidy: number | string;
  childCount: number;
  childAllowance: number | string;
  bankName: string | null;
  bankAccount: string | null;
  bankIban: string | null;
  maritalStatus: string;
  isActive: boolean;
  createdAt: string;
  _count?: { payslips: number };
}

interface PayrollSlip {
  id: string;
  payrollRunId: string | null;
  employeeId: string;
  employee: Employee;
  year: number;
  month: number;
  workedDays: number;
  baseSalary: number | string;
  housingAllowance: number | string;
  foodSubsidy: number | string;
  childAllowance: number | string;
  overtimeHours: number | string;
  overtimeAmount: number | string;
  bonusAmount: number | string;
  otherAdditions: number | string;
  grossSalary: number | string;
  insuredEarnings: number | string;
  insuranceWorker: number | string;
  insuranceEmployer: number | string;
  taxExemptAmount: number | string;
  taxableAmount: number | string;
  incomeTax: number | string;
  otherDeductions: number | string;
  netSalary: number | string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  journalVoucherId: string | null;
}

interface PayrollRun {
  id: string;
  runNumber: string;
  year: number;
  month: number;
  title: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  totalEmployees: number;
  totalGross: number | string;
  totalWorkerIns: number | string;
  totalEmployerIns: number | string;
  totalTax: number | string;
  totalNet: number | string;
  journalVoucherId: string | null;
  paymentVoucherId: string | null;
  paidAt: string | null;
  slips?: PayrollSlip[];
  createdAt: string;
}

export default function PayrollPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'employees' | 'runs' | 'slips'>('runs');
  const [loading, setLoading] = useState(true);

  // داده‌ها
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // مدال‌ها
  const [newEmployeeModalOpen, setNewEmployeeModalOpen] = useState(false);
  const [newRunModalOpen, setNewRunModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  // فرم پرسنل جدید
  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    nationalCode: '',
    phone: '',
    jobTitle: '',
    department: 'PRODUCTION',
    workshopCode: '0123456789',
    baseDailyWage: '3000000', // ۳۰۰ هزار تومان
    housingAllowance: '9000000',
    foodSubsidy: '14000000',
    childCount: 0,
    bankName: 'بانک ملت',
    bankAccount: '',
    bankIban: '',
    insuranceNo: '',
  });

  // فرم دوره حقوق جدید
  const [runForm, setRunForm] = useState({
    year: 1405,
    month: 1,
    title: '',
  });

  // فرم واریز بانکی
  const [disburseForm, setDisburseForm] = useState({
    bankAccountId: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, runRes] = await Promise.all([
        fetch('/api/khoshmin/payroll/employees'),
        fetch('/api/khoshmin/payroll/runs'),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.items || []);
      }

      if (runRes.ok) {
        const runData = await runRes.json();
        setPayrollRuns(runData || []);
        if (runData.length > 0 && !selectedRun) {
          // دریافت جزییات اولین دوره
          loadRunDetails(runData[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error loading payroll data:', err);
      showAlert('خطا در بارگذاری اطلاعات پرسنل و حقوق', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRunDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/khoshmin/payroll/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRun(data);
      }
    } catch (err) {
      console.error('Error loading run details:', err);
    }
  };

  // ثبت پرسنل جدید
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.firstName || !employeeForm.lastName || !employeeForm.nationalCode) {
      showAlert('نام، نام خانوادگی و کد ملی الزامی هستند.', 'خطا', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/khoshmin/payroll/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت پرسنل');

      showAlert(`پرسنل ${data.firstName} ${data.lastName} با کد ${data.personnelCode} با موفقیت ثبت شد.`, 'موفق', 'success');
      setNewEmployeeModalOpen(false);
      fetchData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // محاسبه دوره حقوق جدید
  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/khoshmin/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ایجاد دوره حقوق');

      showAlert(`محاسبه حقوق ${data.title} برای ${data.totalEmployees} پرسنل با موفقیت انجام شد.`, 'موفق', 'success');
      setNewRunModalOpen(false);
      fetchData();
      loadRunDetails(data.id);
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // تایید دوره حقوق و صدور سند دوبل
  const handleApproveRun = (run: PayrollRun) => {
    showConfirm({
      title: 'تایید نهایی و صدور سند حسابداری حقوق',
      message: `آیا از تایید دوره ${run.title} و صدور خودکار سند حسابداری هزینه حقوق (۶۱۰۱۰۱)، بیمه تامین اجتماعی ۳۰٪ (۲۱۰۶۰۲) و مالیات ماده ۸۶ (۲۱۰۶۰۳) اطمینان دارید؟`,
      confirmText: 'تایید و صدور سند دوبل',
      cancelText: 'انصراف',
      type: 'info',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/payroll/runs/${run.id}/approve`, {
            method: 'POST',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'خطا در تایید حقوق');

          showAlert(`دوره حقوق با موفقیت تایید و سند حسابداری شماره ${data.voucher?.voucherNo || ''} صادر گردید.`, 'موفقیت', 'success');
          fetchData();
          loadRunDetails(run.id);
        } catch (err: any) {
          showAlert(err.message, 'خطا', 'error');
        }
      },
    });
  };

  // پرداخت بانکی (پایا) و تسویه حقوق
  const handleDisburseRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) return;

    try {
      const res = await fetch(`/api/khoshmin/payroll/runs/${selectedRun.id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disburseForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تسویه بانکی');

      showAlert(`تسویه بانکی با موفقیت ثبت شد و سند واریز شماره ${data.paymentVoucher?.voucherNo || ''} در دفتر کل صادر گردید.`, 'موفقیت', 'success');
      setDisburseModalOpen(false);
      fetchData();
      loadRunDetails(selectedRun.id);
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // فرمت ارقام به تومان یا ریال با جداکننده
  const formatNum = (val: number | string | null | undefined) => {
    if (!val) return '۰';
    return Number(val).toLocaleString('fa-IR');
  };

  // محاسبه خلاصه کل
  const activeEmpCount = employees.filter((e) => e.isActive).length;
  const latestRun = payrollRuns[0];
  const totalDisbursedAll = payrollRuns
    .filter((r) => r.status === 'PAID')
    .reduce((acc, r) => acc + Number(r.totalNet), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* هدر صفحه */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">مدیریت پرسنل و حقوق و دستمزد</h1>
              <p className="text-sm text-slate-400 mt-1">
                محاسبه حقوق قانون کار، بیمه تامین اجتماعی ۳۰٪، مالیات ماده ۸۶ و صدور دیسکت پرداخت گروهی پایا
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setNewRunModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/40 text-sm cursor-pointer"
          >
            <Calculator size={18} />
            محاسبه حقوق ماه جدید
          </button>
          <button
            onClick={() => setNewEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition border border-slate-700 text-sm cursor-pointer"
          >
            <UserPlus size={18} />
            استخدام پرسنل جدید
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
            title="به‌روزرسانی"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* کارتهای KPI خلاصه وضعیت */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>تعداد پرسنل فعال</span>
            <Users size={18} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{formatNum(activeEmpCount)}</span>
            <span className="text-xs text-slate-400">نفر شاغل در کارخانه</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>حقوق ناخالص آخرین دوره</span>
            <Calculator size={18} className="text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{formatNum(latestRun ? latestRun.totalGross : 0)}</span>
            <span className="text-xs text-slate-400">ریال</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>بیمه تامین اجتماعی ۳۰٪</span>
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {formatNum(
                latestRun ? Number(latestRun.totalWorkerIns) + Number(latestRun.totalEmployerIns) : 0
              )}
            </span>
            <span className="text-xs text-slate-400">ریال (۷٪+۲۳٪)</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>مجموع واریزهای پایا</span>
            <Landmark size={18} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{formatNum(totalDisbursedAll)}</span>
            <span className="text-xs text-slate-400">ریال</span>
          </div>
        </div>
      </div>

      {/* تب‌های اصلی */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('runs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
            activeTab === 'runs'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Calculator size={18} />
          دوره‌ها و محاسبات حقوق
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users size={18} />
          فهرست و پرونده پرسنل ({employees.length})
        </button>
      </div>

      {/* تب ۱: دوره‌های حقوق ماهانه */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* لیست دوره‌ها در ستون کناری */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
              <h2 className="text-base font-bold text-slate-200 flex items-center justify-between pb-2 border-b border-slate-800">
                <span>دوره‌های حقوق کارخانه</span>
                <span className="text-xs text-slate-400 font-normal">{payrollRuns.length} دوره ثبت شده</span>
              </h2>

              {payrollRuns.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  هنوز هیچ دوره حقوقی محاسبه نشده است.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {payrollRuns.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => loadRunDetails(run.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        selectedRun?.id === run.id
                          ? 'bg-slate-800 border-emerald-500/50 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-200">{run.title}</span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            run.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : run.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {run.status === 'PAID' ? 'تسویه شده' : run.status === 'APPROVED' ? 'تایید سند' : 'پیش‌نویس'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>شماره: {run.runNumber}</span>
                        <span>{run.totalEmployees} پرسنل</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>خالص پرداختنی:</span>
                        <span className="text-emerald-400">{formatNum(run.totalNet)} ریال</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* جزییات دوره انتخاب شده و فیش‌های آن */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRun ? (
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-6">
                  {/* سربرگ دوره */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">{selectedRun.title}</h2>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${
                            selectedRun.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : selectedRun.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          وضعیت: {selectedRun.status === 'PAID' ? 'پرداخت شده' : selectedRun.status === 'APPROVED' ? 'تاییدشده' : 'پیش‌نویس'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">شماره سریال: {selectedRun.runNumber}</p>
                    </div>

                    {/* دکمه‌های عملیاتی */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedRun.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApproveRun(selectedRun)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                        >
                          <CheckCircle2 size={16} />
                          تایید نهایی و صدور سند دوبل
                        </button>
                      )}

                      {selectedRun.status === 'APPROVED' && (
                        <button
                          onClick={() => setDisburseModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                        >
                          <Landmark size={16} />
                          ثبت پرداخت بانکی (پایا)
                        </button>
                      )}

                      {/* دانلود دیسکت پایا */}
                      <a
                        href={`/api/khoshmin/payroll/runs/${selectedRun.id}/paya-diskette`}
                        download
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700"
                        title="دانلود دیسکت پرداخت گروهی شبا (پایا)"
                      >
                        <Download size={14} />
                        فایل پایا (شبا)
                      </a>

                      {/* دانلود لیست بیمه */}
                      <a
                        href={`/api/khoshmin/payroll/runs/${selectedRun.id}/insurance-export`}
                        download
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700"
                        title="دانلود خروجی تامین اجتماعی"
                      >
                        <Download size={14} />
                        گزارش تامین اجتماعی
                      </a>
                    </div>
                  </div>

                  {/* ارقام سرجمع دوره */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 block">جمع ناخالص حقوق:</span>
                      <span className="text-sm font-bold text-slate-200 mt-1 block">
                        {formatNum(selectedRun.totalGross)} ریال
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">بیمه کارگر (۷٪):</span>
                      <span className="text-sm font-bold text-amber-400 mt-1 block">
                        {formatNum(selectedRun.totalWorkerIns)} ریال
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">مالیات ماده ۸۶:</span>
                      <span className="text-sm font-bold text-red-400 mt-1 block">
                        {formatNum(selectedRun.totalTax)} ریال
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">خالص پرداختی پرسنل:</span>
                      <span className="text-sm font-black text-emerald-400 mt-1 block">
                        {formatNum(selectedRun.totalNet)} ریال
                      </span>
                    </div>
                  </div>

                  {/* جدول فیش‌های پرسنل */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-3">فیش‌های حقوقی پرسنل در این دوره</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">کد</th>
                            <th className="p-3">نام و نام خانوادگی</th>
                            <th className="p-3">عنوان شغلی</th>
                            <th className="p-3 text-center">کارکرد</th>
                            <th className="p-3">ناخالص حقوق</th>
                            <th className="p-3">بیمه ۷٪</th>
                            <th className="p-3">مالیات</th>
                            <th className="p-3">خالص پرداختی</th>
                            <th className="p-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {selectedRun.slips?.map((slip) => (
                            <tr key={slip.id} className="hover:bg-slate-800/40 transition">
                              <td className="p-3 font-mono text-slate-400">{slip.employee?.personnelCode}</td>
                              <td className="p-3 font-bold text-slate-100">
                                {slip.employee?.firstName} {slip.employee?.lastName}
                              </td>
                              <td className="p-3 text-slate-400">{slip.employee?.jobTitle}</td>
                              <td className="p-3 text-center font-bold text-slate-200">{slip.workedDays} روز</td>
                              <td className="p-3 text-slate-300">{formatNum(slip.grossSalary)}</td>
                              <td className="p-3 text-amber-400">{formatNum(slip.insuranceWorker)}</td>
                              <td className="p-3 text-red-400">{formatNum(slip.incomeTax)}</td>
                              <td className="p-3 font-black text-emerald-400">{formatNum(slip.netSalary)}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedSlip(slip);
                                    setPayslipModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  مشاهده فیش
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center text-slate-500">
                  یک دوره حقوق را برای مشاهده جزییات انتخاب کنید.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* تب ۲: فهرست و پرونده پرسنل */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute right-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام، کد پرسنلی یا کد ملی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              مجموع پرسنل کارخانه: <span className="font-bold text-white">{employees.length} نفر</span>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">کد پرسنلی</th>
                    <th className="p-3.5">نام و نام خانوادگی</th>
                    <th className="p-3.5">کد ملی</th>
                    <th className="p-3.5">عنوان شغل</th>
                    <th className="p-3.5">بخش / واحد</th>
                    <th className="p-3.5">مزد روزانه پایه</th>
                    <th className="p-3.5">شماره شبا (IR)</th>
                    <th className="p-3.5 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {employees
                    .filter((e) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        e.firstName.toLowerCase().includes(q) ||
                        e.lastName.toLowerCase().includes(q) ||
                        e.personnelCode.toLowerCase().includes(q) ||
                        e.nationalCode.includes(q)
                      );
                    })
                    .map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-emerald-400">{emp.personnelCode}</td>
                        <td className="p-3.5 font-bold text-slate-100">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{emp.nationalCode}</td>
                        <td className="p-3.5 text-slate-300">{emp.jobTitle}</td>
                        <td className="p-3.5 text-slate-400">{emp.department}</td>
                        <td className="p-3.5 font-bold text-slate-200">{formatNum(emp.baseDailyWage)} ریال</td>
                        <td className="p-3.5 font-mono text-xs text-slate-400" dir="ltr">
                          {emp.bankIban || 'ثبت نشده'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              emp.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {emp.isActive ? 'شاغل' : 'غیرفعال'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* مدال استخدام پرسنل جدید */}
      {newEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-400" />
                ثبت و استخدام پرسنل جدید
              </h2>
              <button
                onClick={() => setNewEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">نام *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.firstName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.lastName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">کد ملی (۱۰ رقم) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={employeeForm.nationalCode}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, nationalCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">شماره تماس</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">عنوان شغلی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اپراتور CNC، جوشکار CO2، کارشناس کنترل کیفی"
                    value={employeeForm.jobTitle}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">واحد سازمانی</label>
                  <select
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                  >
                    <option value="PRODUCTION">خط تولید و مونتاژ سازه</option>
                    <option value="LOGISTICS">لجستیک، باسکول و انبار</option>
                    <option value="ENGINEERING">فنی و مهندسی</option>
                    <option value="SALES">بازرگانی و فروش</option>
                    <option value="FINANCE">مالی و اداری</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">مزد روزانه پایه (ریال) *</label>
                  <input
                    type="number"
                    required
                    value={employeeForm.baseDailyWage}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, baseDailyWage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">شماره بیمه تامین اجتماعی</label>
                  <input
                    type="text"
                    value={employeeForm.insuranceNo}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, insuranceNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">شماره شبا بانکی (جهت دیسکت پایا)</label>
                  <input
                    type="text"
                    placeholder="IR123456789012345678901234"
                    value={employeeForm.bankIban}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bankIban: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow cursor-pointer"
                >
                  ثبت پرسنل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ایجاد دوره حقوق جدید */}
      {newRunModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator size={20} className="text-emerald-400" />
                محاسبه خودکار حقوق ماه
              </h2>
              <button
                onClick={() => setNewRunModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">سال خورشیدی</label>
                <input
                  type="number"
                  required
                  value={runForm.year}
                  onChange={(e) => setRunForm({ ...runForm, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">ماه</label>
                <select
                  value={runForm.month}
                  onChange={(e) => setRunForm({ ...runForm, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                >
                  <option value={1}>فروردین (۳۱ روز)</option>
                  <option value={2}>اردیبهشت (۳۱ روز)</option>
                  <option value={3}>خرداد (۳۱ روز)</option>
                  <option value={4}>تیر (۳۱ روز)</option>
                  <option value={5}>مرداد (۳۱ روز)</option>
                  <option value={6}>شهریور (۳۱ روز)</option>
                  <option value={7}>مهر (۳۰ روز)</option>
                  <option value={8}>آبان (۳۰ روز)</option>
                  <option value={9}>آذر (۳۰ روز)</option>
                  <option value={10}>دی (۳۰ روز)</option>
                  <option value={11}>بهمن (۳۰ روز)</option>
                  <option value={12}>اسفند (۲۹ روز)</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                سیستم به صورت خودکار برای کلیه {activeEmpCount} پرسنل فعال، حقوق پایه، حق مسکن، بن خواربار، بیمه ۷٪ کارگر، بیمه ۲۳٪ کارفرما و مالیات ماده ۸۶ را محاسبه می‌نماید.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewRunModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow cursor-pointer"
                >
                  محاسبه و ایجاد دوره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال مشاهده و چاپ فیش حقوقی رسمی */}
      {payslipModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            {/* سربرگ فیش */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-xl font-black text-xl">
                  KS
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">شرکت مهندسی خوش‌صنعت پایدار</h3>
                  <p className="text-xs text-slate-500">فیش رسمی حقوق و دستمزد ماهانه</p>
                </div>
              </div>
              <div className="text-left text-xs space-y-1">
                <div className="font-bold text-slate-700">دوره: ماه {selectedSlip.month} سال {selectedSlip.year}</div>
                <div className="text-slate-500 font-mono">کد پرسنلی: {selectedSlip.employee?.personnelCode}</div>
              </div>
            </div>

            {/* مشخصات فردی پرسنل */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl text-xs border border-slate-200">
              <div>
                <span className="text-slate-500 block">نام و نام خانوادگی:</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {selectedSlip.employee?.firstName} {selectedSlip.employee?.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">کد ملی:</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {selectedSlip.employee?.nationalCode}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">عنوان شغلی:</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedSlip.employee?.jobTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block">روزهای کارکرد:</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedSlip.workedDays} روز</span>
              </div>
            </div>

            {/* جدول ریز اقلام حقوقی */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ستون مزایا و دریافتی‌ها */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 border-b border-slate-200">
                  اقلام پرداختی و مزایا (ریال)
                </div>
                <div className="divide-y divide-slate-100 p-2 space-y-1.5">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">مزد پایه کارکرد:</span>
                    <span className="font-bold">{formatNum(selectedSlip.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">حق مسکن:</span>
                    <span className="font-bold">{formatNum(selectedSlip.housingAllowance)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">بن خواربار:</span>
                    <span className="font-bold">{formatNum(selectedSlip.foodSubsidy)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">حق اولاد:</span>
                    <span className="font-bold">{formatNum(selectedSlip.childAllowance)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">اضافه‌کاری ({Number(selectedSlip.overtimeHours)} ساعت):</span>
                    <span className="font-bold">{formatNum(selectedSlip.overtimeAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">پاداش و کارانه:</span>
                    <span className="font-bold">{formatNum(selectedSlip.bonusAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-slate-900 border-t border-slate-200 bg-slate-50 px-1 rounded">
                    <span>جمع ناخالص حقوق:</span>
                    <span>{formatNum(selectedSlip.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* ستون کسورات */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 border-b border-slate-200">
                  کسورات قانونی (ریال)
                </div>
                <div className="divide-y divide-slate-100 p-2 space-y-1.5">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">بیمه تامین اجتماعی سهم کارگر (۷٪):</span>
                    <span className="font-bold text-red-600">{formatNum(selectedSlip.insuranceWorker)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">مالیات بر درآمد حقوق (ماده ۸۶):</span>
                    <span className="font-bold text-red-600">{formatNum(selectedSlip.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">سایر کسورات / مساعده:</span>
                    <span className="font-bold">{formatNum(selectedSlip.otherDeductions)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-red-700 border-t border-slate-200 bg-red-50 px-1 rounded">
                    <span>جمع کل کسورات:</span>
                    <span>
                      {formatNum(
                        Number(selectedSlip.insuranceWorker) +
                          Number(selectedSlip.incomeTax) +
                          Number(selectedSlip.otherDeductions)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* خالص دریافتی */}
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
              <span className="font-bold text-sm">مبلغ خالص پرداختی به پرسنل:</span>
              <span className="text-xl font-black">{formatNum(selectedSlip.netSalary)} ریال</span>
            </div>

            {/* فوتر مدال */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer size={16} />
                چاپ فیش حقوقی
              </button>
              <button
                type="button"
                onClick={() => setPayslipModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال تسویه بانکی و ثبت واریز پایا */}
      {disburseModalOpen && selectedRun && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark size={20} className="text-emerald-400" />
                ثبت پرداخت بانکی گروهی حقوق
              </h2>
              <button
                onClick={() => setDisburseModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDisburseRun} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>دوره:</span>
                  <span className="text-white font-bold">{selectedRun.title}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>مجموع مبلغ واریز:</span>
                  <span className="text-emerald-400 font-bold">{formatNum(selectedRun.totalNet)} ریال</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">شرح سند تسویه</label>
                <input
                  type="text"
                  placeholder="واریز گروهی حقوق پرسنل از طریق پایا"
                  value={disburseForm.description}
                  onChange={(e) => setDisburseForm({ ...disburseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                پس از ثبت، سند حسابداری تسویه حقوق (بدهکار ۲۱۰۳۰۱ و بستانکار ۱۱۰۱۰۱) در سیستم صادر شده و وضعیت دوره به «پرداخت شده» تغییر می‌یابد.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisburseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow cursor-pointer"
                >
                  ثبت پرداخت و صدور سند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
