import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - دریافت لیست مشتریان به همراه وضعیت نوتیف
export async function GET() {
  try {
    const customers = await db.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        address: true,
        nationalId: true,
        totalDebt: true,
        totalPaid: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: {
              where: { isRead: false }
            },
            notes: {
              where: { isNew: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // اضافه کردن فیلدهای مورد نیاز برای فرانت‌اند
    const customersWithNotifications = customers.map(customer => ({
      ...customer,
      hasNotification: (customer._count.messages > 0) || (customer._count.notes > 0),
      _count: {
        unreadMessages: customer._count.messages,
        newNotes: customer._count.notes
      }
    }));

    return NextResponse.json(customersWithNotifications);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت لیست مشتریان' },
      { status: 500 }
    );
  }
}

// POST - ایجاد مشتری جدید (بدون تغییر)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, address, nationalId, status } = body;
    
    if (!name || !email) {
      return NextResponse.json(
        { error: 'نام و ایمیل الزامی است' },
        { status: 400 }
      );
    }
    
    // بررسی تکراری نبودن ایمیل - استفاده از findFirst به جای findUnique
    const existingCustomer = await db.customer.findFirst({
      where: { email: email }
    });
    
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'این ایمیل قبلاً ثبت شده است' },
        { status: 400 }
      );
    }
    
    // بررسی تکراری نبودن کد ملی (اگر وارد شده باشد)
    if (nationalId) {
      const existingNationalId = await db.customer.findFirst({
        where: { nationalId: nationalId }
      });
      
      if (existingNationalId) {
        return NextResponse.json(
          { error: 'این کد ملی قبلاً ثبت شده است' },
          { status: 400 }
        );
      }
    }
    
    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone || null,
        company: company || null,
        address: address || null,
        nationalId: nationalId || null,
        status: status || 'ACTIVE'
      }
    });
    
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'خطا در ایجاد مشتری' },
      { status: 500 }
    );
  }
}