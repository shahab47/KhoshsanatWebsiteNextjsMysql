// app/admin/customers/[id]/components/TabsNavigation.tsx
'use client';

import { useEffect, useState } from 'react';
import { User, MessageSquare, StickyNote, FileText, CreditCard, Truck } from 'lucide-react';

type TabType = 'info' | 'messages' | 'notes' | 'invoices' | 'payments' | 'deliveries';

export function TabsNavigation({
  activeTab,
  setActiveTab,
  customerId,
  refreshTrigger,
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  customerId: string;
  refreshTrigger?: number;
}) {
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
        const [messagesRes, notesRes, invoicesRes, paymentsRes, deliveriesRes] = await Promise.all([
          fetch(`/api/admin/customers/${customerId}/messages`),
          fetch(`/api/admin/customers/${customerId}/notes`),
          fetch(`/api/admin/customers/${customerId}/invoices`),
          fetch(`/api/admin/customers/${customerId}/payments`),
          fetch(`/api/admin/customers/${customerId}/deliveries`),
        ]);

        const messages = await messagesRes.json();
        const notes = await notesRes.json();
        const invoices = await invoicesRes.json();
        const payments = await paymentsRes.json();
        const deliveries = await deliveriesRes.json();

        setCounts({
          messages: messages.filter((m: any) => !m.isRead).length,
          notes: notes.filter((n: any) => n.isNew).length, // فقط یادداشت‌های جدید
          invoices: invoices.length,
          payments: payments.length,
          deliveries: deliveries.length,
        });
      } catch (error) {
        console.error('خطا در دریافت شمارنده‌ها', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [customerId, refreshTrigger]);

  const tabs = [
    { id: 'info' as TabType, label: 'اطلاعات مشتری', icon: <User size={18} /> },
    { id: 'messages' as TabType, label: 'پیام‌ها', icon: <MessageSquare size={18} />, count: counts.messages },
    { id: 'notes' as TabType, label: 'یادداشت‌ها', icon: <StickyNote size={18} />, count: counts.notes },
    { id: 'invoices' as TabType, label: 'فاکتورها', icon: <FileText size={18} />, count: counts.invoices },
    { id: 'payments' as TabType, label: 'پرداختی‌ها', icon: <CreditCard size={18} />, count: counts.payments },
    { id: 'deliveries' as TabType, label: 'تحویل بار', icon: <Truck size={18} />, count: counts.deliveries },
  ];

  if (loading) return <div className="border-b border-gray-200 h-12"></div>;

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}