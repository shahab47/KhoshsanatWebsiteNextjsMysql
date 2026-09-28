// مسیر فایل: app/api/khoshmin/customers/[id]/deliveries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { 
  uploadToMinio, 
  deleteFilesFromMinio, 
  cleanupRemovedFiles, 
  extractUrlsFromJson, 
  isValidMinioUrl 
} from '@/lib/minio';
import { requireAuth } from '@/lib/auth-middleware';
import { DeliveryService } from '@/lib/logistics/delivery-service';
import { ScaleService } from '@/lib/logistics/scale-service';
import { DeliveryStatus, FreightTerm } from '@prisma/client';

// GET – دریافت لیست تحویل بارها به همراه مشخصات کامل لجستیک، باسکول و اسناد حسابداری
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
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const deliveries = await db.delivery.findMany({
      where: { customerId },
      include: {
        warehouse: { select: { id: true, name: true, code: true, type: true } },
        product: { select: { id: true, title: true, code: true, unit: true, unitWeightKg: true } },
        invoice: { select: { id: true, invoiceNo: true, finalAmount: true } },
      },
      orderBy: { deliveryDate: 'desc' },
    });

    return NextResponse.json(deliveries);
  } catch (error) {
    console.error('Error in GET /deliveries:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست تحویل‌ها' }, { status: 500 });
  }
}

// POST – ثبت تحویل بار با پشتیبانی از توزین باسکول دیجیتال و بارنامه ترابری
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let payload: any = {};
    let signatureUrl: string | null = null;
    let scalePhotoUrl: string | null = null;
    const attachments: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      payload.productName = formData.get('productName') as string;
      payload.quantity = parseFloat(formData.get('quantity') as string);
      payload.unit = (formData.get('unit') as string) || null;
      payload.deliveryDate = formData.get('deliveryDate') as string;
      payload.status = (formData.get('status') as string) || DeliveryStatus.PENDING;
      payload.description = (formData.get('description') as string) || null;

      // بارنامه و راننده
      payload.waybillNo = (formData.get('waybillNo') as string) || null;
      payload.driverName = (formData.get('driverName') as string) || null;
      payload.driverNationalId = (formData.get('driverNationalId') as string) || null;
      payload.driverPhone = (formData.get('driverPhone') as string) || null;
      payload.truckPlate = (formData.get('truckPlate') as string) || null;
      payload.shippingCompany = (formData.get('shippingCompany') as string) || null;
      payload.freightCost = formData.get('freightCost') ? parseFloat(formData.get('freightCost') as string) : 0;
      payload.freightPaymentTerm = (formData.get('freightPaymentTerm') as FreightTerm) || FreightTerm.PAID_BY_CUSTOMER;

      // باسکول
      payload.scaleGrossKg = formData.get('scaleGrossKg') ? parseFloat(formData.get('scaleGrossKg') as string) : null;
      payload.scaleTareKg = formData.get('scaleTareKg') ? parseFloat(formData.get('scaleTareKg') as string) : null;
      payload.nominalWeightKg = formData.get('nominalWeightKg') ? parseFloat(formData.get('nominalWeightKg') as string) : null;
      payload.scaleTicketNo = (formData.get('scaleTicketNo') as string) || null;

      // ارتباطات
      payload.warehouseId = (formData.get('warehouseId') as string) || null;
      payload.productId = formData.get('productId') ? parseInt(formData.get('productId') as string) : null;
      payload.invoiceId = formData.get('invoiceId') ? parseInt(formData.get('invoiceId') as string) : null;
      payload.productionOrderId = (formData.get('productionOrderId') as string) || null;

      // آپلود امضا در MinIO
      const signature = formData.get('signature') as File | null;
      if (signature && signature.size > 0) {
        try {
          const buffer = Buffer.from(await signature.arrayBuffer());
          const fileName = `signature_${customerId}_${Date.now()}.png`;
          const uploadedUrl = await uploadToMinio(buffer, fileName, 'khoshmin', signature.type);
          if (uploadedUrl && isValidMinioUrl(uploadedUrl)) {
            signatureUrl = uploadedUrl;
          }
        } catch (err) {
          console.error('خطا در آپلود امضا به MinIO:', err);
        }
      }

      // آپلود عکس قبض باسکول در MinIO
      const scalePhoto = formData.get('scalePhoto') as File | null;
      if (scalePhoto && scalePhoto.size > 0) {
        try {
          const buffer = Buffer.from(await scalePhoto.arrayBuffer());
          const fileName = `scale_${customerId}_${Date.now()}.png`;
          const uploadedUrl = await uploadToMinio(buffer, fileName, 'khoshmin', scalePhoto.type);
          if (uploadedUrl && isValidMinioUrl(uploadedUrl)) {
            scalePhotoUrl = uploadedUrl;
          }
        } catch (err) {
          console.error('خطا در آپلود قبض باسکول به MinIO:', err);
        }
      }

      // آپلود سایر پیوست‌ها
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
            }
          } catch (err) {
            console.error(`خطا در آپلود پیوست ${file.name}:`, err);
          }
        }
      }
    } else {
      payload = await request.json();
      signatureUrl = payload.signatureUrl || null;
      scalePhotoUrl = payload.scalePhotoUrl || null;
      if (Array.isArray(payload.attachments)) {
        attachments.push(...payload.attachments);
      }
    }

    if (!payload.productName || isNaN(payload.quantity) || payload.quantity <= 0) {
      return NextResponse.json({ error: 'اطلاعات محصول و مقدار ارسالی معتبر نیست' }, { status: 400 });
    }

    const newDelivery = await DeliveryService.createDelivery({
      customerId,
      productName: payload.productName,
      quantity: payload.quantity,
      unit: payload.unit || 'شاخه',
      deliveryDate: payload.deliveryDate,
      status: payload.status as DeliveryStatus,
      description: payload.description,
      signatureUrl,
      attachments: attachments.length > 0 ? attachments : null,

      // بارنامه
      waybillNo: payload.waybillNo,
      driverName: payload.driverName,
      driverNationalId: payload.driverNationalId,
      driverPhone: payload.driverPhone,
      truckPlate: payload.truckPlate,
      shippingCompany: payload.shippingCompany,
      freightCost: payload.freightCost,
      freightPaymentTerm: payload.freightPaymentTerm,

      // باسکول
      scaleGrossKg: payload.scaleGrossKg,
      scaleTareKg: payload.scaleTareKg,
      nominalWeightKg: payload.nominalWeightKg,
      scaleTicketNo: payload.scaleTicketNo,
      scalePhotoUrl,

      // اتصالات انبار و فاکتور
      warehouseId: payload.warehouseId,
      productId: payload.productId,
      invoiceId: payload.invoiceId,
      productionOrderId: payload.productionOrderId,
    });

    return NextResponse.json(newDelivery, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /deliveries:', error);
    return NextResponse.json({ error: error.message || 'خطا در ثبت تحویل بار' }, { status: 500 });
  }
}

// PUT – ویرایش، تایید خروج انبار و ثبت وضعیت تحویل بار
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
    const deliveryId = parseInt(url.searchParams.get('deliveryId') || '');
    const body = await request.json();

    if (isNaN(customerId) || isNaN(deliveryId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.delivery.findFirst({
      where: { id: deliveryId, customerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'تحویل بار یافت نشد' }, { status: 404 });
    }

    // ۱. در صورت تغییر وضعیت به DELIVERED (تحویل شده)، فرآیند خروج انبار و صدور سند COGS اجرا شود
    if (existing.status !== DeliveryStatus.DELIVERED && body.status === DeliveryStatus.DELIVERED) {
      const fulfilled = await DeliveryService.fulfillDelivery(deliveryId);
      return NextResponse.json(fulfilled);
    }

    // ۲. در صورت تغییر وضعیت به RETURNED یا ابطال
    if (existing.status === DeliveryStatus.DELIVERED && body.status === DeliveryStatus.RETURNED) {
      const reversed = await DeliveryService.reverseDelivery(deliveryId, body.returnReason || 'برگشت کالا به انبار');
      return NextResponse.json(reversed);
    }

    // ۳. مدیریت و پاکسازی تفاضلی فایل‌های MinIO
    const oldFiles = [
      existing.signatureUrl,
      existing.scalePhotoUrl,
      ...extractUrlsFromJson(existing.attachments),
    ];
    const newFiles = [
      body.signatureUrl !== undefined ? body.signatureUrl : existing.signatureUrl,
      body.scalePhotoUrl !== undefined ? body.scalePhotoUrl : existing.scalePhotoUrl,
      ...extractUrlsFromJson(body.attachments !== undefined ? body.attachments : existing.attachments),
    ];
    await cleanupRemovedFiles(oldFiles, newFiles);

    // ۴. محاسبه مجدد اوزان باسکول در صورت ویرایش
    let scaleNetKg = existing.scaleNetKg;
    let nominalWeightKg = existing.nominalWeightKg;
    let weightVariancePercent = existing.weightVariancePercent;
    let isToleranceExceeded = existing.isToleranceExceeded;

    const gross = body.scaleGrossKg !== undefined ? body.scaleGrossKg : existing.scaleGrossKg;
    const tare = body.scaleTareKg !== undefined ? body.scaleTareKg : existing.scaleTareKg;
    const nominal = body.nominalWeightKg !== undefined ? body.nominalWeightKg : existing.nominalWeightKg;

    if (gross !== null && gross !== undefined && tare !== null && tare !== undefined) {
      const scaleCalc = ScaleService.calculateScaleWeights({
        scaleGrossKg: gross,
        scaleTareKg: tare,
        nominalWeightKg: nominal,
      });
      scaleNetKg = scaleCalc.scaleNetKg;
      nominalWeightKg = scaleCalc.nominalWeightKg;
      weightVariancePercent = scaleCalc.weightVariancePercent;
      isToleranceExceeded = scaleCalc.isToleranceExceeded;
    }

    const updated = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: (body.status ?? existing.status) as DeliveryStatus,
        productName: body.productName ?? existing.productName,
        quantity: body.quantity !== undefined ? parseFloat(body.quantity) : existing.quantity,
        unit: body.unit !== undefined ? (body.unit || null) : existing.unit,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existing.deliveryDate,
        description: body.description !== undefined ? (body.description || null) : existing.description,
        signatureUrl: body.signatureUrl !== undefined ? (body.signatureUrl || null) : existing.signatureUrl,
        attachments: body.attachments !== undefined ? body.attachments : existing.attachments,

        // لجستیک
        waybillNo: body.waybillNo !== undefined ? (body.waybillNo || null) : existing.waybillNo,
        driverName: body.driverName !== undefined ? (body.driverName || null) : existing.driverName,
        driverNationalId: body.driverNationalId !== undefined ? (body.driverNationalId || null) : existing.driverNationalId,
        driverPhone: body.driverPhone !== undefined ? (body.driverPhone || null) : existing.driverPhone,
        truckPlate: body.truckPlate !== undefined ? (body.truckPlate || null) : existing.truckPlate,
        shippingCompany: body.shippingCompany !== undefined ? (body.shippingCompany || null) : existing.shippingCompany,
        freightCost: body.freightCost !== undefined ? body.freightCost : existing.freightCost,
        freightPaymentTerm: (body.freightPaymentTerm ?? existing.freightPaymentTerm) as FreightTerm,

        // باسکول
        scaleGrossKg: gross !== null && gross !== undefined ? gross : null,
        scaleTareKg: tare !== null && tare !== undefined ? tare : null,
        scaleNetKg,
        nominalWeightKg,
        weightVariancePercent,
        isToleranceExceeded,
        scaleTicketNo: body.scaleTicketNo !== undefined ? (body.scaleTicketNo || null) : existing.scaleTicketNo,
        scalePhotoUrl: body.scalePhotoUrl !== undefined ? (body.scalePhotoUrl || null) : existing.scalePhotoUrl,

        // پیوندها
        warehouseId: body.warehouseId !== undefined ? (body.warehouseId || null) : existing.warehouseId,
        productId: body.productId !== undefined ? (body.productId ? parseInt(body.productId) : null) : existing.productId,
      },
      include: {
        warehouse: true,
        product: true,
        invoice: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /deliveries:', error);
    return NextResponse.json({ error: error.message || 'خطا در به‌روزرسانی تحویل بار' }, { status: 500 });
  }
}

// DELETE – ممانعت از حذف حواله‌های نهایی یا دارای گردش انبار و سند دوبل (غیرقابل حذف فیزیکی)
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
    const deliveryId = parseInt(url.searchParams.get('deliveryId') || '');

    if (isNaN(customerId) || isNaN(deliveryId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.delivery.findFirst({
      where: { id: deliveryId, customerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'تحویل بار یافت نشد' }, { status: 404 });
    }

    // کنترل عدم حذف اسناد نهایی‌شده طبق اصول سیستم‌های مالی و انبارداری یکپارچه
    if (existing.journalVoucherId || existing.stockTransactionId || existing.status === DeliveryStatus.DELIVERED) {
      return NextResponse.json(
        {
          error:
            'حواله نهایی‌شده یا دارای گردش انبار و سند بهای تمام‌شده قابل حذف فیزیکی نیست. برای بازگرداندن اقلام به انبار، از تغییر وضعیت به برگشت‌خورده (RETURNED) استفاده نمایید.',
        },
        { status: 400 }
      );
    }

    // پاکسازی فایل‌های MinIO برای پیش‌نویس‌های تاییدنشده
    const filesToDelete = [
      existing.signatureUrl,
      existing.scalePhotoUrl,
      ...extractUrlsFromJson(existing.attachments),
    ];
    await deleteFilesFromMinio(filesToDelete);

    await db.delivery.delete({ where: { id: deliveryId } });
    return NextResponse.json({ success: true, message: 'پیش‌نویس تحویل با موفقیت حذف گردید.' });
  } catch (error: any) {
    console.error('Error in DELETE /deliveries:', error);
    return NextResponse.json({ error: error.message || 'خطا در حذف تحویل بار' }, { status: 500 });
  }
}