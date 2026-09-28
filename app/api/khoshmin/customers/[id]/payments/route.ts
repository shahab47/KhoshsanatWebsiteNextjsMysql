// مسیر فایل: src/app/api/khoshmin/customers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { deleteFromMinio, cleanupRemovedFiles } from '@/lib/minio';
import { requireAuth } from '@/lib/auth-middleware';

import { ARPostingService } from '@/lib/ar/ar-posting-service';
import { SettlementService } from '@/lib/ar/settlement-service';

async function syncCustomerBalance(customerId: number) {
  try {
    const validInvoices = await db.invoice.aggregate({
      where: { customerId, status: { not: 'CANCELLED' } },
      _sum: { finalAmount: true }
    });
    const totalPaid = await db.payment.aggregate({
      where: { customerId },
      _sum: { amount: true }
    });
    const debt = (validInvoices._sum.finalAmount || 0) - (totalPaid._sum.amount || 0);
    await db.customer.update({
      where: { id: customerId },
      data: { totalDebt: debt, totalPaid: totalPaid._sum.amount || 0 }
    });
  } catch (err) {
    console.error('Error syncing customer balance:', err);
  }
}

async function syncInvoicePayments(invoiceId: number) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, allocations: true }
    });
    if (!invoice) return;

    const allocationsSum = invoice.allocations.reduce((acc, a) => acc + Number(a.amount), 0);
    const directPaidSum = invoice.payments
      .filter((p) => !invoice.allocations.some((a) => a.paymentId === p.id))
      .reduce((acc, p) => acc + p.amount, 0);
    const paidSum = allocationsSum + directPaidSum;

    let status = invoice.status;
    if (status !== 'CANCELLED') {
      if (paidSum >= invoice.finalAmount && invoice.finalAmount > 0) {
        status = 'PAID';
      } else if (paidSum > 0) {
        status = 'PARTIAL';
      } else {
        if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
          status = 'OVERDUE';
        } else {
          status = 'PENDING';
        }
      }
    }
    await db.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: paidSum, status }
    });
  } catch (err) {
    console.error('Error syncing invoice payments:', err);
  }
}

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
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }
    const payments = await db.payment.findMany({
      where: { customerId },
      include: {
        invoice: true,
        allocations: { include: { invoice: true } },
        cheques: true,
      },
      orderBy: { paymentDate: 'desc' }
    });
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت پرداختی‌ها' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    const body = await request.json();
    
    const { amount, paymentMethod, receiptNo, description, invoiceId, attachmentUrl, allocations } = body;
    
    if (isNaN(customerId) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const parsedInvoiceId = invoiceId ? parseInt(invoiceId) : null;

    const payment = await db.payment.create({
      data: {
        customerId,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'CASH',
        receiptNo: receiptNo || null,
        description: description || null,
        invoiceId: parsedInvoiceId,
        attachmentUrl: attachmentUrl || null
      }
    });

    // ۱. صدور خودکار سند دوبل حسابداری برای رسید پرداخت
    try {
      await ARPostingService.postPaymentVoucher(payment.id);
    } catch (postError) {
      console.error('Error posting double-entry voucher for payment:', postError);
    }

    // ۲. پردازش تخصیص به فاکتورها (دستی یا خودکار)
    try {
      if (Array.isArray(allocations) && allocations.length > 0) {
        await SettlementService.allocatePayment(payment.id, allocations);
      } else if (parsedInvoiceId) {
        await SettlementService.autoAllocatePayment(payment.id);
      }
    } catch (allocError) {
      console.error('Error allocating payment:', allocError);
    }

    // ۲.۵. ثبت مشخصات چک صیادی در صورت انتخاب روش پرداخت چک
    if (paymentMethod === 'CHECK' && (body.sayadId || body.cheque)) {
      const chq = body.cheque || body;
      if (chq.sayadId) {
        try {
          await db.cheque.create({
            data: {
              type: 'RECEIVABLE',
              sayadId: chq.sayadId.trim(),
              chequeNumber: chq.chequeNumber || payment.receiptNo || 'CHQ-UNKNOWN',
              amount: payment.amount,
              issueDate: chq.issueDate ? new Date(chq.issueDate) : payment.paymentDate,
              dueDate: chq.dueDate ? new Date(chq.dueDate) : payment.paymentDate,
              status: 'RECEIVED',
              bankName: chq.bankName || 'بانک نامشخص',
              bankBranch: chq.bankBranch || null,
              bankAccountNumber: chq.bankAccountNumber || null,
              drawerName: chq.drawerName || 'صاحب حساب',
              drawerNationalId: chq.drawerNationalId || null,
              customerId,
              paymentId: payment.id,
              journalVoucherId: payment.journalVoucherId,
              description: payment.description,
            },
          });
        } catch (chqErr) {
          console.error('Error creating linked cheque record:', chqErr);
        }
      }
    }

    await syncCustomerBalance(customerId);
    if (parsedInvoiceId) {
      await syncInvoicePayments(parsedInvoiceId);
    }

    const fresh = await db.payment.findUnique({
      where: { id: payment.id },
      include: { invoice: true, allocations: { include: { invoice: true } }, cheques: true },
    });

    return NextResponse.json(fresh || payment, { status: 201 });
  } catch (error: any) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: error?.message || 'خطا در ثبت پرداخت' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const paymentId = parseInt(url.searchParams.get('paymentId') || '');
    const body = await request.json();
    
    const { amount, paymentMethod, receiptNo, description, invoiceId, attachmentUrl, allocations } = body;

    if (isNaN(customerId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    if (amount !== undefined && (typeof amount !== 'number' || isNaN(amount) || amount <= 0)) {
      return NextResponse.json({ error: 'مبلغ پرداختی باید بزرگتر از صفر باشد' }, { status: 400 });
    }

    const existing = await db.payment.findFirst({
      where: { id: paymentId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'پرداخت یافت نشد' }, { status: 404 });
    }

    // پاکسازی فایل قبلی در صورت تغییر پیوست
    if (attachmentUrl !== undefined) {
      await cleanupRemovedFiles([existing.attachmentUrl], [attachmentUrl]);
    }

    const oldInvoiceId = existing.invoiceId;
    const newInvoiceId = invoiceId !== undefined ? (invoiceId ? parseInt(invoiceId) : null) : existing.invoiceId;

    const updated = await db.payment.update({
      where: { id: paymentId },
      data: {
        amount: amount !== undefined ? amount : existing.amount,
        paymentMethod: paymentMethod || existing.paymentMethod,
        receiptNo: receiptNo !== undefined ? (receiptNo || null) : existing.receiptNo,
        description: description !== undefined ? (description || null) : existing.description,
        invoiceId: newInvoiceId,
        attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : existing.attachmentUrl,
      }
    });

    if (Array.isArray(allocations)) {
      try {
        await SettlementService.allocatePayment(paymentId, allocations);
      } catch (err) {
        console.error('Error re-allocating payment:', err);
      }
    }

    await syncCustomerBalance(customerId);
    if (oldInvoiceId) await syncInvoicePayments(oldInvoiceId);
    if (newInvoiceId && newInvoiceId !== oldInvoiceId) await syncInvoicePayments(newInvoiceId);

    const fresh = await db.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, allocations: { include: { invoice: true } } },
    });

    return NextResponse.json(fresh || updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در ویرایش پرداخت' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const paymentId = parseInt(url.searchParams.get('paymentId') || '');

    if (isNaN(customerId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.payment.findFirst({
      where: { id: paymentId, customerId },
      include: { allocations: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'پرداخت یافت نشد' }, { status: 404 });
    }

    // حذف فایل پیوست رسید پرداخت از MinIO
    if (existing.attachmentUrl) {
      await deleteFromMinio(existing.attachmentUrl);
    }

    // در صورت وجود سند حسابداری قطعی، صدور سند معکوس (Reversal) طبق استاندارد تغییرناپذیری مالی
    if (existing.journalVoucherId) {
      try {
        await ARPostingService.reversePaymentVoucher(paymentId, 'ابطال و برگشت رسید پرداخت توسط کاربر');
      } catch (err) {
        console.error('Error reversing payment voucher on delete:', err);
      }
    }

    const affectedInvoiceIds = existing.allocations.map((a) => a.invoiceId);
    if (existing.invoiceId && !affectedInvoiceIds.includes(existing.invoiceId)) {
      affectedInvoiceIds.push(existing.invoiceId);
    }

    // حذف تخصیص‌ها و خود رکورد پرداخت
    await db.paymentAllocation.deleteMany({ where: { paymentId } });
    await db.payment.delete({ where: { id: paymentId } });

    await syncCustomerBalance(customerId);
    for (const invId of affectedInvoiceIds) {
      await syncInvoicePayments(invId);
    }

    return NextResponse.json({ success: true, message: 'رسید پرداخت با موفقیت حذف و سند معکوس صادر شد.' });
  } catch (error: any) {
    console.error('Payment delete error:', error);
    return NextResponse.json({ error: 'خطا در حذف پرداخت: ' + (error?.message || '') }, { status: 500 });
  }
}