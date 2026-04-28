import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

// دریافت لیست تمام لوگوها
export async function GET() {
  try {
    const logos = await db.logo.findMany();
    // تبدیل لیست به یک شیء برای دسترسی راحت‌تر در فرانت‌-اند
    const logoMap = logos.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr.url;
      return acc;
    }, {});
    return NextResponse.json(logoMap);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت لوگوها' }, { status: 500 });
  }
}

// آپلود یا به‌روزرسانی لوگو
export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const type = data.get('type') as string; // main, en, favicon

    if (!file || !type) {
      return NextResponse.json({ error: 'فایل یا نوع لوگو ارسال نشده است' }, { status: 400 });
    }

    // ۱. بررسی و حذف فایل قدیمی در صورت وجود (برای جلوگیری از انباشت فایل)
    const existing = await db.logo.findUnique({ where: { type } });
    if (existing) {
      const oldPath = path.join(process.cwd(), 'public', existing.url);
      await unlink(oldPath).catch(() => console.log("Old file not found, skipping unlink"));
    }

    // ۲. ذخیره فایل جدید
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const extension = path.extname(file.name);
    const fileName = `logo-${type}-${Date.now()}${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logo');
    
    // اطمینان از وجود پوشه
    await mkdir(uploadDir, { recursive: true });
    
    const fullPath = path.join(uploadDir, fileName);
    await writeFile(fullPath, buffer);
    
    const relativeUrl = `/uploads/logo/${fileName}`;

    // ۳. ذخیره یا آپدیت در دیتابیس
    const logo = await db.logo.upsert({
      where: { type },
      update: { url: relativeUrl },
      create: { type, url: relativeUrl },
    });

    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطا در آپلود لوگو' }, { status: 500 });
  }
}

// حذف فیزیکی و دیتابیسی لوگو
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) return NextResponse.json({ error: 'نوع لوگو مشخص نشده است' }, { status: 400 });

    const existing = await db.logo.findUnique({ where: { type } });
    
    if (existing) {
      // حذف فیزیکی فایل از سرور
      const filePath = path.join(process.cwd(), 'public', existing.url);
      await unlink(filePath).catch(() => console.log("File not found on server"));

      // حذف رکورد از دیتابیس
      await db.logo.delete({ where: { type } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف لوگو' }, { status: 500 });
  }
}