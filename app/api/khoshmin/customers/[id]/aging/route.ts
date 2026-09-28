import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { InvoiceStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const openInvoices = await db.invoice.findMany({
      where: {
        customerId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
      },
      orderBy: { issueDate: 'asc' },
    });

    const now = new Date();

    const aging = {
      bucket0_30: { amount: 0, count: 0, label: '۰ تا ۳۰ روز (جاری)' },
      bucket31_60: { amount: 0, count: 0, label: '۳۱ تا ۶۰ روز' },
      bucket61_90: { amount: 0, count: 0, label: '۶۱ تا ۹۰ روز' },
      bucketOver90: { amount: 0, count: 0, label: 'بیش از ۹۰ روز (معوق)' },
      totalOverdue: 0,
      invoices: [] as any[],
    };

    for (const inv of openInvoices) {
      const remaining = Math.max(0, inv.finalAmount - inv.paidAmount);
      if (remaining <= 0) continue;

      const issueTime = new Date(inv.issueDate).getTime();
      const diffDays = Math.max(0, Math.floor((now.getTime() - issueTime) / (1000 * 60 * 60 * 24)));

      let bucket = 'bucket0_30';
      if (diffDays > 90) {
        bucket = 'bucketOver90';
        aging.bucketOver90.amount += remaining;
        aging.bucketOver90.count += 1;
      } else if (diffDays > 60) {
        bucket = 'bucket61_90';
        aging.bucket61_90.amount += remaining;
        aging.bucket61_90.count += 1;
      } else if (diffDays > 30) {
        bucket = 'bucket31_60';
        aging.bucket31_60.amount += remaining;
        aging.bucket31_60.count += 1;
      } else {
        aging.bucket0_30.amount += remaining;
        aging.bucket0_30.count += 1;
      }

      aging.totalOverdue += remaining;

      aging.invoices.push({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        finalAmount: inv.finalAmount,
        paidAmount: inv.paidAmount,
        remainingAmount: remaining,
        ageDays: diffDays,
        bucket,
        status: inv.status,
      });
    }

    return NextResponse.json(aging);
  } catch (error: any) {
    console.error('Error fetching AR aging:', error);
    return NextResponse.json({ error: 'خطا در محاسبه تحلیل سنی مطالبات' }, { status: 500 });
  }
}
