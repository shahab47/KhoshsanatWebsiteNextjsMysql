// app/admin/customers/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TabsNavigation } from './components/TabsNavigation';
import { FinancialSummaryCards } from './components/FinancialSummaryCards';
import { CustomerInfoTab } from './components/CustomerInfoTab';
import { CustomerMessagesTab } from './components/CustomerMessagesTab';
import { CustomerNotesTab } from './components/CustomerNotesTab';
import { CustomerInvoicesTab } from './components/CustomerInvoicesTab';
import { CustomerPaymentsTab } from './components/CustomerPaymentsTab';
import { CustomerDeliveriesTab } from './components/CustomerDeliveriesTab';

type TabType = 'info' | 'messages' | 'notes' | 'invoices' | 'payments' | 'deliveries';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounts, setRefreshCounts] = useState(0);
  const hasMarked = useRef(false);

  // دریافت نام مشتری (برای هدر)
  useEffect(() => {
    const fetchName = async () => {
      if (!customerId || isNaN(Number(customerId))) {
        setError('آیدی مشتری نامعتبر است');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCustomerName(data.name);
      } catch {
        setError('خطا در دریافت اطلاعات');
      } finally {
        setLoading(false);
      }
    };
    fetchName();
  }, [customerId]);

  // علامت‌زنی خودکار (فقط یک بار) - پیام‌ها و مشتری
  useEffect(() => {
    const markAsReadAndViewed = async () => {
      if (!customerId || isNaN(Number(customerId)) || hasMarked.current) return;
      hasMarked.current = true;
      try {
        // علامت زدن پیام‌های خوانده نشده
        await fetch(`/api/admin/customers/${customerId}/mark?type=messages`, {
          method: 'PATCH',
        });
        // علامت زدن مشتری به عنوان دیده شده (برای حذف از آمار جدید)
        await fetch(`/api/admin/customers/${customerId}/mark?type=customer`, {
          method: 'PATCH',
        });
        // رفرش شمارنده‌های تب‌ها
        setRefreshCounts(prev => prev + 1);
      } catch (err) {
        console.error('Error marking as read/viewed:', err);
      }
    };
    if (!loading && !error) {
      markAsReadAndViewed();
    }
  }, [customerId, loading, error]);

  // مدیریت تغییر تب (برای علامت‌زنی یادداشت‌ها هنگام ورود به تب یادداشت‌ها)
  const handleTabChange = async (newTab: TabType) => {
    setActiveTab(newTab);
    if (newTab === 'notes') {
      try {
        await fetch(`/api/admin/customers/${customerId}/mark?type=notes`, {
          method: 'PATCH',
        });
        setRefreshCounts(prev => prev + 1);
      } catch (err) {
        console.error('Error marking notes as viewed:', err);
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="text-center py-12"><p className="text-red-500">{error}</p><Link href="/admin/customers" className="text-blue-600">بازگشت</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-800">{customerName}</h1>
      </div>

      <FinancialSummaryCards customerId={customerId} />

      <TabsNavigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        customerId={customerId}
        refreshTrigger={refreshCounts}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'info' && <CustomerInfoTab customerId={customerId} />}
        {activeTab === 'messages' && <CustomerMessagesTab customerId={customerId} />}
        {activeTab === 'notes' && <CustomerNotesTab customerId={customerId} />}
        {activeTab === 'invoices' && <CustomerInvoicesTab customerId={customerId} />}
        {activeTab === 'payments' && <CustomerPaymentsTab customerId={customerId} />}
        {activeTab === 'deliveries' && <CustomerDeliveriesTab customerId={customerId} />}
      </div>
    </div>
  );
}