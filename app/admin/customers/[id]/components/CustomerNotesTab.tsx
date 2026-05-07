// app/admin/customers/[id]/components/CustomerNotesTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { StickyNote, Plus, Save, X, Edit, Trash2 } from 'lucide-react';

interface Note {
  id: number;
  note: string;
  createdAt: string;
}

export function CustomerNotesTab({ customerId }: { customerId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`);
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error('خطا در دریافت یادداشت‌ها', error);
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
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setNewNote('');
        setShowForm(false);
        fetchNotes();
      } else alert('خطا در افزودن یادداشت');
    } catch {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const updateNote = async (id: number, updatedNote: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes?noteId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updatedNote }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchNotes();
      } else {
        alert('خطا در ویرایش یادداشت');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const deleteNote = async (id: number) => {
    if (!confirm('آیا از حذف این یادداشت اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes?noteId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchNotes();
      } else {
        alert('خطا در حذف یادداشت');
      }
    } catch {
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleEditStart = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.note);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSave = async (id: number) => {
    if (!editText.trim()) return;
    await updateNote(id, editText.trim());
  };

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;

  return (
    <div className="space-y-4">
      {/* فرم افزودن یادداشت جدید */}
      <div className="bg-gray-50 rounded-xl p-4">
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
            <Plus size={18} /> افزودن یادداشت جدید
          </button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="یادداشت خود را وارد کنید..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-800"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={addNote} disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Save size={16} /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100">
                انصراف
              </button>
            </div>
          </div>
        )}
      </div>

      {/* لیست یادداشت‌ها */}
      {notes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">یادداشتی وجود ندارد</p>
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
                  <button onClick={() => handleEditStart(note)} className="text-gray-500 hover:text-blue-600 transition p-1" title="ویرایش">
                    <Edit size={16} />
                  </button>
                )}
                <button onClick={() => deleteNote(note.id)} className="text-gray-500 hover:text-red-600 transition p-1" title="حذف">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {editingId === note.id ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-800"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleEditSave(note.id)} className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1">
                    <Save size={14} /> ذخیره
                  </button>
                  <button onClick={handleEditCancel} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
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