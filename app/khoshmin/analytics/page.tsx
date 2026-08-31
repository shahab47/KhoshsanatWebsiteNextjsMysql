// app/khoshmin/analytics/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Eye, Globe, Smartphone, Laptop, Tablet,
  Compass, MapPin, RefreshCw, Calendar, ArrowUpRight, CheckCircle2,
  ExternalLink, ShieldAlert, Activity
} from 'lucide-react';

interface AnalyticsData {
  range: string;
  kpi: {
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
    yesterdayVisits: number;
    topSource: string;
    mobilePercentage: number;
  };
  timeline: Array<{ label: string; visits: number; uniques: number }>;
  sources: Array<{ name: string; count: number; percentage: number }>;
  cities: Array<{ name: string; count: number; percentage: number }>;
  topPages: Array<{ path: string; count: number; percentage: number }>;
  devices: Array<{ name: string; type: string; count: number; percentage: number }>;
  browsers: Array<{ name: string; count: number; percentage: number }>;
  operatingSystems: Array<{ name: string; count: number; percentage: number }>;
  recentVisits: Array<{
    id: number;
    path: string;
    referrerSource: string;
    city: string;
    country: string;
    device: string;
    browser: string;
    os: string;
    createdAt: string;
  }>;
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<string>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAnalytics = async (selectedRange = range) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/khoshmin/analytics?range=${selectedRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('خطا در دریافت آمار:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const maxTimelineVisits = data?.timeline.length
    ? Math.max(...data.timeline.map((t) => t.visits), 1)
    : 1;

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold">در حال پردازش هوشمند آمار و گزارشات بازدید...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-[Vazir,'vazirmatn',sans-serif]" dir="rtl">
      
      {/* هدر صفحه و فیلترهای زمانی */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <TrendingUp size={28} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">
              آمار هوشمند و تحلیل رفتار مشتریان
            </h1>
          </div>
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            گزارش لحظه‌ای از تعداد بازدیدها، موقعیت جغرافیایی، کانال‌های ورودی (گوگل، اینستاگرام، ترب و...) و علایق کاربران
          </p>
        </div>

        {/* فیلتر بازه زمانی */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
          {[
            { id: 'today', label: 'امروز' },
            { id: '7d', label: '۷ روز گذشته' },
            { id: '30d', label: '۳۰ روز گذشته' },
            { id: 'all', label: 'کل زمان‌ها' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                range === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => fetchAnalytics(range)}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            title="بروزرسانی داده‌ها"
            aria-label="بروزرسانی آمار"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* ۱. کارت‌های شاخص‌های کلیدی عملکرد (KPIs) */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* کارت ۱: کل بازدیدها */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-500">کل بازدیدها در این بازه</span>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Eye size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-2">
              {data.kpi.totalVisits.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Activity size={14} className="text-blue-500" />
              مجموع تمام دفعات مشاهده صفحات
            </p>
          </div>

          {/* کارت ۲: بازدیدکنندگان یکتا */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-500">بازدیدکنندگان یکتا (مشتریان)</span>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Users size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-2">
              {data.kpi.uniqueVisitors.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-emerald-600 font-medium">
              تعداد اشخاص یا دستگاه‌های مجزا
            </p>
          </div>

          {/* کارت ۳: بازدیدهای امروز در برابر دیروز */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-500">بازدیدهای امروز</span>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Calendar size={22} />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-2">
              {data.kpi.todayVisits.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-gray-500">
              دیروز: <strong className="text-gray-700">{data.kpi.yesterdayVisits.toLocaleString('fa-IR')}</strong> بازدید
            </p>
          </div>

          {/* کارت ۴: کانال برتر و سهم موبایل */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-500">کانال اصلی جذب</span>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <Compass size={22} />
              </div>
            </div>
            <div className="text-xl font-black text-purple-700 line-clamp-1 mb-2">
              {data.kpi.topSource}
            </div>
            <p className="text-xs text-gray-500">
              {data.kpi.mobilePercentage}% کاربران با موبایل
            </p>
          </div>
        </div>
      )}

      {/* ۲. نمودار میله‌ای روند بازدیدهای روزانه */}
      {data && data.timeline.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                روند بازدیدها در طول زمان
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                مقایسه تعداد بازدید کل (ستون آبی) با تعداد کاربران یکتا (ستون سبز)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                <span>بازدید کل</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span>کاربران یکتا</span>
              </div>
            </div>
          </div>

          {/* نمودار CSS Responsive */}
          <div className="h-64 flex items-end gap-3 pt-8 pb-2 overflow-x-auto custom-scrollbar border-b border-gray-200">
            {data.timeline.map((item, idx) => {
              const visitHeight = Math.max((item.visits / maxTimelineVisits) * 100, 8);
              const uniqueHeight = Math.max((item.uniques / maxTimelineVisits) * 100, 6);

              return (
                <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[11px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {item.visits}
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* ستون بازدید کل */}
                    <div
                      style={{ height: `${visitHeight}%` }}
                      className="w-3.5 sm:w-5 bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-700 shadow-sm"
                    ></div>
                    {/* ستون کاربر یکتا */}
                    <div
                      style={{ height: `${uniqueHeight}%` }}
                      className="w-3.5 sm:w-5 bg-emerald-500 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-600 shadow-sm"
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap mt-2">
                    {item.label.includes('-') ? item.label.split('-').slice(1).join('/') : item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ۳. بخش دو ستونه: کانال‌های ورودی و موقعیت جغرافیایی */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ستون اول: منابع ورودی (Acquisition Channels) */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Compass size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">مشتریان از کجا آمده‌اند؟ (منابع ترافیک)</h2>
                <p className="text-xs text-gray-500">کانال‌های جذب و معرفی کاربر به وبسایت</p>
              </div>
            </div>

            <div className="space-y-4">
              {data.sources.map((src, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-800">{src.name}</span>
                    <span className="text-gray-500 text-xs">
                      {src.count.toLocaleString('fa-IR')} بازدید ({src.percentage}٪)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(src.percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ستون دوم: توزیع موقعیت جغرافیایی و شهرها */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <MapPin size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">موقعیت جغرافیایی کاربران (شهرها)</h2>
                <p className="text-xs text-gray-500">شهرهای با بیشترین میزان بازدید و تقاضا</p>
              </div>
            </div>

            <div className="space-y-4">
              {data.cities.map((city, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {city.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {city.count.toLocaleString('fa-IR')} بازدید ({city.percentage}٪)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(city.percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ۴. پربازدیدترین صفحات و تفکیک دستگاه‌ها */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ۲ ستون: صفحات پربازدید */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Eye className="text-blue-600" size={22} />
              پربازدیدترین صفحات و محصولات
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs pb-3">
                    <th className="pb-3 font-bold">آدرس صفحه</th>
                    <th className="pb-3 font-bold">تعداد مشاهده</th>
                    <th className="pb-3 font-bold">سهم از کل</th>
                    <th className="pb-3 font-bold text-center">مشاهده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.topPages.map((page, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 font-medium text-gray-800 max-w-xs truncate" dir="ltr">
                        {page.path}
                      </td>
                      <td className="py-3 font-bold text-gray-900">
                        {page.count.toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {page.percentage}٪
                      </td>
                      <td className="py-3 text-center">
                        <a
                          href={page.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="مشاهده صفحه در سایت"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ۱ ستون: دستگاه‌ها و مرورگرها */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="text-amber-500" size={22} />
              دستگاه‌ها و مرورگرها
            </h2>

            {/* دستگاه‌ها */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 block">نوع دستگاه</span>
              {data.devices.map((dev, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-2">
                    {dev.type === 'mobile' ? (
                      <Smartphone size={18} className="text-blue-600" />
                    ) : dev.type === 'desktop' ? (
                      <Laptop size={18} className="text-indigo-600" />
                    ) : (
                      <Tablet size={18} className="text-purple-600" />
                    )}
                    <span className="text-sm font-bold text-gray-800">{dev.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {dev.percentage}٪ ({dev.count})
                  </span>
                </div>
              ))}
            </div>

            {/* مرورگرها */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-400 block">مرورگرهای برتر</span>
              <div className="flex flex-wrap gap-2">
                {data.browsers.map((b, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100"
                  >
                    {b.name}: {b.percentage}٪
                  </span>
                ))}
              </div>
            </div>

            {/* سیستم‌عامل‌ها */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-400 block">سیستم‌عامل‌ها</span>
              <div className="flex flex-wrap gap-2">
                {data.operatingSystems.map((os, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl"
                  >
                    {os.name}: {os.percentage}٪
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ۵. جریان زنده آخرین بازدیدکنندگان (Live Stream) */}
      {data && data.recentVisits.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              جریان زنده آخرین بازدیدهای ثبت‌شده
            </h2>
            <span className="text-xs text-gray-500">نمایش ۲۵ بازدید اخیر کاربران واقعی</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs pb-3">
                  <th className="pb-3 font-bold">زمان</th>
                  <th className="pb-3 font-bold">صفحه ورودی</th>
                  <th className="pb-3 font-bold">منبع ارجاع (Referrer)</th>
                  <th className="pb-3 font-bold">موقعیت (شهر/کشور)</th>
                  <th className="pb-3 font-bold">دستگاه و سیستم‌عامل</th>
                  <th className="pb-3 font-bold">مرورگر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3 text-gray-500 font-mono" dir="ltr">
                      {new Date(visit.createdAt).toLocaleTimeString('fa-IR')}
                    </td>
                    <td className="py-3 font-medium text-gray-800 max-w-[200px] truncate" dir="ltr">
                      {visit.path}
                    </td>
                    <td className="py-3 text-purple-700 font-bold">
                      {visit.referrerSource || 'ورود مستقیم'}
                    </td>
                    <td className="py-3 font-medium text-emerald-700">
                      {visit.city ? `${visit.city}، ${visit.country}` : visit.country}
                    </td>
                    <td className="py-3 text-gray-600">
                      {visit.device === 'mobile' ? '📱 موبایل' : '💻 دسکتاپ'} ({visit.os})
                    </td>
                    <td className="py-3 text-gray-600">
                      {visit.browser}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
