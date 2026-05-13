import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { uploadToMinio, deleteFromMinio } from '@/lib/minio';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// اعتبارسنجی احراز هویت
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

// GET: دریافت همه لوگوها از دیتابیس (آدرس‌های Minio)
export async function GET() {
  try {
    const logos = await db.logo.findMany();
    const logoMap = logos.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr.url; // url همان آدرس Minio است
      return acc;
    }, {});
    return NextResponse.json(logoMap);
  } catch (error) {
    console.error('Error fetching logos:', error);
    return NextResponse.json({ error: 'خطا در دریافت لوگوها' }, { status: 500 });
  }
}

// POST: آپلود لوگو در Minio
export async function POST(request: NextRequest) {
  try {
    // بررسی احراز هویت (اختیاری، اما پیشنهادی برای امنیت)
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'لطفاً وارد حساب کاربری خود شوید.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // main, en, main-white, favicon, ...

    if (!file || !type) {
      return NextResponse.json({ error: 'فایل یا نوع لوگو ارسال نشده است' }, { status: 400 });
    }

    // محدودیت‌های ساده برای لوگو
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'فرمت فایل مجاز نیست (JPEG, PNG, WEBP, SVG)' }, { status: 400 });
    }

    // حذف لوگوی قدیمی (اگر وجود داشته باشد) از Minio و دیتابیس
    const existing = await db.logo.findUnique({ where: { type } });
    if (existing) {
      // حذف فایل از Minio
      await deleteFromMinio(existing.url).catch(err => console.error('Delete old logo error:', err));
      // حذف رکورد دیتابیس
      await db.logo.delete({ where: { type } });
    }

    // آماده‌سازی فایل برای آپلود در Minio
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // استخراج پسوند و ساخت نام منحصربه‌فرد
    const originalName = file.name;
    const extension = originalName.split('.').pop() || 'png';
    const fileName = `logo-${type}-${Date.now()}.${extension}`;
    const folder = 'logos'; // پوشه در bucket
    
    // آپلود در Minio (تابع uploadToMinio باید مسیر کامل برگرداند)
    // فرض می‌کنیم uploadToMinio قبلاً تعریف شده و آدرس نهایی (مثلاً /api/storage/...) را برمی‌گرداند
    const fileUrl = await uploadToMinio(buffer, fileName, folder, file.type);
    
    // ذخیره آدرس در دیتابیس
    const newLogo = await db.logo.create({
      data: { type, url: fileUrl }
    });

    return NextResponse.json({ success: true, url: fileUrl, type });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'خطا در آپلود لوگو به Minio' }, { status: 500 });
  }
}

// DELETE: حذف لوگو از Minio و دیتابیس
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'لطفاً وارد حساب کاربری شوید.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (!type) return NextResponse.json({ error: 'نوع لوگو مشخص نشده است' }, { status: 400 });

    const existing = await db.logo.findUnique({ where: { type } });
    if (!existing) {
      return NextResponse.json({ success: true, message: 'لوگو قبلاً حذف شده بود' });
    }

    // حذف از Minio
    await deleteFromMinio(existing.url).catch(err => console.error('Delete from Minio error:', err));
    // حذف از دیتابیس
    await db.logo.delete({ where: { type } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'خطا در حذف لوگو' }, { status: 500 });
  }
}