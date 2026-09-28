import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { VoucherService } from '@/lib/accounting/voucher-service';
import { VoucherStatus, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as VoucherStatus | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: Prisma.JournalVoucherWhereInput = {
      ...(status ? { status } : {}),
      ...(startDate || endDate
        ? {
            voucherDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { voucherNo: isNaN(Number(search)) ? undefined : Number(search) },
              { referenceId: { contains: search } },
            ].filter(Boolean) as Prisma.JournalVoucherWhereInput[],
          }
        : {}),
    };

    const [vouchers, total] = await Promise.all([
      db.journalVoucher.findMany({
        where,
        orderBy: [{ voucherDate: 'desc' }, { voucherNo: 'desc' }],
        skip,
        take: limit,
        include: {
          entries: {
            include: { account: true, costCenter: true },
            orderBy: { rowOrder: 'asc' },
          },
          reversalVoucher: { select: { voucherNo: true } },
          reversedByVoucher: { select: { voucherNo: true } },
        },
      }),
      db.journalVoucher.count({ where }),
    ]);

    return NextResponse.json({
      data: vouchers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست اسناد حسابداری' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    const {
      voucherDate,
      description,
      type,
      referenceModule,
      referenceId,
      idempotencyKey,
      companyId,
      branchId,
      fiscalYearId,
      periodId,
      entries,
    } = body;

    if (!description || !entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json(
        { error: 'شرح سند و حداقل دو ردیف آرتیکل الزامی است' },
        { status: 400 }
      );
    }

    const voucher = await VoucherService.createVoucher({
      voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
      description,
      type,
      referenceModule,
      referenceId,
      idempotencyKey,
      companyId,
      branchId,
      fiscalYearId,
      periodId,
      createdById: (user as any).id ? String((user as any).id) : null,
      entries,
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error: any) {
    console.error('Error creating voucher:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در صدور سند حسابداری' },
      { status: 400 }
    );
  }
}
