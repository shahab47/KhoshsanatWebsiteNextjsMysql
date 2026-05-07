// app/admin/customers/[id]/_components/CustomerInvoicesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileText, Edit, Trash2, Save, X, Printer, Plus } from 'lucide-react';

interface Invoice {
  id: number;
  invoiceNo: string;
  amount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paidAmount: number;
  status: string;
  issueDate: string;
  dueDate: string | null;
  description: string | null;
}

export function CustomerInvoicesTab({ customerId }: { customerId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    description: '',
    amount: 0,
    discount: 0,
    tax: 0,
    dueDate: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invoices`);
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('خطا در دریافت فاکتورها', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [customerId]);

  const createInvoice = async () => {
    if (newInvoice.amount <= 0) {
      alert('مبلغ فاکتور باید بزرگتر از صفر باشد');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewInvoice({ description: '', amount: 0, discount: 0, tax: 0, dueDate: '' });
        await fetchInvoices();
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ایجاد فاکتور');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setCreating(false);
    }
  };

  const updateInvoice = async (id: number, data: Partial<Invoice>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invoices?invoiceId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchInvoices();
        setEditingId(null);
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ویرایش فاکتور');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteInvoice = async (id: number) => {
    if (!confirm('آیا از حذف این فاکتور اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/invoices?invoiceId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchInvoices();
      } else {
        alert('خطا در حذف فاکتور');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleEditStart = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setEditForm({
      amount: invoice.amount,
      discount: invoice.discount,
      tax: invoice.tax,
      dueDate: invoice.dueDate || '',
      status: invoice.status,
      description: invoice.description || '',
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSave = async (id: number) => {
    if (editForm.amount === undefined || editForm.amount <= 0) {
      alert('مبلغ فاکتور باید بزرگتر از صفر باشد');
      return;
    }
    await updateInvoice(id, {
      amount: editForm.amount,
      discount: editForm.discount || 0,
      tax: editForm.tax || 0,
      dueDate: editForm.dueDate || null,
      status: editForm.status,
      description: editForm.description,
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'در انتظار پرداخت';
      case 'PARTIAL': return 'پرداخت بخشی';
      case 'PAID': return 'پرداخت کامل';
      case 'OVERDUE': return 'سررسید گذشته';
      case 'CANCELLED': return 'لغو شده';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'PARTIAL': return 'text-blue-600 bg-blue-50';
      case 'PAID': return 'text-green-600 bg-green-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const printInvoice = (inv: Invoice) => {
    alert(`چاپ فاکتور ${inv.invoiceNo} (به زودی)`);
  };

  if (loading) return <div className="text-center py-8 text-gray-700">در حال بارگذاری فاکتورها...</div>;

  return (
    <div className="space-y-4">
      {/* دکمه ایجاد فاکتور جدید */}
      <div className="flex justify-end">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            فاکتور جدید
          </button>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 w-full border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-3">ایجاد فاکتور جدید</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="توضیحات (اختیاری)"
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400"
              />
              <input
                type="number"
                placeholder="مبلغ (تومان) *"
                value={newInvoice.amount || ''}
                onChange={(e) => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="تخفیف"
                  value={newInvoice.discount || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, discount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400"
                />
                <input
                  type="number"
                  placeholder="مالیات"
                  value={newInvoice.tax || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400"
                />
              </div>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={createInvoice} disabled={creating} className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                  {creating ? 'در حال ایجاد...' : 'ایجاد'}
                </button>
                <button onClick={() => setShowCreateForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100">
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* لیست فاکتورها */}
      {invoices.length === 0 ? (
        <p className="text-gray-500 text-center py-8">فاکتوری وجود ندارد</p>
      ) : (
        invoices.map((inv) => (
          <div key={inv.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-bold text-gray-800">فاکتور {inv.invoiceNo}</h4>
                  {editingId !== inv.id && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(inv.status)}`}>
                      {getStatusText(inv.status)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">تاریخ صدور: {new Date(inv.issueDate).toLocaleDateString('fa-IR')}</p>
              </div>
              <div className="flex gap-2">
                {editingId !== inv.id && (
                  <>
                    <button onClick={() => handleEditStart(inv)} className="text-gray-500 hover:text-blue-600" title="ویرایش">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => printInvoice(inv)} className="text-gray-500 hover:text-gray-700" title="چاپ">
                      <Printer size={18} />
                    </button>
                  </>
                )}
                <button onClick={() => deleteInvoice(inv.id)} className="text-gray-500 hover:text-red-600" title="حذف">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {editingId === inv.id ? (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700">مبلغ کل</label>
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">تخفیف</label>
                    <input
                      type="number"
                      value={editForm.discount}
                      onChange={(e) => setEditForm({ ...editForm, discount: parseFloat(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">مالیات</label>
                    <input
                      type="number"
                      value={editForm.tax}
                      onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">تاریخ سررسید</label>
                    <input
                      type="date"
                      value={editForm.dueDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">وضعیت</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                    >
                      <option value="PENDING">در انتظار پرداخت</option>
                      <option value="PARTIAL">پرداخت بخشی</option>
                      <option value="PAID">پرداخت کامل</option>
                      <option value="OVERDUE">سررسید گذشته</option>
                      <option value="CANCELLED">لغو شده</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
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
                  <button onClick={() => handleEditSave(inv.id)} disabled={submitting} className="text-green-600 text-sm flex items-center gap-1">
                    <Save size={14} /> ذخیره
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-500 text-sm flex items-center gap-1">
                    <X size={14} /> انصراف
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-700">
                <p><span className="font-medium">مبلغ نهایی:</span> {inv.finalAmount.toLocaleString()} تومان</p>
                <p><span className="font-medium">پرداخت شده:</span> {inv.paidAmount.toLocaleString()} تومان</p>
                <p><span className="font-medium">مانده:</span> {(inv.finalAmount - inv.paidAmount).toLocaleString()} تومان</p>
                {inv.dueDate && <p><span className="font-medium">سررسید:</span> {new Date(inv.dueDate).toLocaleDateString('fa-IR')}</p>}
                {inv.description && <p><span className="font-medium">توضیحات:</span> {inv.description}</p>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}