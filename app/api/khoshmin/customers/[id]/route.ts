// مسیر فایل: src/app/api/khoshmin/customers/[id]/route.ts

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
    
    // بررسی وجود مشتری
    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });
    
    if (!customer) {
      return NextResponse.json(
        { error: 'مشتری یافت نشد' },
        { status: 404 }
      );
    }
    
    // حذف مشتری (با توجه to cascade در schema)
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