// مسیر فایل: src/app/api/products/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ======================================================
// GET – دریافت محصولات، کاتالوگ شرکت، یا لیست کاتالوگ دسته‌بندی‌ها
// ======================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // ---- دریافت کاتالوگ شرکت ----
    if (action === 'company-catalog') {
      const setting = await db.setting.findUnique({
        where: { key: 'company_catalog_url' }
      });
      return NextResponse.json({ url: setting?.value || null });
    }

    // ---- دریافت لیست کاتالوگ دسته‌بندی‌ها + کاتالوگ شرکت ----
    if (action === 'catalogs') {
      const companyCatalogSetting = await db.setting.findUnique({
        where: { key: 'company_catalog_url' }
      });
      const companyCatalogUrl = companyCatalogSetting?.value || null;

      const categoriesWithCatalogs = await db.category.findMany({
        where: {
          catalogUrl: { not: null }
        },
        select: {
          id: true,
          title: true,
          slug: true,
          catalogUrl: true
        }
      });

      return NextResponse.json({
        companyCatalogUrl,
        categories: categoriesWithCatalogs
      });
    }

    // ---- دریافت محصولات (رفتار پیش‌فرض) ----
    const subcategoryId = searchParams.get('subcategoryId');
    const where: any = { isActive: true };
    if (subcategoryId) {
      where.subcategoryId = parseInt(subcategoryId);
    }

    const products = await db.product.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("خطا در دریافت اطلاعات:", error);
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات' }, { status: 500 });
  }
}

// ======================================================
// POST – ایجاد محصول جدید یا ذخیره کاتالوگ شرکت
// ======================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ---- ذخیره کاتالوگ شرکت ----
    if (action === 'set-company-catalog') {
      const { url } = body;
      if (!url) {
        return NextResponse.json({ error: 'آدرس کاتالوگ ارسال نشده است' }, { status: 400 });
      }
      await db.setting.upsert({
        where: { key: 'company_catalog_url' },
        update: { value: url },
        create: { key: 'company_catalog_url', value: url },
      });
      return NextResponse.json({ success: true });
    }

    // ---- ایجاد محصول جدید (رفتار پیش‌فرض) ----
    const { title, slug, description, shortDesc, imageUrl, gallery, subcategoryId, order, isActive } = body;
    if (!title || !slug || !description || !imageUrl || !subcategoryId) {
      return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        title,
        slug,
        description,
        shortDesc: shortDesc || null,
        imageUrl,
        gallery: gallery || null,
        subcategoryId: parseInt(subcategoryId),
        order: order || 0,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("خطا در پردازش درخواست:", error);
    return NextResponse.json({ error: 'خطا در پردازش درخواست' }, { status: 500 });
  }
}

// ======================================================
// DELETE – حذف رکوردهای مرتبط با کاتالوگ شرکت
// ======================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // ---- حذف کاتالوگ جامع شرکت از جدول Setting ----
    if (action === 'company-catalog') {
      await db.setting.deleteMany({
        where: { key: 'company_catalog_url' }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
  } catch (error) {
    console.error("خطا در پردازش درخواست حذف:", error);
    return NextResponse.json({ error: 'خطا در حذف اطلاعات' }, { status: 500 });
  }
}