// app/khoshmin/customers/[id]/components/CustomerNotesTab.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { StickyNote, Plus, Save, X, Edit, Trash2 } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

interface Note {
  id: number;
  note: string;
  createdAt: string;
}

export function CustomerNotesTab({ customerId }: { customerId: string }) {
  const { showAlert, showConfirm } = useModal();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  
  // نگهداری محتوای اولیه برای تشخیص تغییر در ویرایش
  const originalEditTextRef = useRef('');

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/notes`);
      if (!res.ok) throw new Error('خطا در دریافت یادداشت‌ها');
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error('خطا در دریافت یادداشت‌ها', error);
      showAlert('خطا در دریافت یادداشت‌ها. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [customerId]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setNewNote('');
        setShowForm(false);
        await fetchNotes();
        showAlert('یادداشت با موفقیت اضافه شد ✅', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در افزودن یادداشت', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateNote = async (id: number, updatedNote: string) => {
    try {
      const res = await fetch(`/api/khoshmin/customers/${customerId}/notes?noteId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updatedNote }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchNotes();
        showAlert('یادداشت با موفقیت ویرایش شد', 'موفقیت', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'خطا در ویرایش یادداشت', 'خطا', 'error');
      }
    } catch {
      showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
    }
  };

  const deleteNote = async (id: number) => {
    showConfirm({
      title: 'حذف یادداشت',
      message: 'آیا از حذف این یادداشت اطمینان دارید؟ این عمل غیر قابل بازگشت است.',
      type: 'warning',
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/khoshmin/customers/${customerId}/notes?noteId=${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            await fetchNotes();
            showAlert('یادداشت با موفقیت حذف شد', 'موفقیت', 'success');
          } else {
            const err = await res.json();
            showAlert(err.error || 'خطا در حذف یادداشت', 'خطا', 'error');
          }
        } catch {
          showAlert('خطا در ارتباط با سرور', 'خطا', 'error');
        }
      }
    });
  };

  const handleEditStart = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.note);
    originalEditTextRef.current = note.note;
  };

  const handleEditCancel = () => {
    // اگر تغییری در متن ایجاد شده باشد، از کاربر بپرس
    if (editText.trim() !== originalEditTextRef.current.trim()) {
      showConfirm({
        title: 'انصراف از ویرایش',
        message: 'تغییرات شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: () => {
          setEditingId(null);
          setEditText('');
        },
        onCancel: () => {}
      });
    } else {
      setEditingId(null);
      setEditText('');
    }
  };

  const handleEditSave = async (id: number) => {
    if (!editText.trim()) {
      showAlert('لطفاً متن یادداشت را وارد کنید', 'خطا', 'error');
      return;
    }
    await updateNote(id, editText.trim());
  };

  const handleCancelAddNote = () => {
    if (newNote.trim()) {
      showConfirm({
        title: 'انصراف از افزودن یادداشت',
        message: 'متن یادداشت شما ذخیره نشده است. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟',
        type: 'warning',
        confirmText: 'بله، خارج شوم',
        cancelText: 'خیر، بمانم',
        onConfirm: () => {
          setNewNote('');
          setShowForm(false);
        },
        onCancel: () => {}
      });
    } else {
      setShowForm(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">در حال بارگذاری یادداشت‌ها...</div>;

  return (
    <div className="space-y-4">
      {/* فرم افزودن یادداشت جدید */}
      <div className="bg-gray-50 rounded-xl p-4">
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors">
            <Plus size={18} /> افزودن یادداشت جدید
          </button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="یادداشت خود را وارد کنید..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={addNote} disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition hover:bg-blue-700 disabled:opacity-50">
                <Save size={16} /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button onClick={handleCancelAddNote} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                انصراف
              </button>
            </div>
          </div>
        )}
      </div>

      {/* لیست یادداشت‌ها */}
      {notes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">هیچ یادداشتی وجود ندارد</p>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <StickyNote size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">ادمین</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString('fa-IR')}</span>
                {editingId !== note.id && (
                  <>
                    <button onClick={() => handleEditStart(note)} className="text-gray-500 hover:text-blue-600 transition p-1" title="ویرایش">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="text-gray-500 hover:text-red-600 transition p-1" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === note.id ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleEditSave(note.id)} className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1 transition-colors">
                    <Save size={14} /> ذخیره
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors">
                    <X size={14} /> انصراف
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap mt-1">{note.note}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}