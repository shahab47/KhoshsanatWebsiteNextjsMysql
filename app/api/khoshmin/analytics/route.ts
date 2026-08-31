// app/api/khoshmin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 'today', '7d', '30d', 'all'

    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'all') {
      startDate = new Date(0);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    // ۱. دریافت آمار کلی و شاخص‌های کلیدی
    const [
      totalVisitsCount,
      todayVisitsCount,
      yesterdayVisitsCount,
      allVisitsInPeriod,
      recentLiveVisits,
    ] = await Promise.all([
      db.visitLog.count({
        where: { createdAt: { gte: startDate }, isBot: false },
      }),
      db.visitLog.count({
        where: { createdAt: { gte: todayStart }, isBot: false },
      }),
      db.visitLog.count({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          isBot: false,
        },
      }),
      db.visitLog.findMany({
        where: { createdAt: { gte: startDate }, isBot: false },
        select: {
          id: true,
          path: true,
          referrerSource: true,
          city: true,
          country: true,
          device: true,
          browser: true,
          os: true,
          sessionHash: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.visitLog.findMany({
        where: { isBot: false },
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          path: true,
          referrerSource: true,
          city: true,
          country: true,
          device: true,
          browser: true,
          os: true,
          createdAt: true,
        },
      }),
    ]);

    // محاسبه کاربران یکتا
    const uniqueSessions = new Set(allVisitsInPeriod.map((v) => v.sessionHash).filter(Boolean));
    const uniqueVisitorsCount = uniqueSessions.size;

    // تفکیک منابع ترافیک (Acquisition Channels)
    const sourceCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const pathCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};

    // نمودار زمانی
    const timelineMap: Record<string, { visits: number; sessions: Set<string> }> = {};

    allVisitsInPeriod.forEach((visit) => {
      // منبع
      const source = visit.referrerSource || 'ورود مستقیم (Direct)';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;

      // شهر
      const city = visit.city || 'نامشخص';
      cityCounts[city] = (cityCounts[city] || 0) + 1;

      // صفحه
      const path = visit.path || '/';
      pathCounts[path] = (pathCounts[path] || 0) + 1;

      // دستگاه
      const device = visit.device || 'desktop';
      if (deviceCounts[device] !== undefined) {
        deviceCounts[device]++;
      } else {
        deviceCounts[device] = 1;
      }

      // مرورگر
      const browser = visit.browser || 'سایر';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;

      // سیستم عامل
      const os = visit.os || 'سایر';
      osCounts[os] = (osCounts[os] || 0) + 1;

      // تایم‌لاین
      const dateKey = range === 'today'
        ? `${new Date(visit.createdAt).getHours()}:00`
        : new Date(visit.createdAt).toISOString().split('T')[0];

      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { visits: 0, sessions: new Set() };
      }
      timelineMap[dateKey].visits++;
      if (visit.sessionHash) {
        timelineMap[dateKey].sessions.add(visit.sessionHash);
      }
    });

    const total = totalVisitsCount || 1;

    // ساخت آرایه‌های مرتب شده با درصد
    const sources = Object.entries(sourceCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const cities = Object.entries(cityCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topPages = Object.entries(pathCounts)
      .map(([path, count]) => ({
        path,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const devices = Object.entries(deviceCounts)
      .map(([name, count]) => ({
        name: name === 'mobile' ? 'موبایل' : name === 'desktop' ? 'دسکتاپ' : 'تبلت',
        type: name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const browsers = Object.entries(browserCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const operatingSystems = Object.entries(osCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const timeline = Object.entries(timelineMap).map(([label, data]) => ({
      label,
      visits: data.visits,
      uniques: data.sessions.size,
    }));

    const topSource = sources[0] ? sources[0].name : 'ورود مستقیم';
    const mobilePercentage = Math.round(((deviceCounts.mobile || 0) / total) * 100);

    return NextResponse.json({
      range,
      kpi: {
        totalVisits: totalVisitsCount,
        uniqueVisitors: uniqueVisitorsCount,
        todayVisits: todayVisitsCount,
        yesterdayVisits: yesterdayVisitsCount,
        topSource,
        mobilePercentage,
      },
      timeline,
      sources,
      cities,
      topPages,
      devices,
      browsers,
      operatingSystems,
      recentVisits: recentLiveVisits,
    });
  } catch (error) {
    console.error('خطا در محاسبه آمار بازدیدها:', error);
    return NextResponse.json(
      { error: 'خطا در بارگذاری آمار بازدیدها' },
      { status: 500 }
    );
  }
}
