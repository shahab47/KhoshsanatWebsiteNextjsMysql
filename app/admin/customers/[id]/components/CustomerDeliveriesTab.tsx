// app/admin/customers/[id]/_components/CustomerDeliveriesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Download, Trash2, Edit, Save, X } from 'lucide-react';

interface Delivery {
  id: number;
  deliveryNo: string;
  productName: string;
  quantity: number;
  unit: string | null;
  deliveryDate: string;
  status: string;
  description: string | null;
  signatureUrl: string | null;
}

export function CustomerDeliveriesTab({ customerId }: { customerId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Delivery>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/deliveries`);
      const data = await res.json();
      setDeliveries(data);
    } catch (error) {
      console.error('خطا در دریافت تحویل بار', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [customerId]);

  const updateDelivery = async (id: number, data: Partial<Delivery>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/deliveries?deliveryId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchDeliveries();
        setEditingId(null);
      } else {
        const error = await res.json();
        alert(error.error || 'خطا در ویرایش تحویل بار');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDelivery = async (id: number) => {
    if (!confirm('آیا از حذف این فرم تحویل بار اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/deliveries?deliveryId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDeliveries();
      } else {
        alert('خطا در حذف تحویل بار');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleEditStart = (del: Delivery) => {
    setEditingId(del.id);
    setEditForm({
      productName: del.productName,
      quantity: del.quantity,
      unit: del.unit || '',
      deliveryDate: del.deliveryDate.split('T')[0],
      status: del.status,
      description: del.description || '',
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSave = async (id: number) => {
    if (!editForm.productName?.trim()) {
      alert('نام محصول الزامی است');
      return;
    }
    if (!editForm.quantity || editForm.quantity <= 0) {
      alert('مقدار محصول معتبر نیست');
      return;
    }
    await updateDelivery(id, {
      productName: editForm.productName,
      quantity: editForm.quantity,
      unit: editForm.unit || null,
      deliveryDate: editForm.deliveryDate,
      status: editForm.status,
      description: editForm.description,
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'در انتظار';
      case 'PREPARING': return 'در حال آماده‌سازی';
      case 'DELIVERED': return 'تحویل داده شده';
      case 'RETURNED': return 'برگشت خورده';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'PREPARING': return 'text-blue-600 bg-blue-50';
      case 'DELIVERED': return 'text-green-600 bg-green-50';
      case 'RETURNED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/customers/${customerId}/deliveries/new`}
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
      >
        <Plus size={18} />
        ثبت تحویل بار جدید
      </Link>

      {deliveries.length === 0 ? (
        <p className="text-gray-500 text-center py-8">فرم تحویل باری ثبت نشده است</p>
      ) : (
        deliveries.map((del) => (
          <div key={del.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-bold text-gray-800">فرشمان {del.deliveryNo}</h4>
                  {editingId !== del.id ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(del.status)}`}>
                      {getStatusText(del.status)}
                    </span>
                  ) : null}
                </div>

                {editingId === del.id ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700">محصول</label>
                      <input
                        type="text"
                        value={editForm.productName || ''}
                        onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm text-gray-700">مقدار</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.quantity || ''}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">واحد</label>
                        <input
                          type="text"
                          value={editForm.unit || ''}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                          placeholder="مثال: کیلوگرم"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">تاریخ تحویل</label>
                      <input
                        type="date"
                        value={editForm.deliveryDate || ''}
                        onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })}
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
                        <option value="PENDING">در انتظار</option>
                        <option value="PREPARING">در حال آماده‌سازی</option>
                        <option value="DELIVERED">تحویل داده شده</option>
                        <option value="RETURNED">برگشت خورده</option>
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
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEditSave(del.id)} disabled={submitting} className="text-green-600 text-sm flex items-center gap-1">
                        <Save size={14} /> ذخیره
                      </button>
                      <button onClick={handleEditCancel} className="text-gray-500 text-sm flex items-center gap-1">
                        <X size={14} /> انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700">محصول: {del.productName}</p>
                    <p className="text-sm text-gray-700">مقدار: {del.quantity} {del.unit || ''}</p>
                    <p className="text-sm text-gray-700">تاریخ تحویل: {new Date(del.deliveryDate).toLocaleDateString('fa-IR')}</p>
                    {del.description && <p className="text-sm text-gray-600 mt-1">{del.description}</p>}
                  </>
                )}
              </div>

              {editingId !== del.id && (
                <div className="flex gap-2">
                  {del.signatureUrl && (
                    <button
                      onClick={() => window.open(del.signatureUrl || '', '_blank')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      title="مشاهده امضا"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditStart(del)}
                    className="p-2 text-gray-500 hover:text-blue-600 rounded-lg transition"
                    title="ویرایش"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => deleteDelivery(del.id)}
                    className="p-2 text-gray-500 hover:text-red-600 rounded-lg transition"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}