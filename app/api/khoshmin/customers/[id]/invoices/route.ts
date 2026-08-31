// مسیر فایل: src/app/api/khoshmin/customers/[id]/invoices/route.ts

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
    const invoices = await db.invoice.findMany({
      where: { customerId },
      include: { payments: true, items: true },
      orderBy: { issueDate: 'desc' }
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت فاکتورها' }, { status: 500 });
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
    
    const { description, amount, discount = 0, tax = 0, dueDate, attachmentUrl } = body;

    if (isNaN(customerId) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const lastInvoice = await db.invoice.findFirst({ orderBy: { id: 'desc' } });
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNo.split('-')[1] || '0') : 0;
    const invoiceNo = `INV-${String(lastNumber + 1).padStart(6, '0')}`;
    const finalAmount = amount - discount + tax;

    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        customerId,
        amount,
        discount,
        tax,
        finalAmount,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl: attachmentUrl || null,
        items: {
          create: [{ title: description || 'خدمات/محصول', quantity: 1, unitPrice: amount, total: amount }]
        }
      }
    });

    await syncCustomerBalance(customerId);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ایجاد فاکتور' }, { status: 500 });
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
    const invoiceId = parseInt(url.searchParams.get('invoiceId') || '');
    const body = await request.json();
    
    const { amount, discount, tax, dueDate, status, description, attachmentUrl } = body;

    if (isNaN(customerId) || isNaN(invoiceId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
    }

    // پاکسازی فایل قبلی در صورت تغییر پیوست
    if (attachmentUrl !== undefined) {
      await cleanupRemovedFiles([existing.attachmentUrl], [attachmentUrl]);
    }

    let finalAmount = existing.finalAmount;
    if (amount !== undefined || discount !== undefined || tax !== undefined) {
      const newAmount = amount !== undefined ? amount : existing.amount;
      const newDiscount = discount !== undefined ? discount : existing.discount;
      const newTax = tax !== undefined ? tax : existing.tax;
      finalAmount = newAmount - newDiscount + newTax;
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: amount ?? existing.amount,
        discount: discount ?? existing.discount,
        tax: tax ?? existing.tax,
        finalAmount,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        status: status ?? existing.status,
        description: description !== undefined ? (description || null) : existing.description,
        attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : existing.attachmentUrl,
      }
    });

    await syncCustomerBalance(customerId);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در ویرایش فاکتور' }, { status: 500 });
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
    const invoiceId = parseInt(url.searchParams.get('invoiceId') || '');

    if (isNaN(customerId) || isNaN(invoiceId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, customerId },
      include: { payments: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
    }
    if (existing.payments.length > 0) {
      return NextResponse.json({ error: 'این فاکتور دارای پرداخت است و قابل حذف نمی‌باشد' }, { status: 400 });
    }

    // حذف فایل پیوست فاکتور از MinIO
    if (existing.attachmentUrl) {
      await deleteFromMinio(existing.attachmentUrl);
    }

    await db.invoiceItem.deleteMany({ where: { invoiceId } });
    await db.invoice.delete({ where: { id: invoiceId } });

    await syncCustomerBalance(customerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف فاکتور' }, { status: 500 });
  }
}