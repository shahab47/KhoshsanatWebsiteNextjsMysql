// مسیر فایل: src/app/api/education/route.ts
import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/minio';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  console.log("🔍 [GET] [INFO]: درخواست دریافت لیست مقالات آکادمی آغاز شد...");
  try {
    console.log("📬 [GET] [DEBUG]: در حال کوئری زدن به دیتابیس Prisma برای متد findMany...");
    const articles = await db.article.findMany({ orderBy: { id: 'desc' } });
    
    console.log(`📊 [GET] [DEBUG]: تعداد ${articles.length} مقاله از دیتابیس دریافت شد. آغاز بررسی فیلد media...`);
    
    // حل خطای تایپ‌اسکریپت با مشخص کردن صریح نوع داده (any و number)
    const articlesWithMedia = articles.map((article: any, index: number) => {
      // لاگ جزییات رسانه‌های هر مقاله برای ردیابی خطاها
      if (article.media) {
        console.log(`🔹 [GET] [DEBUG] مقاله نمایه [${index}] (شناسه: ${article.id}) دارای فیلد رسانه با طول: ${Array.isArray(article.media) ? article.media.length : 'رشته/نامشخص'} است.`);
      }
      return {
        ...article,
        media: article.media || []
      };
    });

    console.log("✅ [GET] [SUCCESS]: لیست مقالات با موفقیت آماده و ارسال شد.");
    return NextResponse.json(articlesWithMedia);
  } catch (error: any) {
    console.error("❌❌❌ [GET] [CRITICAL_ERROR] [API_EDUCATION_GET_ERROR]: فرآیند متد GET با شکست مواجه شد!");
    console.error("🔹 پیام خطا:", error.message);
    console.error("🔹 جزئیات پشته خطا (Stack Trace):", error.stack);
    return NextResponse.json({ error: `خطا در دریافت: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("======================================================================");
  console.log("🚀 [POST] [START]: درخواست جدید ثبت مقاله در آکادمی (POST) دریافت شد.");
  console.log("======================================================================");

  // ------------------------------------------------------------
  // مرحله ۱: تست زنده سلامت شبکه و پینگ ارتباط به پورت API مینیو سرور
  // ------------------------------------------------------------
  console.log("📍 [POST] [مرحله ۱/۴]: آغاز اعتبارسنجی شبکه S3 Client و پینگ سرور مینیو...");
  try {
    console.log(`📡 [POST] [DEBUG]: ارسال دستور ListBucketsCommand به مینیو سرور جهت تست اتصال...`);
    const s3CheckResponse = await s3Client.send(new ListBucketsCommand({}));
    console.log("✅ [POST] [MINIO_CONNECTIVITY_SUCCESS]: ارتباط مستقیم بک‌اَند پروژه شما با موفقیت به پورت API مینیو سرور وصل شد.");
    console.log(`📊 [POST] [DEBUG]: تعداد باکت‌های در دسترس روی سرور مینیو: ${s3CheckResponse.Buckets?.length || 0}`);
  } catch (s3NetError: any) {
    console.error("❌❌❌ [POST] [MINIO_NETWORK_CRITICAL_ERROR]: ارتباط مستقیم بک‌اَند لوکال با پورت مینیو سرور برقرار نیست!");
    console.error("🔹 نام/کد خطا:", s3NetError.code || s3NetError.name);
    console.error("🔹 پیام خطا:", s3NetError.message);
    console.error("💡 [HELP]: احتمالاً فایروال لینوکس پورت 9000 را بسته است یا اطلاعات اتصال ناهمخوان است.");
    
    return NextResponse.json({ 
      error: "خطای عدم دسترسی به سرور ذخیره‌سازی رسانه. لطفاً وضعیت فایروال سرور و پورت 9000 را بررسی کنید.",
      details: s3NetError.message,
      errorCode: s3NetError.code || s3NetError.name
    }, { status: 502 });
  }

  // ------------------------------------------------------------
  // مرحله ۲: دریافت و پارس بدنه (Body) فرم ارسالی کلاینت
  // ------------------------------------------------------------
  console.log("📍 [POST] [مرحله ۲/۴]: آغاز پارس کردن بدنه درخواست JSON...");
  let body: any;
  try {
    body = await request.json();
    console.log("📦 [POST] [DEBUG] محتوای کامل آبجکت بدنه ارسالی:");
    console.log(JSON.stringify(body, null, 2));
  } catch (parseError: any) {
    console.error("❌ [POST] [ERROR] [BODY_PARSE_FAILED]: قالب دیتا ارسالی JSON معتبر نیست یا آسیب دیده است!");
    console.error("🔹 پیام خطا:", parseError.message);
    return NextResponse.json({ error: `دیتای ارسالی قالب معتبر JSON ندارد: ${parseError.message}` }, { status: 400 });
  }

  // ------------------------------------------------------------
  // مرحله ۳: استخراج متغیرها، اعتبارسنجی مقادیر و دسته‌ب بندی‌ها
  // ------------------------------------------------------------
  console.log("📍 [POST] [مرحله ۳/۴]: آغاز اعتبارسنجی منطقی فیلدها و ساختار رسانه‌ها...");
  const { title, slug, excerpt, content, category, author, readTime, imageUrl, media, isActive } = body;
  
  // بررسی فیلدهای اجباری بر اساس لاگ
  console.log(`📋 [POST] [DEBUG] مقادیر کلیدی: Title="${title}" | Slug="${slug}" | HasContent=${!!content} | HasCover=${!!imageUrl}`);
  if (!title || !slug || !content || !imageUrl) {
    console.warn("⚠️ [POST] [VALIDATION_WARN]: فیلدهای الزامی (عنوان، نامک، متن یا کاور) خالی ارسال شده‌اند.");
    return NextResponse.json({ error: 'فیلدهای ضروری کامل نیستند. لطفاً عنوان، نامک، متن اصلی و تصویر کاور را ارسال کنید.' }, { status: 400 });
  }
  
  let parsedReadTime: number | null = null;
  try {
    if (readTime !== undefined && readTime !== null && readTime !== '') {
      parsedReadTime = parseInt(readTime.toString());
      console.log(`⏱️ [POST] [DEBUG]: فیلد زمان مطالعه به عدد تبدیل شد: ${parsedReadTime}`);
    }
  } catch (timeError: any) {
    console.warn(`⚠️ [POST] [DEBUG]: خطا در تبدیل زمان مطالعه به عدد (مقدار خام: ${readTime}). مقدار null جایگزین شد.`);
  }

  // عملیات ثبت/بروزرسانی دسته بندی (Upsert) درون بلاک مستقل
  if (category && category.trim() !== '') {
    console.log(`🗂️ [POST] [DEBUG]: در حال بررسی وضعیت وجود دسته‌بندی "${category.trim()}" در دیتابیس...`);
    try {
      const categoryResult = await db.articleCategory.upsert({
        where: { title: category.trim() },
        update: {},
        create: { title: category.trim() }
      });
      console.log(`✅ [POST] [SUCCESS] [CATEGORY_UPSERT]: دسته‌بندی تایید/ایجاد شد. شناسه: ${categoryResult.id || 'موجود'}`);
    } catch (catError: any) {
      console.error(`❌ [POST] [ERROR] [CATEGORY_OPERATION_FAILED]: خطا در ساخت یا ویرایش فیلد دسته‌بندی:`, catError.message);
    }
  }

  // لاگ وضعیت آرایه رسانه‌ها قبل از ارسال به دیتابیس
  const finalMedia = Array.isArray(media) ? media : [];
  console.log(`🔗 [POST] [DEBUG]: تعداد فایلهای ارسال شده در گالری/رسانه: ${finalMedia.length} آیتم.`);
  finalMedia.forEach((m: any, idx: number) => {
    console.log(`   🔹 آیتم رسانه [${idx}] -> URL: ${m?.imageUrl || m || 'فاقد آدرس'} | حجم: ${m?.size || 'نامشخص'}`);
  });

  // ------------------------------------------------------------
  // مرحله ۴: درج نهایی در دیتابیس با متد create مدل Article
  // ------------------------------------------------------------
  console.log("📍 [POST] [مرحله ۴/۴]: تلاش برای درج نهایی سند مقاله در دیتابیس Prisma...");
  try {
    console.log("📝 [POST] [DEBUG]: ارسال دستور db.article.create به دیتابیس...");
    const article = await db.article.create({
      data: { 
        title: title.trim(), 
        slug: slug.trim().toLowerCase(), 
        excerpt: excerpt ? excerpt.trim() : null, 
        content, 
        category: category ? category.trim() : null, 
        author: author ? author.trim() : null, 
        readTime: parsedReadTime, 
        imageUrl: imageUrl, 
        media: finalMedia, // ذخیره آرایه تفکیک شده رسانه‌ها
        isActive: isActive ?? true 
      }
    });
    
    console.log("======================================================================");
    console.log(`✅ [POST] [SUCCESS] [ARTICLE_CREATED]: مقاله با موفقیت ثبت شد.`);
    console.log(`🔹 شناسه رکورد جدید: ${article.id}`);
    console.log(`🔹 عنوان مقاله ثبت شده: ${article.title}`);
    console.log("======================================================================");
    
    return NextResponse.json({ ...article, media: article.media || [] }, { status: 201 });

  } catch (error: any) {
    console.error("❌❌❌ [POST] [CRITICAL_ERROR] [API_EDUCATION_POST_DATABASE_ERROR]: خطا در لایه پایگاه داده!");
    console.error("🔹 نوع یا کد خطا از سمت DB:", error.code || error.name);
    console.error("🔹 پیام دقیق خطا:", error.message);
    if (error.code === 'P2002') {
      console.error("💡 [HELP]: خطای یکتا بودن (Unique Constraint) رخ داده است؛ احتمالاً این نامک (Slug) قبلاً ثبت شده است.");
    }
    console.error("🔹 پشته کامل خطا (Stack Trace):\n", error.stack);
    
    return NextResponse.json({ 
      error: "خطای داخلی در سطح پایگاه داده در زمان ثبت نهایی ساختار مقاله.",
      details: error.message,
      code: error.code 
    }, { status: 500 });
  }
}