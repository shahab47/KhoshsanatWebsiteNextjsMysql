'use client';
// مسیر فایل: src/app/khoshmin/customers/[id]/_components/TabsNavigation.tsx

import { useEffect, useState } from 'react';
import { User, MessageSquare, StickyNote, FileText, CreditCard, Truck } from 'lucide-react';
import { useModal } from '@/app/contexts/ModalContext';

type TabType = 'info' | 'messages' | 'notes' | 'invoices' | 'payments' | 'deliveries';

interface TabsNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  customerId: string;
  refreshTrigger?: number;
}

export function TabsNavigation({ activeTab, setActiveTab, customerId, refreshTrigger }: TabsNavigationProps) {
  const { showAlert } = useModal();
  const [counts, setCounts] = useState({
    messages: 0,
    notes: 0,
    invoices: 0,
    payments: 0,
    deliveries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/khoshmin/customers/${customerId}/counts`);
        if (!res.ok) {
          throw new Error('خطا در دریافت شمارنده‌ها');
        }
        const data = await res.json();
        setCounts(data);
      } catch (error) {
        console.error('خطا در دریافت شمارنده‌ها', error);
        showAlert('خطا در دریافت اطلاعات تعداد تَب‌ها. لطفاً دوباره تلاش کنید.', 'خطا', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [customerId, refreshTrigger, showAlert]);

  const tabs = [
    { id: 'info' as TabType, label: 'اطلاعات مشتری', icon: <User size={18} /> },
    { id: 'messages' as TabType, label: 'پیام‌ها', icon: <MessageSquare size={18} />, count: counts.messages, isAlert: true },
    { id: 'notes' as TabType, label: 'یادداشت‌ها', icon: <StickyNote size={18} />, count: counts.notes, isAlert: true },
    { id: 'invoices' as TabType, label: 'فاکتورها', icon: <FileText size={18} />, count: counts.invoices, isAlert: false },
    { id: 'payments' as TabType, label: 'پرداختی‌ها', icon: <CreditCard size={18} />, count: counts.payments, isAlert: false },
    { id: 'deliveries' as TabType, label: 'تحویل بار', icon: <Truck size={18} />, count: counts.deliveries, isAlert: false },
  ];

  if (loading) return <div className="border-b border-gray-200 h-14 bg-gray-50/30 animate-pulse rounded-t-2xl"></div>;

  return (
    <div className="border-b border-gray-200 overflow-x-auto bg-white rounded-t-2xl shadow-sm custom-scrollbar">
      <div className="flex gap-1 min-w-max px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 rounded-t-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border-b-4 border-blue-600 font-black scale-105 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span className="text-sm">{tab.label}</span>

            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[10px] rounded-full px-2 py-0.5 min-w-[22px] text-center font-bold transition-all ${
                  tab.isAlert
                    ? 'bg-red-500 text-white animate-bounce shadow-sm shadow-red-500/30'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}