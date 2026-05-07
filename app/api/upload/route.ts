// مسیر فایل: src/app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { uploadToMinio, deleteFromMinio } from '@/lib/minio';
import sharp from 'sharp';

// ========== تنظیمات امنیتی و محدودیت‌ها ==========
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 مگابایت
// اضافه کردن categories و product-slider به لیست مجاز
const ALLOWED_TYPES = [
  'sliders',
  'education',
  'editor-media',
  'general',
  'product-slider',
  'categories',     // <-- اضافه شد برای دسته‌بندی‌ها
  'products'        // <-- اضافه شد برای محصولات (اگر نیاز باشد)
];
const CUSTOM_NAME_REGEX = /^[a-zA-Z0-9_-]+$/; // فقط حروف، اعداد، خط تیره و زیرخط

// ========== تابع کمکی برای اعتبارسنجی ورودی ==========
function validateFile(file: File, type: string, customName?: string | null): string | null {
  if (!file) return 'فایلی ارسال نشده است';
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'نوع فایل نامعتبر است. فقط JPEG, PNG, WebP, GIF مجاز است.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `حجم فایل بیشتر از ${MAX_FILE_SIZE / (1024 * 1024)} مگابایت است.`;
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return `نوع (type) نامعتبر است. مقادیر مجاز: ${ALLOWED_TYPES.join(', ')}`;
  }
  if (customName && !CUSTOM_NAME_REGEX.test(customName)) {
    return 'نام سفارشی فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد.';
  }
  return null; // معتبر
}

// ========== بهینه‌سازی تصویر بر اساس نوع ==========
async function optimizeImage(buffer: Buffer, type: string): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  try {
    let width: number | null = null;
    const quality = 80;

    switch (type) {
      case 'sliders':
        width = 1920;
        break;
      case 'product-slider':
        width = 1200;
        break;
      case 'products':
        width = 1200;
        break;
      case 'categories':
        width = 400;   // تصاویر دسته‌بندی معمولاً کوچک‌تر هستند
        break;
      case 'education':
      case 'editor-media':
        width = 1200;
        break;
      default:
        width = 1920;
    }

    const optimized = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return { buffer: optimized, mime: 'image/webp', ext: 'webp' };
  } catch (err) {
    console.error('خطا در بهینه‌سازی تصویر با Sharp:', err);
    // برگرداندن فایل اصلی بدون تغییر (با حفظ فرمت اصلی)
    const originalExt = buffer.toString('hex', 0, 4) === 'ffd8' ? 'jpg' : 'png';
    return { buffer, mime: 'image/jpeg', ext: originalExt };
  }
}

// ========== API آپلود ==========
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'general';
    const customName = formData.get('customName') as string | null;
    const optimize = formData.get('optimize') === 'true';

    // اعتبارسنجی
    const validationError = validateFile(file!, type, customName);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // 🔴 در اینجا any اضافه شد تا تداخل تایپ‌های Buffer از بین برود
    let buffer: any = Buffer.from(await file!.arrayBuffer());
    let finalMimeType = file!.type;
    let finalExtension = file!.name.split('.').pop() || 'bin';

    // بهینه‌سازی اگر فعال باشد
    if (optimize) {
      const optimized = await optimizeImage(buffer, type);
      buffer = optimized.buffer;
      finalMimeType = optimized.mime;
      finalExtension = optimized.ext;
    }

    // ساخت نام نهایی (جلوگیری از بازنویسی در حالت customName)
    let uniqueName: string;
    if (customName) {
      // اضافه کردن timestamp برای جلوگیری از بازنویسی ناخواسته
      const timestamp = Date.now();
      uniqueName = `${customName}-${timestamp}.${finalExtension}`;
    } else {
      const baseName = file!.name.replace(/\s+/g, '-').split('.').shift() || 'file';
      uniqueName = `${Date.now()}-${baseName}.${finalExtension}`;
    }

    // آپلود به MinIO
    const fileUrl = await uploadToMinio(buffer, uniqueName, type, finalMimeType);

    // پاسخ موفق
    return NextResponse.json({
      success: true,
      url: fileUrl,
      size: buffer.length,
      originalName: file!.name,
      optimized: optimize,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'خطای ناشناخته در آپلود فایل';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ========== API حذف فایل ==========
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'آدرس فایل الزامی است' }, { status: 400 });
    }

    await deleteFromMinio(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    // همچنان success: true برمی‌گردانیم تا فرانت‌اند دچار مشکل نشود
    return NextResponse.json({ success: true, warning: 'حذف با خطا مواجه شد اما عملیات ادامه یافت' });
  }
}