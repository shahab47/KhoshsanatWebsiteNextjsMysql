// مسیر فایل: src/app/api/khoshmin/customers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { deleteFromMinio, cleanupRemovedFiles } from '@/lib/minio';

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
      include: { payments: true }
    });
    if (!invoice) return;
    const paidSum = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
    let status = invoice.status;
    if (status !== 'CANCELLED') {
      if (paidSum >= invoice.finalAmount && invoice.finalAmount > 0) {
        status = 'PAID';
      } else if (paidSum > 0) {
        status = 'PARTIAL';
      } else {
        status = 'PENDING';
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
    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }
    const payments = await db.payment.findMany({
      where: { customerId },
      include: { invoice: true },
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
    const { id } = await params;
    const customerId = parseInt(id);
    const body = await request.json();
    
    const { amount, paymentMethod, receiptNo, description, invoiceId, attachmentUrl } = body;
    
    if (isNaN(customerId) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const parsedInvoiceId = invoiceId ? parseInt(invoiceId) : null;

    const payment = await db.payment.create({
      data: {
        customerId,
        amount,
        paymentMethod,
        receiptNo: receiptNo || null,
        description: description || null,
        invoiceId: parsedInvoiceId,
        attachmentUrl: attachmentUrl || null
      }
    });

    await syncCustomerBalance(customerId);
    if (parsedInvoiceId) {
      await syncInvoicePayments(parsedInvoiceId);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ثبت پرداخت' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const paymentId = parseInt(url.searchParams.get('paymentId') || '');
    const body = await request.json();
    
    const { amount, paymentMethod, receiptNo, description, invoiceId, attachmentUrl } = body;

    if (isNaN(customerId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
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

    await syncCustomerBalance(customerId);
    if (oldInvoiceId) await syncInvoicePayments(oldInvoiceId);
    if (newInvoiceId && newInvoiceId !== oldInvoiceId) await syncInvoicePayments(newInvoiceId);

    return NextResponse.json(updated);
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
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const paymentId = parseInt(url.searchParams.get('paymentId') || '');

    if (isNaN(customerId) || isNaN(paymentId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.payment.findFirst({
      where: { id: paymentId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'پرداخت یافت نشد' }, { status: 404 });
    }

    // حذف فایل پیوست رسید پرداخت از MinIO
    if (existing.attachmentUrl) {
      await deleteFromMinio(existing.attachmentUrl);
    }

    const linkedInvoiceId = existing.invoiceId;

    await db.payment.delete({ where: { id: paymentId } });

    await syncCustomerBalance(customerId);
    if (linkedInvoiceId) {
      await syncInvoicePayments(linkedInvoiceId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف پرداخت' }, { status: 500 });
  }
}