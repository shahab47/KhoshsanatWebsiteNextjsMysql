// app/admin/customers/[id]/_components/CustomerPaymentsTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string | null;
  description: string | null;
  invoice?: { id: number; invoiceNo: string } | null;
  invoiceId?: string | number | null; // این خط برای رفع خطای تایپ‌اسکریپت اضافه شد
}

export function CustomerPaymentsTab({ customerId }: { customerId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Payment>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    receiptNo: '',
    description: '',
    invoiceId: ''
  });
  const [creating, setCreating] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/payments`);
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      console.error('خطا در دریافت پرداختی‌ها', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invoices`);
      const data = await res.json();
      setAvailableInvoices(data.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'));
    } catch (error) {
      console.error('خطا در دریافت فاکتورها', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
  }, [customerId]);

  const createPayment = async () => {
    if (newPayment.amount <= 0) {
      alert('مبلغ پرداخت باید بزرگتر از صفر باشد');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewPayment({ amount: 0, paymentMethod: 'CASH', receiptNo: '', description: '', invoiceId: '' });
        await fetchPayments();
        await fetchInvoices();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ثبت پرداخت');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setCreating(false);
    }
  };

  const updatePayment = async (id: number, data: Partial<Payment>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/payments?paymentId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchPayments();
        await fetchInvoices();
        setEditingId(null);
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ویرایش پرداخت');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const deletePayment = async (id: number) => {
    if (!confirm('آیا از حذف این پرداخت اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/payments?paymentId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchPayments();
        await fetchInvoices();
      } else {
        alert('خطا در حذف پرداخت');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleEditStart = (payment: Payment) => {
    setEditingId(payment.id);
    setEditForm({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      receiptNo: payment.receiptNo || '',
      description: payment.description || '',
      invoiceId: payment.invoice?.id ? String(payment.invoice.id) : '',
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSave = async (id: number) => {
    if (editForm.amount === undefined || editForm.amount <= 0) {
      alert('مبلغ باید بزرگتر از صفر باشد');
      return;
    }
    await updatePayment(id, {
      amount: editForm.amount,
      paymentMethod: editForm.paymentMethod,
      receiptNo: editForm.receiptNo,
      description: editForm.description,
      // تبدیل ایمن مقدار رشته به عدد با بررسی شرط
      invoiceId: editForm.invoiceId ? parseInt(String(editForm.invoiceId)) : null,
    });
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH': return 'نقدی';
      case 'CHECK': return 'چک';
      case 'CARD': return 'کارت خوان';
      case 'TRANSFER': return 'انتقال بانکی';
      default: return method;
    }
  };

  if (loading) return <div className="text-center py-8 text-black">در حال بارگذاری پرداختی‌ها...</div>;

  return (
    <div className="space-y-4">
      {/* دکمه ثبت پرداخت جدید */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <Plus size={18} />
          ثبت پرداخت جدید
        </button>
      </div>

      {/* مودال ثبت پرداخت جدید */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">ثبت پرداخت جدید</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ (تومان) *</label>
                <input
                  type="number"
                  value={newPayment.amount || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">روش پرداخت</label>
                <select
                  value={newPayment.paymentMethod}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                >
                  <option value="CASH">نقدی</option>
                  <option value="CARD">کارت خوان</option>
                  <option value="TRANSFER">انتقال بانکی</option>
                  <option value="CHECK">چک</option>
                  <option value="OTHER">سایر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره رسید (اختیاری)</label>
                <input
                  type="text"
                  value={newPayment.receiptNo}
                  onChange={(e) => setNewPayment({ ...newPayment, receiptNo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
                <textarea
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">فاکتور مرتبط (اختیاری)</label>
                <select
                  value={newPayment.invoiceId}
                  onChange={(e) => setNewPayment({ ...newPayment, invoiceId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                >
                  <option value="">انتخاب کنید...</option>
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      فاکتور {inv.invoiceNo} - {inv.finalAmount.toLocaleString()} تومان
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-2">
                <button
                  onClick={createPayment}
                  disabled={creating}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {creating ? 'در حال ثبت...' : 'ثبت پرداخت'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl hover:bg-gray-50"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* لیست پرداخت‌ها */}
      {payments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">پرداختی ثبت نشده است</p>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {editingId !== p.id && (
                  <div>
                    <p className="text-sm text-gray-500">{new Date(p.paymentDate).toLocaleDateString('fa-IR')}</p>
                    <p className="text-sm text-gray-700">روش پرداخت: {getPaymentMethodText(p.paymentMethod)}</p>
                    {p.receiptNo && <p className="text-sm text-gray-600">شماره رسید: {p.receiptNo}</p>}
                    {p.invoice && <p className="text-xs text-gray-400">مرتبط با فاکتور {p.invoice.invoiceNo}</p>}
                    {p.description && <p className="mt-2 text-sm text-gray-600 border-t pt-2">{p.description}</p>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {editingId !== p.id && (
                  <button onClick={() => handleEditStart(p)} className="text-gray-500 hover:text-blue-600" title="ویرایش">
                    <Edit size={18} />
                  </button>
                )}
                <button onClick={() => deletePayment(p.id)} className="text-gray-500 hover:text-red-600" title="حذف">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {editingId === p.id && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700">مبلغ (تومان)</label>
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">روش پرداخت</label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    >
                      <option value="CASH">نقدی</option>
                      <option value="CARD">کارت خوان</option>
                      <option value="TRANSFER">انتقال بانکی</option>
                      <option value="CHECK">چک</option>
                      <option value="OTHER">سایر</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">شماره رسید</label>
                    <input
                      type="text"
                      value={editForm.receiptNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, receiptNo: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">فاکتور مرتبط</label>
                    <select
                      value={editForm.invoiceId || ''}
                      onChange={(e) => setEditForm({ ...editForm, invoiceId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    >
                      <option value="">انتخاب کنید...</option>
                      {availableInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          فاکتور {inv.invoiceNo} - {inv.finalAmount.toLocaleString()} تومان
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">توضیحات</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleEditSave(p.id)} disabled={submitting} className="text-green-600 text-sm flex items-center gap-1">
                    <Save size={14} /> ذخیره
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-500 text-sm flex items-center gap-1">
                    <X size={14} /> انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}