// app/khoshmin/customers/[id]/_components/CustomerMessagesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, MailCheck, Edit, Save, X, Trash2 } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Message {
  id: number;
  subject: string;
  message: string;
  isRead: boolean;
  adminReply: string | null;
  createdAt: string;
}

export function CustomerMessagesTab({ customerId }: { customerId: string }) {
  const { showAlert, showConfirm } = useModal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReply, setEditReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/messages`);
      if (!res.ok) throw new Error('خطا در دریافت پیام‌ها');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('خطا در دریافت پیام‌ها', error);
      showAlert('خطا در دریافت پیام‌ها. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [customerId]);

  const updateAdminReply = async (messageId: number, newReply: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/messages?messageId=${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: newReply }),
      });
      if (res.ok) {
        await fetchMessages();
        setEditingId(null);
        showAlert('پاسخ با موفقیت ذخیره شد ✅', 'موفقیت', 'success');
      } else {
        const error = await res.json();
        showAlert(error.error || 'خطا در ذخیره پاسخ', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    showConfirm({
      title: 'حذف پیام',
      message: 'آیا از حذف این پیام اطمینان دارید؟ این عمل غیر قابل بازگشت است.',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/messages?messageId=${messageId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            await fetchMessages();
            showAlert('پیام با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            const error = await res.json();
            showAlert(error.error || 'خطا در حذف پیام', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      }
    });
  };

  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditReply(msg.adminReply || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditReply('');
  };

  const handleEditSave = async (id: number) => {
    if (!editReply.trim()) {
      showAlert('لطفاً متن پاسخ را وارد کنید', 'خطا', 'error');
      return;
    }
    await updateAdminReply(id, editReply.trim());
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">در حال بارگذاری پیام‌ها...</div>;
  }

  if (messages.length === 0) {
    return <p className="text-gray-500 text-center py-8">هیچ پیامی وجود ندارد</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`border rounded-xl p-4 transition ${!msg.isRead ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
        >
          {/* هدر پیام */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-bold text-gray-800">{msg.subject}</h4>
              <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString('fa-IR')}</p>
            </div>
            <div className="flex items-center gap-2">
              {!msg.isRead && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MailCheck size={12} /> جدید
                </span>
              )}
              {editingId !== msg.id && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="text-gray-500 hover:text-red-600 transition p-1"
                  title="حذف پیام"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* متن پیام مشتری */}
          <p className="text-gray-700 whitespace-pre-wrap border-r-2 border-blue-200 pr-3 mb-3">
            {msg.message}
          </p>

          {/* بخش پاسخ ادمین – با قابلیت ویرایش درجا */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-500 font-medium">پاسخ ادمین:</p>
              {editingId !== msg.id && (
                <button
                  onClick={() => handleEditStart(msg)}
                  className="text-gray-500 hover:text-blue-600 transition p-1"
                  title="ویرایش پاسخ"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>

            {editingId === msg.id ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                  placeholder="پاسخ خود را بنویسید..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleEditSave(msg.id)}
                    disabled={submitting}
                    className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save size={14} /> ذخیره
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
                  >
                    <X size={14} /> انصراف
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 bg-gray-50 p-2 rounded-lg mt-1 whitespace-pre-wrap">
                {msg.adminReply || <span className="text-gray-400 italic">پاسخی ثبت نشده است</span>}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}