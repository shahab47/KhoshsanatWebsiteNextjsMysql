import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

// تابع کمکی برای حذف فیزیکی فایل از سرور
async function deleteFileSafe(fileUrl: string) {
  if (!fileUrl) return;
  try {
    const filePath = path.join(process.cwd(), 'public', fileUrl);
    // بررسی امنیتی برای جلوگیری از پاک شدن فایل‌های خارج از پوشه آپلود
    if (filePath.includes(path.join(process.cwd(), 'public', 'uploads'))) {
      await unlink(filePath);
    }
  } catch (e) {
    // در صورتی که فایل از قبل پاک شده باشد، خطا نمی‌گیریم
  }
}

// متد DELETE برای پاک کردن اسلاید از دیتابیس و فایل آن از سرور
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ۱. استخراج و await کردن پارامترها (استاندارد Next.js 15)
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    // ۲. دریافت اطلاعات اسلاید از دیتابیس برای داشتن آدرس فایل
    // توجه: اگر نام مدل شما در دیتابیس چیزی غیر از slide است (مثلاً slider)، آن را اصلاح کنید
    const slide = await db.slide.findUnique({
      where: { id }
    });
    
    if (!slide) {
      return NextResponse.json({ error: 'اسلاید مورد نظر یافت نشد' }, { status: 404 });
    }

    // ۳. حذف فیزیکی تصویر از پوشه سرور
    if (slide.imageUrl) {
      await deleteFileSafe(slide.imageUrl);
    }

    // ۴. حذف رکورد از دیتابیس
    await db.slide.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("خطا در حذف اسلاید:", error);
    return NextResponse.json({ error: 'خطا در حذف اسلاید' }, { status: 500 });
  }
}