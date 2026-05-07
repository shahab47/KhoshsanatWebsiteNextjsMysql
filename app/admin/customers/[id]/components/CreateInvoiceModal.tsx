// app/admin/customers/[id]/_components/CreateInvoiceModal.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  submitting: boolean;
}

export function CreateInvoiceModal({ isOpen, onClose, onSubmit, submitting }: Props) {
  const [form, setForm] = useState({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return alert('مبلغ را وارد کنید');
    await onSubmit(form);
    setForm({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">ایجاد فاکتور جدید</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات فاکتور</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" placeholder="مثال: سفارش شماره 123" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ (تومان) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">تخفیف</label><input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">مالیات</label><input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">تاریخ سررسید</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800" /></div>
          <div className="pt-4 flex gap-2">
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">{submitting ? 'در حال ایجاد...' : 'ایجاد فاکتور'}</button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl hover:bg-gray-50">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}