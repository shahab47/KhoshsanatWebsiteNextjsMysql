// src/app/api/admin/customers/[id]/deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import db from '@/lib/db';

// GET – دریافت لیست تحویل‌های بار مشتری
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
    const deliveries = await db.delivery.findMany({
      where: { customerId },
      orderBy: { deliveryDate: 'desc' }
    });
    return NextResponse.json(deliveries);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت تحویل بار' }, { status: 500 });
  }
}

// POST – ثبت فرم تحویل بار جدید (با آپلود فایل)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }

    const formData = await request.formData();
    const productName = formData.get('productName') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const unit = formData.get('unit') as string;
    const deliveryDate = formData.get('deliveryDate') as string;
    const status = formData.get('status') as string;
    const description = formData.get('description') as string;
    const signature = formData.get('signature') as File | null;

    // اعتبارسنجی
    if (!productName || isNaN(quantity) || quantity <= 0 || !deliveryDate) {
      return NextResponse.json({ error: 'اطلاعات محصول معتبر نیست' }, { status: 400 });
    }

    // تولید شماره تحویل خودکار
    const lastDelivery = await db.delivery.findFirst({ orderBy: { id: 'desc' } });
    const lastNumber = lastDelivery ? parseInt(lastDelivery.deliveryNo.split('-')[1] || '0') : 0;
    const deliveryNo = `DEL-${String(lastNumber + 1).padStart(6, '0')}`;

    // آپلود امضا (در صورت وجود)
    let signatureUrl = null;
    if (signature && signature.size > 0) {
      try {
        const uploadDir = path.join(process.cwd(), 'public/uploads/signatures');
        if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
        const timestamp = Date.now();
        const fileName = `signature_${customerId}_${timestamp}.png`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(await signature.arrayBuffer());
        await writeFile(filePath, buffer);
        signatureUrl = `/uploads/signatures/${fileName}`;
      } catch (err) {
        console.error('خطا در آپلود امضا:', err);
        // ادامه می‌دهیم (امضا ذخیره نمی‌شود)
      }
    }

    // آپلود فایل‌های پیوست
    const attachments: any[] = [];
    const files = formData.getAll('attachments') as File[];
    for (const file of files) {
      if (file && file.size > 0) {
        try {
          const uploadDir = path.join(process.cwd(), 'public/uploads/deliveries');
          if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `delivery_${customerId}_${timestamp}_${safeName}`;
          const filePath = path.join(uploadDir, fileName);
          const buffer = Buffer.from(await file.arrayBuffer());
          await writeFile(filePath, buffer);
          attachments.push({
            name: file.name,
            url: `/uploads/deliveries/${fileName}`,
            size: file.size,
            type: file.type,
          });
        } catch (err) {
          console.error('خطا در آپلود پیوست:', err);
        }
      }
    }

    // ایجاد رکورد در دیتابیس
    const newDelivery = await db.delivery.create({
      data: {
        deliveryNo,
        customerId,
        productName,
        quantity,
        unit: unit || null,
        deliveryDate: new Date(deliveryDate),
        status: (status || 'PENDING') as any, // 🔴 رفع خطای تایپ‌اسکریپت در اینجا
        description: description || null,
        signatureUrl,
        attachments: attachments.length > 0 ? (attachments as any) : null,
      },
    });

    return NextResponse.json(newDelivery, { status: 201 });
  } catch (error) {
    console.error('Error in POST /deliveries:', error);
    return NextResponse.json({ error: 'خطا در ثبت تحویل بار' }, { status: 500 });
  }
}

// PUT – به‌روزرسانی وضعیت تحویل بار (یا اطلاعات کلی)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const deliveryId = parseInt(url.searchParams.get('deliveryId') || '');
    const body = await request.json();
    const { status, productName, quantity, unit, deliveryDate, description } = body;

    if (isNaN(customerId) || isNaN(deliveryId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.delivery.findFirst({
      where: { id: deliveryId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'تحویل بار یافت نشد' }, { status: 404 });
    }

    const updated = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: (status ?? existing.status) as any, // 🔴 رفع خطای تایپ‌اسکریپت در اینجا
        productName: productName ?? existing.productName,
        quantity: quantity ?? existing.quantity,
        unit: unit !== undefined ? (unit || null) : existing.unit,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : existing.deliveryDate,
        description: description !== undefined ? (description || null) : existing.description,
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in PUT /deliveries:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی تحویل بار' }, { status: 500 });
  }
}

// DELETE – حذف فرم تحویل بار
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const deliveryId = parseInt(url.searchParams.get('deliveryId') || '');

    if (isNaN(customerId) || isNaN(deliveryId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.delivery.findFirst({
      where: { id: deliveryId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'تحویل بار یافت نشد' }, { status: 404 });
    }

    await db.delivery.delete({ where: { id: deliveryId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /deliveries:', error);
    return NextResponse.json({ error: 'خطا در حذف تحویل بار' }, { status: 500 });
  }
}