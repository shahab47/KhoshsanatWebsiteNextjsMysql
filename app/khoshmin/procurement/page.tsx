// app/khoshmin/procurement/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, ShoppingCart, Scale, FileText, CheckCircle2,
  Clock, AlertTriangle, Plus, Search, Filter, RefreshCw,
  Building2, ArrowDownLeft, ShieldCheck, Check, X,
  BadgePercent, Layers, ExternalLink, Calendar, Hash,
  ChevronDown, Phone, CreditCard, ChevronRight
} from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Supplier {
  id: string;
  code: string;
  name: string;
  companyName: string | null;
  nationalId: string | null;
  phone: string | null;
  mobile: string | null;
  contactPerson: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIban: string | null;
  creditLimit: number;
  totalPayable: number;
  rating: string;
  isActive: boolean;
  _count?: {
    purchaseOrders: number;
    goodsReceipts: number;
    invoices: number;
  };
}

interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplier: { id: string; name: string };
  orderDate: string;
  expectedDate: string | null;
  status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  freightCost: number;
  totalAmount: number;
  items: Array<{
    id: string;
    productId: number;
    product: { id: number; title: string };
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    uom: string;
    steelGrade: string | null;
  }>;
}

interface GoodsReceipt {
  id: string;
  receiptNo: string;
  supplierId: string;
  supplier: { id: string; name: string };
  warehouse: { id: string; name: string; code: string };
  purchaseOrder: { id: string; orderNo: string } | null;
  receiptDate: string;
  scaleGrossKg: number | null;
  scaleTareKg: number | null;
  scaleNetKg: number;
  scaleTicketNo: string | null;
  truckPlate: string | null;
  driverName: string | null;
  waybillNo: string | null;
  heatNumber: string | null;
  items: Array<{
    id: string;
    receivedQty: number;
    unitCost: number;
    product: { id: number; title: string };
    steelGrade: string | null;
  }>;
}

interface SupplierInvoice {
  id: string;
  invoiceNo: string;
  systemNo: string;
  supplierId: string;
  supplier: { id: string; name: string };
  purchaseOrder: { id: string; orderNo: string } | null;
  invoiceDate: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  amount: number;
  taxAmount: number;
  freightCost: number;
  finalAmount: number;
  paidAmount: number;
  journalVoucherId: string | null;
}

interface SupplierPayment {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplier: { id: string; name: string };
  supplierInvoice: { id: string; invoiceNo: string; systemNo: string } | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string | null;
  journalVoucherId: string | null;
  bankAccount?: { bankName: string; accountNumber: string } | null;
  cheque?: { sayadId: string; chequeNumber: string; bankName: string } | null;
}

export default function ProcurementPage() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'receipts' | 'invoices' | 'payments'>('suppliers');
  const [loading, setLoading] = useState(true);

  // داده‌های جدول‌ها
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [portfolioCheques, setPortfolioCheques] = useState<any[]>([]);

  // فیلترها و جستجو
  const [searchQuery, setSearchQuery] = useState('');

  // مدال‌ها
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newReceiptModalOpen, setNewReceiptModalOpen] = useState(false);
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);
  const [newPaymentModalOpen, setNewPaymentModalOpen] = useState(false);

  // فرم تامین‌کننده جدید
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    companyName: '',
    nationalId: '',
    economicCode: '',
    phone: '',
    mobile: '',
    contactPerson: '',
    bankName: '',
    bankAccount: '',
    bankIban: '',
    creditLimit: '',
    rating: 'A',
  });

  // فرم سفارش خرید جدید
  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    expectedDate: '',
    freightCost: '',
    description: '',
    items: [
      { productId: 0, orderedQty: '', unitPrice: '', taxRate: '10', uom: 'KG', steelGrade: 'ST37' },
    ],
  });

  // فرم رسید انبار و باسکول جدید
  const [receiptForm, setReceiptForm] = useState({
    supplierId: '',
    purchaseOrderId: '',
    scaleGrossKg: '',
    scaleTareKg: '',
    scaleTicketNo: '',
    truckPlate: '',
    driverName: '',
    driverPhone: '',
    driverNationalId: '',
    waybillNo: '',
    heatNumber: '',
    items: [
      { productId: 0, receivedQty: '', unitCost: '', steelGrade: 'ST37' },
    ],
  });

  // فرم ثبت پرداخت جدید
  const [paymentForm, setPaymentForm] = useState({
    supplierId: '',
    supplierInvoiceId: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    bankAccountId: '',
    chequeId: '',
    receiptNo: '',
    description: '',
  });

  // بارگذاری داده‌ها
  const loadData = async () => {
    setLoading(true);
    try {
      const [supRes, poRes, grnRes, invRes, payRes, prodRes, bankRes, chqRes] = await Promise.all([
        fetch('/api/khoshmin/procurement/suppliers'),
        fetch('/api/khoshmin/procurement/purchase-orders'),
        fetch('/api/khoshmin/procurement/goods-receipts'),
        fetch('/api/khoshmin/procurement/supplier-invoices'),
        fetch('/api/khoshmin/procurement/supplier-payments'),
        fetch('/api/products'),
        fetch('/api/khoshmin/treasury/banks'),
        fetch('/api/khoshmin/treasury/cheques?status=IN_PORTFOLIO'),
      ]);

      const [supData, poData, grnData, invData, payData, prodData, bankData, chqData] = await Promise.all([
        supRes.ok ? supRes.json() : { items: [] },
        poRes.ok ? poRes.json() : { items: [] },
        grnRes.ok ? grnRes.json() : { items: [] },
        invRes.ok ? invRes.json() : { items: [] },
        payRes.ok ? payRes.json() : { items: [] },
        prodRes.ok ? prodRes.json() : [],
        bankRes.ok ? bankRes.json() : [],
        chqRes.ok ? chqRes.json() : [],
      ]);

      setSuppliers(supData.items || []);
      setOrders(poData.items || []);
      setReceipts(grnData.items || []);
      setInvoices(invData.items || []);
      setPayments(payData.items || []);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setBanks(Array.isArray(bankData) ? bankData : []);
      setPortfolioCheques(Array.isArray(chqData) ? chqData : []);
    } catch (err) {
      console.error('Error loading procurement data:', err);
      showAlert('خطا در بارگذاری اطلاعات تدارکات و خرید', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // محاسبات KPI بالایی
  const totalPayableDebt = suppliers.reduce((sum, s) => sum + Number(s.totalPayable || 0), 0);
  const activeOrdersCount = orders.filter((o) => o.status === 'APPROVED' || o.status === 'PARTIALLY_RECEIVED').length;
  const totalNetScaleTonnage = receipts.reduce((sum, r) => sum + (Number(r.scaleNetKg || 0) / 1000), 0);
  const pendingInvoicesAmount = invoices
    .filter((i) => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID')
    .reduce((sum, i) => sum + (Number(i.finalAmount || 0) - Number(i.paidAmount || 0)), 0);

  // ۱. ثبت تامین‌کننده جدید
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showAlert('نام تامین‌کننده الزامی است.', 'خطا', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/khoshmin/procurement/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supplierForm,
          creditLimit: supplierForm.creditLimit ? parseFloat(supplierForm.creditLimit) : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت تامین‌کننده');
      }

      showAlert('تامین‌کننده جدید با موفقیت ثبت شد.', 'موفقیت', 'success');
      setNewSupplierModalOpen(false);
      setSupplierForm({
        name: '', companyName: '', nationalId: '', economicCode: '',
        phone: '', mobile: '', contactPerson: '', bankName: '',
        bankAccount: '', bankIban: '', creditLimit: '', rating: 'A',
      });
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۲. ثبت سفارش خرید جدید
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.supplierId) {
      showAlert('انتخاب تامین‌کننده الزامی است.', 'خطا', 'warning');
      return;
    }
    if (orderForm.items.length === 0 || !orderForm.items[0].productId) {
      showAlert('حداقل یک قلم کالا باید انتخاب شود.', 'خطا', 'warning');
      return;
    }

    try {
      const payload = {
        supplierId: orderForm.supplierId,
        expectedDate: orderForm.expectedDate || null,
        freightCost: orderForm.freightCost ? parseFloat(orderForm.freightCost) : 0,
        description: orderForm.description,
        items: orderForm.items.map((it) => ({
          productId: Number(it.productId),
          orderedQty: parseFloat(it.orderedQty),
          unitPrice: parseFloat(it.unitPrice),
          taxRate: it.taxRate ? parseFloat(it.taxRate) : 10,
          uom: it.uom,
          steelGrade: it.steelGrade,
        })),
      };

      const res = await fetch('/api/khoshmin/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت سفارش خرید');
      }

      showAlert('سفارش خرید با موفقیت ایجاد شد.', 'موفقیت', 'success');
      setNewOrderModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۳. ثبت رسید انبار و باسکول
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptForm.supplierId) {
      showAlert('انتخاب تامین‌کننده الزامی است.', 'خطا', 'warning');
      return;
    }

    try {
      const gross = receiptForm.scaleGrossKg ? parseFloat(receiptForm.scaleGrossKg) : null;
      const tare = receiptForm.scaleTareKg ? parseFloat(receiptForm.scaleTareKg) : null;
      const net = (gross && tare) ? gross - tare : 0;

      const payload = {
        supplierId: receiptForm.supplierId,
        purchaseOrderId: receiptForm.purchaseOrderId || null,
        scaleGrossKg: gross,
        scaleTareKg: tare,
        scaleNetKg: net > 0 ? net : undefined,
        scaleTicketNo: receiptForm.scaleTicketNo,
        truckPlate: receiptForm.truckPlate,
        driverName: receiptForm.driverName,
        driverPhone: receiptForm.driverPhone,
        driverNationalId: receiptForm.driverNationalId,
        waybillNo: receiptForm.waybillNo,
        heatNumber: receiptForm.heatNumber,
        items: receiptForm.items.map((it) => ({
          productId: Number(it.productId),
          receivedQty: parseFloat(it.receivedQty || '0') || (net > 0 ? net : 0),
          unitCost: parseFloat(it.unitCost || '0'),
          steelGrade: it.steelGrade,
        })),
      };

      const res = await fetch('/api/khoshmin/procurement/goods-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت قبض رسید انبار');
      }

      showAlert('قبض ورود و توزین باسکول با موفقیت ثبت شد و به کاردکس منتقل گردید.', 'موفقیت', 'success');
      setNewReceiptModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // ۴. ثبت پرداخت به تامین‌کننده
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.supplierId) {
      showAlert('انتخاب تامین‌کننده الزامی است.', 'خطا', 'warning');
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showAlert('مبلغ پرداختی نامعتبر است.', 'خطا', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/khoshmin/procurement/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: paymentForm.supplierId,
          supplierInvoiceId: paymentForm.supplierInvoiceId || null,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          bankAccountId: paymentForm.bankAccountId || null,
          chequeId: paymentForm.chequeId || null,
          receiptNo: paymentForm.receiptNo,
          description: paymentForm.description,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت سند پرداخت');
      }

      showAlert('سند پرداخت با موفقیت ثبت و سند حسابداری دوبل آن صادر گردید.', 'موفقیت', 'success');
      setNewPaymentModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'خطا', 'error');
    }
  };

  // تایید سفارش خرید
  const handleApprovePO = (orderId: string, orderNo: string) => {
    showConfirm({
      title: 'تایید سفارش خرید مقاطع فلزی',
      message: `آیا از تایید نهایی سفارش خرید ${orderNo} و آغاز فرآیند بارگیری و تحویل اطمینان دارید؟`,
      type: 'info',
      confirmText: 'بله، تایید سفارش',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/procurement/purchase-orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'APPROVE' }),
          });
          if (!res.ok) throw new Error('خطا در تایید سفارش خرید');
          showAlert('سفارش خرید با موفقیت تایید شد.', 'موفقیت', 'success');
          loadData();
        } catch (err: any) {
          showAlert(err.message, 'خطا', 'error');
        }
      },
    });
  };

  return (
    <div dir="rtl" className="space-y-6 font-vazir pb-12">
      {/* هدر صفحه تدارکات */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-100">
                مدیریت تدارکات، زنجیره تامین و ورود مواد اولیه
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                توزین باسکول ورودی، انطباق سه‌طرفه (3-Way Matching)، کاردکس مواد اولیه و اسناد دوبل خرید
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setNewSupplierModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus size={16} className="text-amber-400" />
            تامین‌کننده جدید
          </button>
          <button
            onClick={() => setNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ShoppingCart size={16} className="text-blue-400" />
            سفارش خرید (PO)
          </button>
          <button
            onClick={() => setNewReceiptModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
          >
            <Scale size={16} />
            قبض باسکول و ورود بار
          </button>
          <button
            onClick={() => setNewPaymentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md"
          >
            <CreditCard size={16} />
            پرداخت به تامین‌کننده
          </button>
        </div>
      </div>

      {/* شاخص‌های کلیدی عملکرد (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* مانده بدهی به تامین‌کنندگان */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">بدهی دفتری به تامین‌کنندگان (AP)</span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-100">
              {totalPayableDebt.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            معین ۲۱۰۱۰۱ - حساب‌های پرداختنی
          </div>
        </div>

        {/* سفارشات خرید فعال */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">سفارشات در انتظار تحویل</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-blue-400">
              {activeOrdersCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">سفارش تایید شده</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            شامل اقلام مقاطع و ورق‌های در راه
          </div>
        </div>

        {/* مجموع تناژ باسکول ورودی */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ورود خالص باسکول کارخانه</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Scale size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-amber-400">
              {totalNetScaleTonnage.toFixed(2).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">تُن مقاطع فولادی</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            توزین دیجیتال منبع حقیقت انبار مواد اولیه
          </div>
        </div>

        {/* فاکتورهای منتظر پرداخت */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">فاکتورهای منتظر تسویه</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-emerald-400">
              {pendingInvoicesAmount.toLocaleString('fa-IR')}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">تومان</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            انطباق یافته با قبض انبار و بارنامه
          </div>
        </div>
      </div>

      {/* تب‌های مدیریت تدارکات */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'suppliers'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 size={16} />
          تامین‌کنندگان و مانده حساب
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {suppliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart size={16} />
          سفارشات خرید (PO)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'receipts'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale size={16} />
          قبوض رسید انبار و باسکول (GRN)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {receipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          فاکتورهای خرید و اعتبار مالیاتی
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard size={16} />
          پرداخت‌ها و ظهرنویسی چک
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {payments.length}
          </span>
        </button>
      </div>

      {/* ۱. تب تامین‌کنندگان */}
      {activeTab === 'suppliers' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام، شناسه ملی، یا شماره تلفن تامین‌کننده..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="تازه‌سازی"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">کد تامین‌کننده</th>
                  <th className="py-3.5 px-4">نام شرکت / تامین‌کننده</th>
                  <th className="py-3.5 px-4">شناسه / کد ملی</th>
                  <th className="py-3.5 px-4">تلفن / مسئول فروش</th>
                  <th className="py-3.5 px-4">حساب بانکی / شبا</th>
                  <th className="py-3.5 px-4">مانده بستانکاری دفتری (AP)</th>
                  <th className="py-3.5 px-4 text-center">رتبه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ تامین‌کننده‌ای یافت نشد.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{s.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{s.name}</div>
                        {s.companyName && <div className="text-[11px] text-slate-400">{s.companyName}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{s.nationalId || '-'}</td>
                      <td className="py-3.5 px-4">
                        <div>{s.phone || s.mobile || '-'}</div>
                        {s.contactPerson && <div className="text-[11px] text-slate-400">{s.contactPerson}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300">{s.bankName || '-'}</div>
                        {s.bankAccount && <div className="font-mono text-[11px] text-slate-400">{s.bankAccount}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${Number(s.totalPayable) > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {Number(s.totalPayable).toLocaleString('fa-IR')} تومان
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          گرید {s.rating}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ۲. تب سفارشات خرید (PO) */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">شماره سفارش</th>
                  <th className="py-3.5 px-4">تامین‌کننده</th>
                  <th className="py-3.5 px-4">اقلام سفارش</th>
                  <th className="py-3.5 px-4">مبلغ کل (با ارزش افزوده)</th>
                  <th className="py-3.5 px-4">تاریخ ثبت</th>
                  <th className="py-3.5 px-4 text-center">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ سفارش خریدی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{po.orderNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{po.supplier?.name}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {po.items?.map((it) => (
                            <span key={it.id} className="text-[11px] text-slate-300">
                              {it.product?.title}: {Number(it.orderedQty).toLocaleString('fa-IR')} {it.uom}
                              {Number(it.receivedQty) > 0 && (
                                <span className="text-emerald-400 mr-1">
                                  (تحویل: {Number(it.receivedQty).toLocaleString('fa-IR')})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        {Number(po.totalAmount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(po.orderDate).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            po.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : po.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {po.status === 'COMPLETED'
                            ? 'تکمیل شده'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'تحویل بخشی'
                            : po.status === 'APPROVED'
                            ? 'تایید شده'
                            : po.status === 'DRAFT'
                            ? 'پیش‌نویس'
                            : 'لغو شده'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {po.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApprovePO(po.id, po.orderNo)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            تایید نهایی
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ۳. تب قبوض رسید انبار و باسکول (GRN) */}
      {activeTab === 'receipts' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">قبض رسید انبار</th>
                  <th className="py-3.5 px-4">تامین‌کننده / سفارش</th>
                  <th className="py-3.5 px-4">توزین باسکول (ناخالص/تار/خالص)</th>
                  <th className="py-3.5 px-4">ناوگان / بارنامه</th>
                  <th className="py-3.5 px-4">شماره ذوب / بهر</th>
                  <th className="py-3.5 px-4">تاریخ ورود</th>
                  <th className="py-3.5 px-4 text-center">انبار مقصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ قبض رسیدی در سیستم ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  receipts.map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{grn.receiptNo}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{grn.supplier?.name}</div>
                        {grn.purchaseOrder && (
                          <div className="text-[11px] font-mono text-blue-400">
                            {grn.purchaseOrder.orderNo}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-400">
                          خالص: {Number(grn.scaleNetKg).toLocaleString('fa-IR')} کیلوگرم
                        </div>
                        {grn.scaleGrossKg && grn.scaleTareKg && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            پر: {Number(grn.scaleGrossKg).toLocaleString('fa-IR')} | خالی: {Number(grn.scaleTareKg).toLocaleString('fa-IR')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>پلاک: {grn.truckPlate || '-'}</div>
                        {grn.waybillNo && <div className="text-[11px] text-slate-400">بارنامه: {grn.waybillNo}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{grn.heatNumber || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(grn.receiptDate).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {grn.warehouse?.code || 'WH-RAW-01'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ۴. تب فاکتورهای خرید (Supplier Invoices) */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">شماره فاکتور اعلامی</th>
                  <th className="py-3.5 px-4">شناسه سیستمی</th>
                  <th className="py-3.5 px-4">تامین‌کننده</th>
                  <th className="py-3.5 px-4">مبلغ کالا</th>
                  <th className="py-3.5 px-4">اعتبار ارزش افزوده ۱۰٪</th>
                  <th className="py-3.5 px-4">مبلغ نهایی</th>
                  <th className="py-3.5 px-4">پرداخت شده</th>
                  <th className="py-3.5 px-4 text-center">وضعیت تسویه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      هیچ فاکتور خریدی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-100">{inv.invoiceNo}</td>
                      <td className="py-3.5 px-4 font-mono text-blue-400">{inv.systemNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{inv.supplier?.name}</td>
                      <td className="py-3.5 px-4">{Number(inv.amount).toLocaleString('fa-IR')} تومان</td>
                      <td className="py-3.5 px-4 text-emerald-400">
                        {Number(inv.taxAmount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        {Number(inv.finalAmount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {Number(inv.paidAmount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {inv.status === 'PAID'
                            ? 'تسویه شده'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'تسویه ناقص'
                            : 'در انتظار پرداخت'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ۵. تب پرداخت‌ها و ظهرنویسی چک */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">شماره سند پرداخت</th>
                  <th className="py-3.5 px-4">تامین‌کننده</th>
                  <th className="py-3.5 px-4">مبلغ پرداختی</th>
                  <th className="py-3.5 px-4">روش پرداخت</th>
                  <th className="py-3.5 px-4">حساب / مشخصات چک صیادی</th>
                  <th className="py-3.5 px-4">تاریخ پرداخت</th>
                  <th className="py-3.5 px-4 text-center">سند دوبل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ سابقه پرداختی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{p.paymentNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{p.supplier?.name}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        {Number(p.amount).toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                          {p.paymentMethod === 'BANK_TRANSFER'
                            ? 'حواله بانکی پایا/ساتنا'
                            : p.paymentMethod === 'CHEQUE_ENDORSED'
                            ? 'ظهرنویسی چک صیادی'
                            : p.paymentMethod === 'CHEQUE_ISSUED'
                            ? 'چک صادره کارخانه'
                            : 'نقدی'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.bankAccount && (
                          <div className="text-[11px] text-slate-300">
                            {p.bankAccount.bankName} - {p.bankAccount.accountNumber}
                          </div>
                        )}
                        {p.cheque && (
                          <div className="text-[11px] text-amber-400 font-mono">
                            صیاد: {p.cheque.sayadId} ({p.cheque.bankName})
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                          <Check size={12} /> صادر شده
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مدال تعریف تامین‌کننده جدید */}
      {newSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 size={18} className="text-amber-400" />
                تعریف تامین‌کننده جدید مواد اولیه و مقاطع فولادی
              </h2>
              <button
                onClick={() => setNewSupplierModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">نام تجاری یا شخص *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="مثال: فولاد مبارکه اصفهان / بازرگانی شادآباد"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نام رسمی حقوقی شرکت</label>
                  <input
                    type="text"
                    value={supplierForm.companyName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                    placeholder="شرکت سهامی عام..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">شناسه ملی یا کد ملی</label>
                  <input
                    type="text"
                    value={supplierForm.nationalId}
                    onChange={(e) => setSupplierForm({ ...supplierForm, nationalId: e.target.value })}
                    placeholder="۱۰ یا ۱۱ رقم"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">کد اقتصادی ۱۲ رقمی مودیان</label>
                  <input
                    type="text"
                    value={supplierForm.economicCode}
                    onChange={(e) => setSupplierForm({ ...supplierForm, economicCode: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تلفن دفتر فروش</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="۰۲۱..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">مسئول فروش یا کارشناس</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">بانک عامل تامین‌کننده</label>
                  <input
                    type="text"
                    value={supplierForm.bankName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, bankName: e.target.value })}
                    placeholder="مثال: بانک ملت / صادرات"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">شماره شبا (IBAN)</label>
                  <input
                    type="text"
                    value={supplierForm.bankIban}
                    onChange={(e) => setSupplierForm({ ...supplierForm, bankIban: e.target.value })}
                    placeholder="IR..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewSupplierModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
                >
                  ثبت تامین‌کننده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ثبت سفارش خرید جدید */}
      {newOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-400" />
                ثبت سفارش خرید مقاطع فلزی (Industrial PO)
              </h2>
              <button
                onClick={() => setNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">انتخاب تامین‌کننده *</label>
                  <select
                    required
                    value={orderForm.supplierId}
                    onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">کرایه حمل برآوردی (تومان)</label>
                  <input
                    type="number"
                    value={orderForm.freightCost}
                    onChange={(e) => setOrderForm({ ...orderForm, freightCost: e.target.value })}
                    placeholder="۰"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* ردیف‌های اقلام کالا */}
              <div className="space-y-3">
                <label className="block text-slate-300 font-bold text-xs">اقلام مقاطع فلزی سفارشی:</label>
                {orderForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-500 text-[10px] mb-1">کالا / مقطع فولادی</label>
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => {
                          const updated = [...orderForm.items];
                          updated[idx].productId = Number(e.target.value);
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
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
                      <label className="block text-slate-500 text-[10px] mb-1">وزن / تعداد سفارش (کیلوگرم)</label>
                      <input
                        type="number"
                        required
                        value={it.orderedQty}
                        onChange={(e) => {
                          const updated = [...orderForm.items];
                          updated[idx].orderedQty = e.target.value;
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        placeholder="وزن کیلوگرم"
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">نرخ واحد هر کیلو (تومان)</label>
                      <input
                        type="number"
                        required
                        value={it.unitPrice}
                        onChange={(e) => {
                          const updated = [...orderForm.items];
                          updated[idx].unitPrice = e.target.value;
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        placeholder="قیمت هر کیلو"
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  ثبت نهایی سفارش خرید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال قبض ورود و توزین باسکول (Scale GRN) */}
      {newReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Scale size={18} className="text-amber-400" />
                ثبت قبض ورود بار و توزین باسکول دیجیتال کارخانه
              </h2>
              <button
                onClick={() => setNewReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">تامین‌کننده بار *</label>
                  <select
                    required
                    value={receiptForm.supplierId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, supplierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- انتخاب تامین‌کننده --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">سفارش خرید مرتبط (PO)</label>
                  <select
                    value={receiptForm.purchaseOrderId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, purchaseOrderId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- بدون ارتباط مستقیم --</option>
                    {orders
                      .filter((o) => !receiptForm.supplierId || o.supplierId === receiptForm.supplierId)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNo} ({Number(o.totalAmount).toLocaleString('fa-IR')} ت)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">شماره قبض باسکول</label>
                  <input
                    type="text"
                    value={receiptForm.scaleTicketNo}
                    onChange={(e) => setReceiptForm({ ...receiptForm, scaleTicketNo: e.target.value })}
                    placeholder="مثال: TK-9842"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* بلوک محاسباتی باسکول */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-amber-300 font-bold mb-1">وزن ناخالص (پر) باسکول (Kg)</label>
                  <input
                    type="number"
                    value={receiptForm.scaleGrossKg}
                    onChange={(e) => setReceiptForm({ ...receiptForm, scaleGrossKg: e.target.value })}
                    placeholder="مثال: ۲۴۵۰۰"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1">وزن تار (خالی) کامیون (Kg)</label>
                  <input
                    type="number"
                    value={receiptForm.scaleTareKg}
                    onChange={(e) => setReceiptForm({ ...receiptForm, scaleTareKg: e.target.value })}
                    placeholder="مثال: ۸۲۰۰"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 font-bold mb-1">وزن خالص ورودی به انبار</label>
                  <div className="p-2 bg-slate-950 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono font-black text-sm text-center">
                    {receiptForm.scaleGrossKg && receiptForm.scaleTareKg
                      ? (
                          parseFloat(receiptForm.scaleGrossKg) - parseFloat(receiptForm.scaleTareKg)
                        ).toLocaleString('fa-IR') + ' کیلوگرم'
                      : '۰ کیلوگرم'}
                  </div>
                </div>
              </div>

              {/* مشخصات ناوگان و راننده */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">پلاک کامیون</label>
                  <input
                    type="text"
                    value={receiptForm.truckPlate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, truckPlate: e.target.value })}
                    placeholder="مثال: ایران ۷۷ - ۱۲۳ ج ۴۵"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">نام راننده</label>
                  <input
                    type="text"
                    value={receiptForm.driverName}
                    onChange={(e) => setReceiptForm({ ...receiptForm, driverName: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">شماره بارنامه جاده‌ای</label>
                  <input
                    type="text"
                    value={receiptForm.waybillNo}
                    onChange={(e) => setReceiptForm({ ...receiptForm, waybillNo: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              {/* اقلام تحویلی به انبار */}
              <div className="space-y-3">
                <label className="block text-slate-300 font-bold text-xs">کالای ورودی به انبار مواد اولیه (WH-RAW-01):</label>
                {receiptForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">کالا / مقطع فولادی</label>
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => {
                          const updated = [...receiptForm.items];
                          updated[idx].productId = Number(e.target.value);
                          setReceiptForm({ ...receiptForm, items: updated });
                        }}
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
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
                      <label className="block text-slate-500 text-[10px] mb-1">نرخ بهای واحد خرید (تومان/کیلو)</label>
                      <input
                        type="number"
                        required
                        value={it.unitCost}
                        onChange={(e) => {
                          const updated = [...receiptForm.items];
                          updated[idx].unitCost = e.target.value;
                          setReceiptForm({ ...receiptForm, items: updated });
                        }}
                        placeholder="برای کاردکس میانگین موزون"
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[10px] mb-1">گرید فولاد / شماره ذوب</label>
                      <input
                        type="text"
                        value={it.steelGrade || ''}
                        onChange={(e) => {
                          const updated = [...receiptForm.items];
                          updated[idx].steelGrade = e.target.value;
                          setReceiptForm({ ...receiptForm, items: updated });
                        }}
                        placeholder="مثال: ST37 / ذوب ۴۸۱"
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewReceiptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
                >
                  ثبت قبض انبار و انتقال به کاردکس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ثبت پرداخت به تامین‌کننده */}
      {newPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" />
                ثبت پرداخت وجه یا خرج چک صیادی به تامین‌کننده
              </h2>
              <button
                onClick={() => setNewPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">تامین‌کننده دریافت‌کننده وجه *</label>
                <select
                  required
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب تامین‌کننده --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (مانده بدهی: {Number(s.totalPayable).toLocaleString('fa-IR')} ت)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">تسویه فاکتور خرید مشخص (اختیاری)</label>
                <select
                  value={paymentForm.supplierInvoiceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierInvoiceId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- پرداخت کلی روی حساب (Ali-al-Hesab) --</option>
                  {invoices
                    .filter((inv) => !paymentForm.supplierId || inv.supplierId === paymentForm.supplierId)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        فاکتور {inv.invoiceNo} (مبلغ: {Number(inv.finalAmount).toLocaleString('fa-IR')} ت)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">روش پرداخت *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BANK_TRANSFER">حواله بانکی پایا / ساتنا</option>
                    <option value="CHEQUE_ENDORSED">ظهرنویسی و خرج چک صیادی مشتری</option>
                    <option value="CHEQUE_ISSUED">چک صادره کارخانه</option>
                    <option value="CASH">صندوق نقدی کارخانه</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">مبلغ پرداختی (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="مبلغ به تومان"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* فیلد اختصاصی حساب بانکی در صورت حواله */}
              {paymentForm.paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">حساب بانکی مبدا کارخانه *</label>
                  <select
                    required
                    value={paymentForm.bankAccountId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- انتخاب حساب بانکی --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* فیلد اختصاصی چک در صورت ظهرنویسی */}
              {paymentForm.paymentMethod === 'CHEQUE_ENDORSED' && (
                <div>
                  <label className="block text-amber-400 mb-1 font-bold">انتخاب چک صیادی موجود در صندوق *</label>
                  <select
                    required
                    value={paymentForm.chequeId}
                    onChange={(e) => {
                      const selected = portfolioCheques.find((c) => c.id === e.target.value);
                      setPaymentForm({
                        ...paymentForm,
                        chequeId: e.target.value,
                        amount: selected ? selected.amount.toString() : paymentForm.amount,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- انتخاب چک صیادی --</option>
                    {portfolioCheques.map((c) => (
                      <option key={c.id} value={c.id}>
                        شناسه {c.sayadId} | {c.bankName} | مبلغ: {Number(c.amount).toLocaleString('fa-IR')} ت | سررسید: {new Date(c.dueDate).toLocaleDateString('fa-IR')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">شماره پیگیری / عطف تراکنش</label>
                <input
                  type="text"
                  value={paymentForm.receiptNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNo: e.target.value })}
                  placeholder="مثال: حواله پایا شماره ۷۴۸۲۹"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  ثبت سند پرداخت و صدور سند دوبل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
