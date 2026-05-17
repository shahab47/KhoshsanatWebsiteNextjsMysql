// مسیر فایل: src/app/api/khoshmin/customers/[id]/deliveries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { uploadToMinio, deleteFromMinio } from '@/lib/minio';

// تابع کمکی برای اعتبارسنجی URL مینیو
function isValidMinioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // باید با http:// یا https:// شروع شود و شامل پورت 9000 یا آدرس مینیو باشد
  const minioEndpoint = process.env.MINIO_ENDPOINT || '45.149.78.107:9000';
  const bucket = process.env.MINIO_BUCKET_NAME || 'khoshsanat-media';
  const pattern = new RegExp(`^https?://${minioEndpoint.replace(/\./g, '\\.')}/${bucket}/`);
  return pattern.test(url);
}

// GET – بدون تغییر
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
    console.error(error);
    return NextResponse.json({ error: 'خطا در دریافت تحویل بار' }, { status: 500 });
  }
}

// POST – ثبت فرم تحویل بار جدید (فقط ذخیره URL معتبر MinIO)
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

    if (!productName || isNaN(quantity) || quantity <= 0 || !deliveryDate) {
      return NextResponse.json({ error: 'اطلاعات محصول معتبر نیست' }, { status: 400 });
    }

    // تولید شماره تحویل
    const lastDelivery = await db.delivery.findFirst({ orderBy: { id: 'desc' } });
    const lastNumber = lastDelivery ? parseInt(lastDelivery.deliveryNo.split('-')[1] || '0') : 0;
    const deliveryNo = `DEL-${String(lastNumber + 1).padStart(6, '0')}`;

    // آپلود امضا در MinIO (فقط در صورت موفقیت و URL معتبر ذخیره شود)
    let signatureUrl = null;
    if (signature && signature.size > 0) {
      try {
        const buffer = Buffer.from(await signature.arrayBuffer());
        const fileName = `signature_${customerId}_${Date.now()}.png`;
        const uploadedUrl = await uploadToMinio(buffer, fileName, 'khoshmin', signature.type);
        if (uploadedUrl && isValidMinioUrl(uploadedUrl)) {
          signatureUrl = uploadedUrl;
        } else {
          console.error('آدرس برگشتی از MinIO معتبر نیست:', uploadedUrl);
          // در اینجا می‌توانید خطا بدهید یا ادامه دهید (امضا ذخیره نمی‌شود)
        }
      } catch (err) {
        console.error('خطا در آپلود امضا به MinIO:', err);
      }
    }

    // آپلود فایل‌های پیوست (فقط URL‌های معتبر اضافه شوند)
    const attachments: any[] = [];
    const files = formData.getAll('attachments') as File[];
    for (const file of files) {
      if (file && file.size > 0) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `delivery_${customerId}_${Date.now()}_${safeName}`;
          const uploadedUrl = await uploadToMinio(buffer, fileName, 'khoshmin', file.type);
          if (uploadedUrl && isValidMinioUrl(uploadedUrl)) {
            attachments.push({
              name: file.name,
              url: uploadedUrl,
              size: file.size,
              type: file.type,
            });
          } else {
            console.error(`آدرس پیوست نامعتبر برای فایل ${file.name}: ${uploadedUrl}`);
          }
        } catch (err) {
          console.error('خطا در آپلود پیوست به MinIO:', err);
        }
      }
    }

    // ایجاد رکورد در دیتابیس (فقط اطلاعات معتبر)
    const newDelivery = await db.delivery.create({
      data: {
        deliveryNo,
        customerId,
        productName,
        quantity,
        unit: unit || null,
        deliveryDate: new Date(deliveryDate),
        status: (status || 'PENDING') as any,
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

// PUT – بدون تغییر خاص (اما می‌توانید validation اضافه کنید)
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
    
    const { status, productName, quantity, unit, deliveryDate, description, signatureUrl } = body;

    if (isNaN(customerId) || isNaN(deliveryId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.delivery.findFirst({
      where: { id: deliveryId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'تحویل بار یافت نشد' }, { status: 404 });
    }

    // اگر signatureUrl جدید داده شده و معتبر نیست، نادیده بگیر
    let finalSignatureUrl = existing.signatureUrl;
    if (signatureUrl !== undefined) {
      if (signatureUrl && isValidMinioUrl(signatureUrl)) {
        finalSignatureUrl = signatureUrl;
      } else {
        finalSignatureUrl = null;
      }
    }

    const updated = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: (status ?? existing.status) as any,
        productName: productName ?? existing.productName,
        quantity: quantity ?? existing.quantity,
        unit: unit !== undefined ? (unit || null) : existing.unit,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : existing.deliveryDate,
        description: description !== undefined ? (description || null) : existing.description,
        signatureUrl: finalSignatureUrl,
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in PUT /deliveries:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی تحویل بار' }, { status: 500 });
  }
}

// DELETE – حذف رکورد و فایل‌های MinIO (فقط در صورت معتبر بودن URL)
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

    // حذف امضا فقط در صورت معتبر بودن URL
    if (existing.signatureUrl && typeof existing.signatureUrl === 'string') {
      if (isValidMinioUrl(existing.signatureUrl)) {
        try {
          await deleteFromMinio(existing.signatureUrl);
        } catch (err) {
          console.error('خطا در حذف امضا از MinIO:', err);
        }
      } else {
        console.warn('امضا در MinIO نیست، حذف نمی‌شود:', existing.signatureUrl);
      }
    }

    // حذف پیوست‌های معتبر
    const attachments = existing.attachments;
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (!att) continue;
        let fileUrl: string | null = null;
        if (typeof att === 'string') fileUrl = att;
        else if (typeof att === 'object' && att !== null) fileUrl = (att as any).url;
        
        if (fileUrl && isValidMinioUrl(fileUrl)) {
          try {
            await deleteFromMinio(fileUrl);
          } catch (err) {
            console.error(`خطا در حذف فایل پیوست "${fileUrl}" از MinIO:`, err);
          }
        } else if (fileUrl) {
          console.warn('فایل پیوست در MinIO نیست، حذف نمی‌شود:', fileUrl);
        }
      }
    }

    await db.delivery.delete({ where: { id: deliveryId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /deliveries:', error);
    return NextResponse.json({ error: 'خطا در حذف تحویل بار' }, { status: 500 });
  }
}