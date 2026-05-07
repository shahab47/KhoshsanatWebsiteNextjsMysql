// app/admin/customers/[id]/_components/RecordPaymentModal.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  invoices: any[];
  submitting: boolean;
}

export function RecordPaymentModal({ isOpen, onClose, onSubmit, invoices, submitting }: Props) {
  const [form, setForm] = useState({ amount: 0, paymentMethod: 'CASH', receiptNo: '', description: '', invoiceId: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return alert('مبلغ را وارد کنید');
    await onSubmit(form);
    setForm({ amount: 0, paymentMethod: 'CASH', receiptNo: '', description: '', invoiceId: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">ثبت پرداخت جدید</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">مبلغ (تومان) *</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">روش پرداخت</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"><option value="CASH">نقدی</option><option value="CARD">کارت خوان</option><option value="TRANSFER">انتقال بانکی</option><option value="CHECK">چک</option><option value="OTHER">سایر</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">شماره رسید</label><input type="text" value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">فاکتور مرتبط (اختیاری)</label><select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"><option value="">انتخاب کنید...</option>{invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').map((inv) => (<option key={inv.id} value={inv.id}>فاکتور {inv.invoiceNo} - {inv.finalAmount.toLocaleString()} تومان</option>))}</select></div>
          <div className="pt-4 flex gap-2">
            <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 disabled:opacity-50">{submitting ? 'در حال ثبت...' : 'ثبت پرداخت'}</button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl hover:bg-gray-50">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}