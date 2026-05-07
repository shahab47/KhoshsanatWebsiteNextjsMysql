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

// اضافه کردن متد DELETE
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