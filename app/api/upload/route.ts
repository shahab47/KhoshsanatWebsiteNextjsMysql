import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

// آپلود فایل جدید
export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    // گرفتن نوع عکس (لوگو، محصول یا اسلایدر) برای پوشه‌بندی
    const type = (data.get('type') as string) || 'general';

    if (!file) return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ساخت یک اسم کاملاً یکتا برای جلوگیری از تداخل
    const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // مسیر ذخیره‌سازی داینامیک: public/uploads/products یا public/uploads/slides
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);

    // اگر پوشه از قبل وجود نداشت، آن را بساز
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, uniqueName);
    await writeFile(filepath, buffer);

    // برگرداندن آدرس دقیق فایل با پوشه اختصاصی
    return NextResponse.json({ success: true, url: `/uploads/${type}/${uniqueName}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: 'خطا در ذخیره فایل در سرور' }, { status: 500 });
  }
}

// حذف فیزیکی فایل از سرور
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url'); // آدرس عکسی که باید پاک شود

    if (!url) return NextResponse.json({ error: 'آدرس فایل الزامی است' }, { status: 400 });

    const filePath = path.join(process.cwd(), 'public', url);

    // یک بررسی امنیتی: فقط اجازه بده فایل‌های داخل پوشه uploads پاک شوند
    if (filePath.includes(path.join(process.cwd(), 'public', 'uploads'))) {
      await unlink(filePath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // اگر فایل قبلاً پاک شده بود یا وجود نداشت، خطا نگیر و با موفقیت رد شو
    return NextResponse.json({ success: true });
  }
}