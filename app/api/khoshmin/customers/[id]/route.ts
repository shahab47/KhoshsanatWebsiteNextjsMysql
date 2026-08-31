// مسیر فایل: src/app/api/khoshmin/customers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { extractUrlsFromJson, deleteFilesFromMinio } from '@/lib/minio';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'آیدی مشتری نامعتبر است' },
        { status: 400 }
      );
    }
    
    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'مشتری یافت نشد' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(customer);
    
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت اطلاعات مشتری' },
      { status: 500 }
    );
  }
}

// 🟢 اضافه شدن متد PUT برای ذخیره تغییرات ویرایش
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, company, address, nationalId, status } = body;

    // بررسی تکراری نبودن ایمیل (نباید متعلق به مشتری دیگری باشد)
    if (email) {
      const existingEmail = await db.customer.findFirst({
        where: { email: email.trim(), NOT: { id: customerId } }
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'این ایمیل قبلاً برای مشتری دیگری ثبت شده است.' }, { status: 400 });
      }
    }

    // بررسی تکراری نبودن کد ملی
    if (nationalId) {
      const existingNId = await db.customer.findFirst({
        where: { nationalId: nationalId.trim(), NOT: { id: customerId } }
      });
      if (existingNId) {
        return NextResponse.json({ error: 'این کد ملی قبلاً برای مشتری دیگری ثبت شده است.' }, { status: 400 });
      }
    }

    // آپدیت در دیتابیس
    const updatedCustomer = await db.customer.update({
      where: { id: customerId },
      data: {
        name: name?.trim(),
        email: email?.trim(),
        phone: phone || null,
        company: company || null,
        address: address || null,
        nationalId: nationalId || null,
        status: status || 'ACTIVE'
      }
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'خطا در ویرایش اطلاعات مشتری' }, { status: 500 });
  }
}

// متد DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'آیدی مشتری نامعتبر است' },
        { status: 400 }
      );
    }
    
    // بررسی وجود مشتری همراه با تمام اسناد و فایل‌های وابسته
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: true,
        payments: true,
        deliveries: true,
      }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'مشتری یافت نشد' },
        { status: 404 }
      );
    }
    
    // جمع‌آوری و حذف تمام فایل‌های فاکتورها، رسیدهای پرداخت، امضاها و پیوست‌های تحویل بار این مشتری از MinIO
    const filesToDelete: string[] = [];

    if (customer.invoices && Array.isArray(customer.invoices)) {
      for (const inv of customer.invoices) {
        if (inv.attachmentUrl) filesToDelete.push(inv.attachmentUrl);
      }
    }

    if (customer.payments && Array.isArray(customer.payments)) {
      for (const pay of customer.payments) {
        if (pay.attachmentUrl) filesToDelete.push(pay.attachmentUrl);
      }
    }

    if (customer.deliveries && Array.isArray(customer.deliveries)) {
      for (const del of customer.deliveries) {
        if (del.signatureUrl) filesToDelete.push(del.signatureUrl);
        filesToDelete.push(...extractUrlsFromJson(del.attachments));
      }
    }

    await deleteFilesFromMinio(filesToDelete);

    // حذف مشتری (با توجه به cascade در schema رکوردهای مرتبط در دیتابیس نیز حذف می‌شوند)
    await db.customer.delete({
      where: { id: customerId }
    });
    
    return NextResponse.json(
      { message: 'مشتری با موفقیت حذف شد' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'خطا در حذف مشتری' + (error instanceof Error ? ': ' + error.message : '') },
      { status: 500 }
    );
  }
}