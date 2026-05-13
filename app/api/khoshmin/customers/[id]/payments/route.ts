// مسیر فایل: src/app/api/khoshmin/customers/[id]/payments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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
    
    // 🟢 فیلد attachmentUrl اضافه شد
    const { amount, paymentMethod, receiptNo, description, invoiceId, attachmentUrl } = body;
    
    if (isNaN(customerId) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }
    const payment = await db.payment.create({
      data: {
        customerId,
        amount,
        paymentMethod,
        receiptNo: receiptNo || null,
        description: description || null,
        invoiceId: invoiceId ? parseInt(invoiceId) : null,
        attachmentUrl: attachmentUrl || null // 🟢 ذخیره در دیتابیس
      }
    });
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
    
    // 🟢 فیلد attachmentUrl اضافه شد
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

    const updated = await db.payment.update({
      where: { id: paymentId },
      data: {
        amount: amount !== undefined ? amount : existing.amount,
        paymentMethod: paymentMethod || existing.paymentMethod,
        receiptNo: receiptNo !== undefined ? (receiptNo || null) : existing.receiptNo,
        description: description !== undefined ? (description || null) : existing.description,
        invoiceId: invoiceId !== undefined ? (invoiceId ? parseInt(invoiceId) : null) : existing.invoiceId,
        attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : existing.attachmentUrl, // 🟢 ویرایش در دیتابیس
      }
    });
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

    await db.payment.delete({ where: { id: paymentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف پرداخت' }, { status: 500 });
  }
}