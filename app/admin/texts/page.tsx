// src/app/admin/texts/page.tsx
'use client'; // حتماً این خط در بالاترین قسمت باشد

import React, { useState, useEffect } from 'react';
import { Save, Type, CheckCircle } from 'lucide-react';

// نام تابع حتماً با حرف بزرگ شروع شود
export default function TextsManager() {
  const [texts, setTexts] = useState({
    HERO_TITLE: '',
    HERO_SUBTITLE: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchTexts = async () => {
      try {
        const res = await fetch('/api/texts', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTexts({
            HERO_TITLE: data.HERO_TITLE || 'گروه مهندسی خوش‌صنعت',
            HERO_SUBTITLE: data.HERO_SUBTITLE || 'طراحی و ساخت پروژه‌های صنعتی'
          });
        }
      } catch (error) {
        console.error("خطا در دریافت متن‌ها:", error);
      }
    };
    fetchTexts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTexts(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(texts)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      alert('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">مدیریت متن‌های سایت</h2>
            <p className="text-sm text-gray-500 mt-1">محتوای متنی بخش‌های مختلف سایت را اینجا ویرایش کنید</p>
          </div>
          <Type className="text-green-500" size={32} />
        </div>

        <div className="p-8">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">بخش معرفی (Hero)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تیتر اصلی</label>
                  <input
                    type="text"
                    name="HERO_TITLE"
                    value={texts.HERO_TITLE}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">توضیحات</label>
                  <textarea
                    name="HERO_SUBTITLE"
                    value={texts.HERO_SUBTITLE}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-gray-800 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold bg-green-600 hover:bg-green-700 transition-all disabled:bg-gray-400"
              >
                <Save size={20} />
                {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
              {saved && (
                <div className="flex items-center gap-2 text-green-600 animate-pulse font-bold">
                  <CheckCircle size={20} />
                  <span>ذخیره شد!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}