// app/khoshmin/production/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Factory, Cog, Hammer, Plus, Search, RefreshCw,
  Building2, CheckCircle2, Clock, AlertTriangle, Layers,
  Scissors, PackageCheck, ShieldCheck, ChevronRight,
  TrendingUp, ArrowDownLeft, X, Check, Calculator, FileText
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface BOMItem {
  id: string;
  rawMaterialId: number;
  rawMaterial: { id: number; title: string };
  quantity: number;
  wastePercent: number;
}

interface BOM {
  id: string;
  code: string;
  title: string;
  productId: number;
  product: { id: number; title: string };
  version: number;
  laborHours: number;
  overheadRate: number;
  isActive: boolean;
  items: BOMItem[];
  _count?: { productionOrders: number };
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  customerId: number;
  customer: { id: number; name: string };
  bomId: string;
  bom: {
    id: string;
    code: string;
    title: string;
    product: { id: number; title: string };
  };
  targetQuantity: number;
  actualQuantity: number;
  status: 'PLANNED' | 'IN_PRODUCTION' | 'QUALITY_CONTROL' | 'COMPLETED' | 'CANCELLED';
  priority: string;
  targetDate: string | null;
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  finalCostPerUnit: number;
  startDate: string | null;
  completionDate: string | null;
  issueVoucherId: string | null;
  completionVoucherId: string | null;
  createdAt: string;
}

export default function ProductionPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'orders' | 'boms' | 'wip' | 'scrap'>('orders');
  const [loading, setLoading] = useState(true);

  // داده‌ها
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // استعلام بهای استاندارد برای مدال BOM
  const [selectedBomCost, setSelectedBomCost] = useState<any>(null);
  const [costModalOpen, setCostModalOpen] = useState(false);

  // مدال‌ها
  const [newBomModalOpen, setNewBomModalOpen] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);

  // سفارش کار انتخاب شده برای عملیات
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);

  // فرم فرمول ساخت جدید (BOM)
  const [bomForm, setBomForm] = useState({
    title: '',
    productId: 0,
    laborHours: '',
    overheadRate: '',
    description: '',
    items: [{ rawMaterialId: 0, quantity: '', wastePercent: '3.5' }],
  });

  // فرم دستور کار جدید (Work Order)
  const [orderForm, setOrderForm] = useState({
    customerId: 0,
    bomId: '',
    targetQuantity: '',
    priority: 'NORMAL',
    targetDate: '',
    description: '',
  });

  // فرم حواله مصرف متریال
  const [issueForm, setIssueForm] = useState({
    items: [{ rawMaterialId: 0, quantity: '' }],
  });

  // فرم تکمیل سفارش و رسید محصول نهایی
  const [completeForm, setCompleteForm] = useState({
    completedQuantity: '',
    directLaborCost: '',
    allocatedOverheadCost: '',
  });

  // فرم قراضه و ضایعات
  const [scrapForm, setScrapForm] = useState({
    scrapProductId: 0,
    scrapQuantity: '',
    scrapUnitRecoveryPrice: '18000', // نرخ هر کیلو آهن قراضه
  });

  // بارگذاری داده‌ها
  const loadData = async () => {
    setLoading(true);
    try {
      const [woRes, bomRes, custRes, prodRes] = await Promise.all([
        fetch('/api/khoshmin/production/work-orders'),
        fetch('/api/khoshmin/production/boms'),
        fetch('/api/khoshmin/customers'),
        fetch('/api/products'),
      ]);

      const [woData, bomData, custData, prodData] = await Promise.all([
        woRes.ok ? woRes.json() : { items: [] },
        bomRes.ok ? bomRes.json() : { items: [] },
        custRes.ok ? custRes.json() : [],
        prodRes.ok ? prodRes.json() : [],
      ]);

      setWorkOrders(woData.items || []);
      setBoms(bomData.items || []);
      setCustomers(Array.isArray(custData) ? custData : (custData.customers || []));
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error('Error loading production data:', err);
      showAlert('خطا در بارگذاری اطلاعات مهندسی تولید', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // محاسبات شاخص‌های کلیدی
  const totalWipMaterialCost = workOrders
    .filter((o) => o.status === 'IN_PRODUCTION' || o.status === 'PLANNED')
    .reduce((sum, o) => sum + Number(o.actualMaterialCost || 0) + Number(o.actualLaborCost || 0) + Number(o.actualOverheadCost || 0), 0);

  const activeOrdersCount = workOrders.filter((o) => o.status === 'IN_PRODUCTION').length;
  const completedOrdersCount = workOrders.filter((o) => o.status === 'COMPLETED').length;
  const totalCompletedUnits = workOrders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.actualQuantity || 0), 0);

  // ۱. ثبت فرمول ساخت جدید
  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomForm.productId || !bomForm.title.trim()) {
      showAlert('عنوان فرمول و محصول نهایی الزامی هستند.', 'خطا', 'warning');
      return;
    }

    try {
      const payload = {
        title: bomForm.title.trim(),
        productId: Number(bomForm.productId),
        laborHours: bomForm.laborHours ? parseFloat(bomForm.laborHours) : 0,
        overheadRate: bomForm.overheadRate ? parseFloat(bomForm.overheadRate) : 0,
        description: bomForm.description,
        items: bomForm.items.map((it) => ({
          rawMaterialId: Number(it.rawMaterialId),
          quantity: parseFloat(it.quantity),
          wastePercent: it.wastePercent ? parseFloat(it.wastePercent) : 0,
        })),
      };

      const res = await fetch('/api/khoshmin/production/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت فرمول ساخت');
      }

      showAlert('فرمول ساخت مهندسی (BOM) با موفقیت ثبت شد.', 'موفقیت', 'success');
      setNewBomModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۲. استعلام بهای تمام‌شده استاندارد
  const handleViewStandardCost = async (bomId: string) => {
    try {
      const res = await fetch(`/api/khoshmin/production/boms/${bomId}`);
      if (!res.ok) throw new Error('خطا در دریافت بهای استاندارد');
      const data = await res.json();
      setSelectedBomCost(data.standardCost);
      setCostModalOpen(true);
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۳. صدور دستور کار جدید
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerId || !orderForm.bomId) {
      showAlert('انتخاب مشتری و فرمول ساخت الزامی است.', 'خطا', 'warning');
      return;
    }

    try {
      const payload = {
        customerId: Number(orderForm.customerId),
        bomId: orderForm.bomId,
        targetQuantity: parseFloat(orderForm.targetQuantity),
        priority: orderForm.priority,
        targetDate: orderForm.targetDate || null,
        description: orderForm.description,
      };

      const res = await fetch('/api/khoshmin/production/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در صدور دستور کار');
      }

      showAlert('دستور کار ساخت کارگاهی با موفقیت صادر گردید.', 'موفقیت', 'success');
      setNewOrderModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۴. صدور حواله مصرف متریال به خط تولید
  const handleIssueMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      const payload = {
        items: issueForm.items.map((it) => ({
          rawMaterialId: Number(it.rawMaterialId),
          quantity: parseFloat(it.quantity),
        })),
      };

      const res = await fetch(`/api/khoshmin/production/work-orders/${activeOrder.id}/issue-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در صدور حواله مصرف');
      }

      showAlert('حواله مصرف متریال صادر شد، از انبار کسر و سند دوبل Dr ۱۱۰۵۰۲ / Cr ۱۱۰۵۰۱ ثبت گردید.', 'موفقیت', 'success');
      setIssueModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۵. ثبت قراضه و بازیافت ضایعات برشکاری
  const handleRecordScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      const payload = {
        scrapProductId: Number(scrapForm.scrapProductId),
        scrapQuantity: parseFloat(scrapForm.scrapQuantity),
        scrapUnitRecoveryPrice: parseFloat(scrapForm.scrapUnitRecoveryPrice),
      };

      const res = await fetch(`/api/khoshmin/production/work-orders/${activeOrder.id}/scrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت ضایعات');
      }

      showAlert('ضایعات به انبار قراضه انتقال یافت، ارزش آن از بهای متریال کسر و سند دوبل صادر شد.', 'موفقیت', 'success');
      setScrapModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۶. تکمیل سفارش کار و رسید به انبار محصول نهایی
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      const payload = {
        completedQuantity: parseFloat(completeForm.completedQuantity),
        directLaborCost: completeForm.directLaborCost ? parseFloat(completeForm.directLaborCost) : 0,
        allocatedOverheadCost: completeForm.allocatedOverheadCost ? parseFloat(completeForm.allocatedOverheadCost) : 0,
      };

      const res = await fetch(`/api/khoshmin/production/work-orders/${activeOrder.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در تکمیل سفارش کار');
      }

      showAlert('سفارش کار تکمیل شد، بهای تمام‌شده (COGM) محاسبه، محصول وارد انبار و سند دوبل قطعی صادر گردید.', 'موفقیت', 'success');
      setCompleteModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  return (
    <div dir="rtl" className="space-y-6 font-vazir pb-12">
      {/* هدر صفحه مهندسی تولید */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-6 rounded-3xl shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-2xl">
              <Factory size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100">
                مهندسی تولید، فرمول ساخت (BOM) و سفارشات کارگاهی
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                رهگیری کالای در جریان ساخت (WIP)، حواله مصرف متریال، تسهیم دستمزد و سربار و بهای تمام‌شده ساخت (COGM)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNewBomModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Cog size={16} className="text-cyan-600 dark:text-cyan-400" />
            فرمول ساخت جدید (BOM)
          </button>
          <button
            onClick={() => setNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-md"
          >
            <Plus size={16} />
            صدور دستور کار (WO)
          </button>
        </div>
      </div>

      {/* شاخص‌های کلیدی عملکرد تولید (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ارزش کالای در جریان ساخت */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مانده کالای در جریان ساخت (WIP)</span>
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {totalWipMaterialCost.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
            معین ۱۱۰۵۰۲ - متریال و سربار پای خط
          </div>
        </div>

        {/* دستور کارهای در حال ساخت */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">دستور کارهای فعال پای خط</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Hammer size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {activeOrdersCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">سفارش در جریان</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            برشکاری، مونتاژ، سوراخکاری و جوشکاری
          </div>
        </div>

        {/* تیراژ محصول نهایی تکمیل شده */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قطعات تکمیل شده (ماه جاری)</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <PackageCheck size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalCompletedUnits.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">واحد / قطعه</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            انتقال یافته به انبار محصول نهایی (WH-FG-01)
          </div>
        </div>

        {/* سفارشات نهایی شده */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">دستور کارهای خاتمه‌یافته</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {completedOrdersCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">سفارش خاتمه‌یافته</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            با صدور سند قطعی بهای تمام‌شده (COGM)
          </div>
        </div>
      </div>

      {/* تب‌های مدیریت مهندسی تولید */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Hammer size={16} />
          دستور کارهای ساخت (Work Orders)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {workOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('boms')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'boms'
              ? 'border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Cog size={16} />
          فرمول‌های ساخت و درخت محصول (BOM)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {boms.length}
          </span>
        </button>
      </div>

      {/* ۱. تب دستور کارهای ساخت */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو با شماره دستور کار، نام مشتری یا نام قطعه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
              title="تازه‌سازی"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">شماره دستور کار</th>
                  <th className="py-3.5 px-4">مشتری</th>
                  <th className="py-3.5 px-4">محصول / فرمول ساخت</th>
                  <th className="py-3.5 px-4">تیراژ هدف / تکمیل</th>
                  <th className="py-3.5 px-4">هزینه متریال جاری (WIP)</th>
                  <th className="py-3.5 px-4 text-center">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">عملیات کارگاهی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      هیچ دستور کاری در سیستم ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">{wo.orderNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{wo.customer?.name}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{wo.bom?.product?.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{wo.bom?.title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {Number(wo.actualQuantity).toLocaleString('fa-IR')} / {Number(wo.targetQuantity).toLocaleString('fa-IR')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {Number(wo.actualMaterialCost).toLocaleString('fa-IR')} ت
                        </span>
                        {Number(wo.finalCostPerUnit) > 0 && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            واحد: {Number(wo.finalCostPerUnit).toLocaleString('fa-IR')} ت
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            wo.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : wo.status === 'IN_PRODUCTION'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {wo.status === 'COMPLETED'
                            ? 'خاتمه‌یافته'
                            : wo.status === 'IN_PRODUCTION'
                            ? 'در خط ساخت'
                            : 'برنامه‌ریزی شده'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {wo.status !== 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveOrder(wo);
                                  setIssueModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-cyan-600 dark:text-cyan-400 rounded-lg text-[11px] font-bold transition border border-slate-200 dark:border-slate-600"
                                title="حواله مصرف متریال به پای کار"
                              >
                                حواله متریال
                              </button>
                              <button
                                onClick={() => {
                                  setActiveOrder(wo);
                                  setScrapModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-bold transition border border-slate-200 dark:border-slate-600"
                                title="ثبت ضایعات و قراضه برشکاری"
                              >
                                ضایعات
                              </button>
                              <button
                                onClick={() => {
                                  setActiveOrder(wo);
                                  setCompleteForm({
                                    completedQuantity: wo.targetQuantity.toString(),
                                    directLaborCost: '',
                                    allocatedOverheadCost: '',
                                  });
                                  setCompleteModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                                title="تکمیل و رسید انبار محصول نهایی"
                              >
                                تکمیل و رسید
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ۲. تب فرمول‌های ساخت (BOM) */}
      {activeTab === 'boms' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">کد BOM</th>
                  <th className="py-3.5 px-4">عنوان فرمول ساخت</th>
                  <th className="py-3.5 px-4">محصول خروجی</th>
                  <th className="py-3.5 px-4">اقلام مواد اولیه مصرفی</th>
                  <th className="py-3.5 px-4">ساعت کار استاندارد</th>
                  <th className="py-3.5 px-4 text-center">ماشین حساب بهای استاندارد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                {boms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      هیچ فرمول ساختی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  boms.map((bom) => (
                    <tr key={bom.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">{bom.code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{bom.title}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">{bom.product?.title}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {bom.items?.map((it) => (
                            <span key={it.id} className="text-[11px] text-slate-600 dark:text-slate-300">
                              {it.rawMaterial?.title}: {Number(it.quantity).toLocaleString('fa-IR')} واحد (پرت: {Number(it.wastePercent)}٪)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {Number(bom.laborHours).toLocaleString('fa-IR')} ساعت
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleViewStandardCost(bom.id)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/20 rounded-lg text-xs font-bold transition mx-auto"
                        >
                          <Calculator size={14} />
                          برآورد بهای استاندارد
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مدال تعریف فرمول ساخت جدید (BOM) */}
      {newBomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-3xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cog size={18} className="text-cyan-600 dark:text-cyan-400" />
                تعریف فرمول ساخت مهندسی و درخت محصول (BOM)
              </h2>
              <button
                onClick={() => setNewBomModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBOM} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">عنوان فرمول ساخت *</label>
                  <input
                    type="text"
                    required
                    value={bomForm.title}
                    onChange={(e) => setBomForm({ ...bomForm, title: e.target.value })}
                    placeholder="مثال: ساخت ستون باکس تیرورق پروژه پتروشیمی"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">محصول ساخته‌شده خروجی *</label>
                  <select
                    required
                    value={bomForm.productId}
                    onChange={(e) => setBomForm({ ...bomForm, productId: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={0}>-- انتخاب محصول نهایی --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">ساعات کار استاندارد مستقیم</label>
                  <input
                    type="number"
                    value={bomForm.laborHours}
                    onChange={(e) => setBomForm({ ...bomForm, laborHours: e.target.value })}
                    placeholder="ساعت به ازای یک واحد"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">نرخ سربار ساخت (تومان/ساعت)</label>
                  <input
                    type="number"
                    value={bomForm.overheadRate}
                    onChange={(e) => setBomForm({ ...bomForm, overheadRate: e.target.value })}
                    placeholder="مثال: ۵۰۰۰۰"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* اقلام مواد اولیه مصرفی */}
              <div className="space-y-3 pt-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">مواد اولیه مصرفی در هر واحد محصول:</label>
                {bomForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[10px] mb-1">ماده اولیه (ورق/پروفیل/پیچ)</label>
                      <select
                        required
                        value={it.rawMaterialId}
                        onChange={(e) => {
                          const updated = [...bomForm.items];
                          updated[idx].rawMaterialId = Number(e.target.value);
                          setBomForm({ ...bomForm, items: updated });
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        <option value={0}>-- انتخاب ماده اولیه --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[10px] mb-1">مقدار مصرف خالص (کیلو/عدد)</label>
                      <input
                        type="number"
                        required
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...bomForm.items];
                          updated[idx].quantity = e.target.value;
                          setBomForm({ ...bomForm, items: updated });
                        }}
                        placeholder="مقدار"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-[10px] mb-1">درصد پرت و افت برشکاری (٪)</label>
                      <input
                        type="number"
                        value={it.wastePercent}
                        onChange={(e) => {
                          const updated = [...bomForm.items];
                          updated[idx].wastePercent = e.target.value;
                          setBomForm({ ...bomForm, items: updated });
                        }}
                        placeholder="مثال: ۳.۵"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setNewBomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  ثبت فرمول ساخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال استعلام بهای تمام‌شده استاندارد BOM */}
      {costModalOpen && selectedBomCost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator size={18} className="text-cyan-600 dark:text-cyan-400" />
                برآورد بهای تمام‌شده استاندارد فرمول ساخت ({selectedBomCost.bomCode})
              </h2>
              <button
                onClick={() => setCostModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 dark:text-slate-200">
                  محصول: {selectedBomCost.productTitle} ({selectedBomCost.bomTitle})
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  مبنای محاسبات: آخرین نرخ میانگین موزون متحرک اقلام در انبار مواد اولیه (WH-RAW-01)
                </div>
              </div>

              {/* ریز اقلام مواد */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-right text-slate-700 dark:text-slate-300 text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2">ماده اولیه</th>
                      <th className="p-2">مصرف ناخالص</th>
                      <th className="p-2">نرخ میانگین انبار</th>
                      <th className="p-2">بهای کل استاندارد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {selectedBomCost.items?.map((it: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2">{it.rawMaterialTitle}</td>
                        <td className="p-2 font-mono">{Number(it.grossQuantity).toFixed(2)}</td>
                        <td className="p-2 font-mono">{Number(it.currentAverageUnitCost).toLocaleString('fa-IR')} ت</td>
                        <td className="p-2 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{Number(it.totalStandardCost).toLocaleString('fa-IR')} ت</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* جمع کل بهای استاندارد */}
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl flex items-center justify-between font-bold text-sm">
                <span className="text-cyan-800 dark:text-cyan-300">بهای تمام‌شده کل برآوردی هر واحد:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono text-base font-black">
                  {Number(selectedBomCost.totalStandardCost).toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCostModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال صدور دستور کار جدید (Work Order) */}
      {newOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus size={18} className="text-cyan-600 dark:text-cyan-400" />
                صدور دستور کار ساخت کارگاهی (Work Order)
              </h2>
              <button
                onClick={() => setNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">مشتری سفارش‌دهنده *</label>
                <select
                  required
                  value={orderForm.customerId}
                  onChange={(e) => setOrderForm({ ...orderForm, customerId: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>-- انتخاب مشتری --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company || 'شخصی'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">فرمول ساخت محصول (BOM) *</label>
                <select
                  required
                  value={orderForm.bomId}
                  onChange={(e) => setOrderForm({ ...orderForm, bomId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- انتخاب فرمول ساخت --</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.title} ({b.product?.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">تیراژ هدف ساخت *</label>
                  <input
                    type="number"
                    required
                    value={orderForm.targetQuantity}
                    onChange={(e) => setOrderForm({ ...orderForm, targetQuantity: e.target.value })}
                    placeholder="تعداد یا وزن به تن"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">اولویت ساخت</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  >
                    <option value="NORMAL">عادی</option>
                    <option value="HIGH">فوری</option>
                    <option value="URGENT">بحرانی / ویژه</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setNewOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  صدور دستور کار (WO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال حواله مصرف مواد اولیه به خط تولید */}
      {issueModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Hammer size={18} className="text-cyan-600 dark:text-cyan-400" />
                حواله مصرف متریال به پای کار ({activeOrder.orderNumber})
              </h2>
              <button
                onClick={() => setIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueMaterials} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-[11px]">
                ثبت خروج از انبار مواد اولیه (WH-RAW-01) به انبار در جریان ساخت (WH-WIP-01) و صدور اتوماتیک سند حسابداری دوبل.
              </div>

              {issueForm.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] mb-1">ماده اولیه مصرفی</label>
                    <select
                      required
                      value={it.rawMaterialId}
                      onChange={(e) => {
                        const updated = [...issueForm.items];
                        updated[idx].rawMaterialId = Number(e.target.value);
                        setIssueForm({ ...issueForm, items: updated });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value={0}>-- انتخاب کالا --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] mb-1">مقدار مصرفی (کیلو/عدد)</label>
                    <input
                      type="number"
                      required
                      value={it.quantity}
                      onChange={(e) => {
                        const updated = [...issueForm.items];
                        updated[idx].quantity = e.target.value;
                        setIssueForm({ ...issueForm, items: updated });
                      }}
                      placeholder="مقدار مصرفی"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  صدور حواله و سند دوبل WIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ثبت ضایعات و قراضه برشکاری */}
      {scrapModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scissors size={18} className="text-amber-600 dark:text-amber-400" />
                ثبت قراضه و ضایعات برشکاری ({activeOrder.orderNumber})
              </h2>
              <button
                onClick={() => setScrapModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordScrap} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">کالای ضایعاتی / قراضه *</label>
                <select
                  required
                  value={scrapForm.scrapProductId}
                  onChange={(e) => setScrapForm({ ...scrapForm, scrapProductId: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  <option value={0}>-- انتخاب کالای ضایعاتی --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">وزن قراضه (کیلوگرم) *</label>
                  <input
                    type="number"
                    required
                    value={scrapForm.scrapQuantity}
                    onChange={(e) => setScrapForm({ ...scrapForm, scrapQuantity: e.target.value })}
                    placeholder="وزن قراضه"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">نرخ بازیافت قراضه (تومان/کیلو) *</label>
                  <input
                    type="number"
                    required
                    value={scrapForm.scrapUnitRecoveryPrice}
                    onChange={(e) => setScrapForm({ ...scrapForm, scrapUnitRecoveryPrice: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setScrapModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  انتقال به انبار ضایعات و کسر از بهای WIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال تکمیل سفارش و رسید انبار محصول نهایی */}
      {completeModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PackageCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                تکمیل قطعی و رسید به انبار محصولات ({activeOrder.orderNumber})
              </h2>
              <button
                onClick={() => setCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px]">
                محصول ساخته‌شده: {activeOrder.bom?.product?.title} | بهای متریال فعلی: {Number(activeOrder.actualMaterialCost).toLocaleString('fa-IR')} ت
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">تعداد / وزن نهایی تکمیل شده *</label>
                <input
                  type="number"
                  required
                  value={completeForm.completedQuantity}
                  onChange={(e) => setCompleteForm({ ...completeForm, completedQuantity: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">دستمزد مستقیم تسهیم شده (تومان)</label>
                  <input
                    type="number"
                    value={completeForm.directLaborCost}
                    onChange={(e) => setCompleteForm({ ...completeForm, directLaborCost: e.target.value })}
                    placeholder="۰"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">سربار ساخت تسهیم شده (تومان)</label>
                  <input
                    type="number"
                    value={completeForm.allocatedOverheadCost}
                    onChange={(e) => setCompleteForm({ ...completeForm, allocatedOverheadCost: e.target.value })}
                    placeholder="۰"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  محاسبه COGM و رسید به انبار محصول نهایی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
