// مسیر فایل: src/app/api/khoshmin/customers/[id]/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { deleteFromMinio, cleanupRemovedFiles } from '@/lib/minio';
import { requireAuth } from '@/lib/auth-middleware';

import { CreditService } from '@/lib/ar/credit-service';
import { ARPostingService } from '@/lib/ar/ar-posting-service';
import { SequenceService } from '@/lib/accounting/sequence-service';

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
    const invoices = await db.invoice.findMany({
      where: { customerId },
      include: {
        payments: true,
        allocations: { include: { payment: true } },
        items: true,
      },
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
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    const body = await request.json();
    
    const { description, amount, discount = 0, tax = 0, dueDate, attachmentUrl } = body;

    const numAmount = Number(amount);
    const numDiscount = Number(discount) || 0;
    const numTax = Number(tax) || 0;

    if (isNaN(customerId) || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ پایه فاکتور باید بزرگتر از صفر باشد' }, { status: 400 });
    }

    if (numDiscount < 0 || numTax < 0) {
      return NextResponse.json({ error: 'مقادیر تخفیف یا مالیات نمی‌توانند منفی باشند' }, { status: 400 });
    }

    if (numDiscount > numAmount) {
      return NextResponse.json({ error: 'مبلغ تخفیف نمی‌تواند بیشتر از مبلغ فاکتور باشد' }, { status: 400 });
    }

    const finalAmount = Math.max(0, numAmount - numDiscount + numTax);

    // اعتبارسنجی سقف اعتبار مشتری قبل از صدور فاکتور
    const creditCheck = await CreditService.validateNewInvoice(customerId, finalAmount);
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.reason }, { status: 400 });
    }

    // تولید شماره فاکتور از طریق موتور توالی اتمیک یا پشتیبان
    let invoiceNo = '';
    try {
      const seq = await SequenceService.nextNumber('INVOICE');
      invoiceNo = seq.formattedNumber;
    } catch {
      const lastInvoice = await db.invoice.findFirst({ orderBy: { id: 'desc' } });
      const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNo.split('-')[1] || '0') : 0;
      invoiceNo = `INV-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        customerId,
        amount: numAmount,
        discount: numDiscount,
        tax: numTax,
        finalAmount,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl: attachmentUrl || null,
        items: {
          create: [{ title: description || 'خدمات/محصول', quantity: 1, unitPrice: numAmount, total: numAmount }]
        }
      }
    });

    // صدور خودکار سند دوبل حسابداری
    try {
      await ARPostingService.postInvoiceVoucher(invoice.id);
    } catch (postError) {
      console.error('Error posting double-entry voucher for invoice:', postError);
    }

    await syncCustomerBalance(customerId);

    const fresh = await db.invoice.findUnique({
      where: { id: invoice.id },
      include: { payments: true, allocations: true, items: true },
    });

    return NextResponse.json(fresh || invoice, { status: 201 });
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error?.message || 'خطا در ایجاد فاکتور' }, { status: 500 });
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

    // اگر فاکتور به حالت ابطال (CANCELLED) تغییر می‌یابد و سند داشته باشد، سند معکوس صادر شود
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED' && existing.journalVoucherId) {
      try {
        await ARPostingService.reverseInvoiceVoucher(invoiceId, 'ابطال فاکتور توسط کاربر در سامانه');
      } catch (revError) {
        console.error('Error reversing invoice voucher:', revError);
      }
    }

    const newAmount = amount !== undefined ? Number(amount) : existing.amount;
    const newDiscount = discount !== undefined ? Number(discount) : existing.discount;
    const newTax = tax !== undefined ? Number(tax) : existing.tax;

    if (newAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ پایه فاکتور باید بزرگتر از صفر باشد' }, { status: 400 });
    }
    if (newDiscount < 0 || newTax < 0) {
      return NextResponse.json({ error: 'مقادیر تخفیف یا مالیات نمی‌توانند منفی باشند' }, { status: 400 });
    }
    if (newDiscount > newAmount) {
      return NextResponse.json({ error: 'مبلغ تخفیف نمی‌تواند از مبلغ پایه بیشتر باشد' }, { status: 400 });
    }

    const finalAmount = Math.max(0, newAmount - newDiscount + newTax);

    // پاکسازی فایل قبلی در صورت تغییر پیوست
    if (attachmentUrl !== undefined) {
      await cleanupRemovedFiles([existing.attachmentUrl], [attachmentUrl]);
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount,
        discount: newDiscount,
        tax: newTax,
        finalAmount,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
        status: status ?? existing.status,
        description: description !== undefined ? (description || null) : existing.description,
        attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : existing.attachmentUrl,
      }
    });

    // همگام‌سازی پرداخت‌های متصل و تراز کل مشتری
    await syncInvoicePayments(invoiceId);
    await syncCustomerBalance(customerId);

    const freshInvoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, allocations: true, items: true }
    });

    return NextResponse.json(freshInvoice || updated);
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
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const invoiceId = parseInt(url.searchParams.get('invoiceId') || '');

    if (isNaN(customerId) || isNaN(invoiceId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, customerId },
      include: { payments: true, allocations: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
    }

    // حذف فایل پیوست فاکتور از MinIO
    if (existing.attachmentUrl) {
      await deleteFromMinio(existing.attachmentUrl);
    }

    // در صورتی که سند حسابداری صادر شده باشد، طبق قانون تغییرناپذیری مالی سند معکوس صادر شده و وضعیت ابطال می‌شود
    if (existing.journalVoucherId) {
      try {
        await ARPostingService.reverseInvoiceVoucher(invoiceId, 'ابطال و برگشت فاکتور حذف‌شده');
      } catch (err) {
        console.error('Error issuing reversal voucher on delete:', err);
      }

      await db.paymentAllocation.deleteMany({ where: { invoiceId } });
      await db.payment.updateMany({
        where: { invoiceId },
        data: { invoiceId: null },
      });

      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: 'CANCELLED' },
      });
    } else {
      // فاکتور فاقد سند رسمی قابل حذف فیزیکی است
      await db.$transaction([
        db.paymentAllocation.deleteMany({ where: { invoiceId } }),
        db.payment.updateMany({
          where: { invoiceId },
          data: { invoiceId: null }
        }),
        db.invoiceItem.deleteMany({ where: { invoiceId } }),
        db.invoice.delete({ where: { id: invoiceId } })
      ]);
    }

    await syncCustomerBalance(customerId);

    return NextResponse.json({ success: true, message: 'فاکتور با موفقیت ابطال و تسویه‌های آن آزاد شدند.' });
  } catch (error: any) {
    console.error('Invoice delete error:', error);
    return NextResponse.json({ error: 'خطا در حذف/ابطال فاکتور: ' + (error?.message || '') }, { status: 500 });
  }
}