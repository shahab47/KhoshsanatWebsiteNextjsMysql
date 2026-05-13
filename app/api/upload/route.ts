import { NextRequest, NextResponse } from 'next/server';
import { uploadToMinio, deleteFromMinio } from '@/lib/minio';
import crypto from 'crypto';
import { Jimp, JimpMime } from 'jimp';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// ============================================================================
// بخش اول: متغیرهای امنیتی و اعتبارسنجی
// ============================================================================

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain'
];

// افزایش محدودیت حجم به ۲۵۰ مگابایت برای فایل‌های سنگین مثل کاتالوگ‌ها
const MAX_FILE_SIZE = 250 * 1024 * 1024; 

// اضافه شدن تایپ‌ها و پوشه‌های اختصاصی کاتالوگ
const ALLOWED_TYPES = [
  'sliders', 'education', 'editor-media', 'general',
  'product-slider', 'categories', 'products', 'projects',
  'company_catalog', 'KSCataloge'
];

// تغییر رجکس برای پشتیبانی از خط تیره، نقطه، فاصله و حروف فارسی در نام کاتالوگ‌ها
const CUSTOM_NAME_REGEX = /^[\w\-\s\.\u0600-\u06FF]+$/;

interface CompressionResult {
  buffer: Buffer;
  mimeType: string;
  wasCompressed: boolean;
  used: 'sharp' | 'jimp' | 'none';
}

// ============================================================================
// بخش دوم: توابع احراز هویت
// ============================================================================

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return null;
    const user = await verifyToken(token);
    return user;
  } catch (error) {
    console.error('Authentication Error:', error);
    return null;
  }
}

// ============================================================================
// بخش سوم: توابع پردازش و فشرده‌سازی (Sharp -> Jimp -> Fallback)
// ============================================================================

async function compressWithSharp(buffer: Buffer, mimeType: string): Promise<CompressionResult | null> {
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;

    const maxDim = 1920;
    const pipeline = sharp(buffer).resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
    
    let outputBuffer: Buffer;
    let outputMime = mimeType;

    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        outputBuffer = await pipeline.jpeg({ quality: 75 }).toBuffer();
        break;
      case 'image/png':
        outputBuffer = await pipeline.jpeg({ quality: 75 }).toBuffer();
        outputMime = 'image/jpeg';
        break;
      case 'image/webp':
        outputBuffer = await pipeline.webp({ quality: 75 }).toBuffer();
        break;
      case 'image/gif':
        outputBuffer = await pipeline.toBuffer();
        break;
      default:
        return null;
    }

    if (outputBuffer.length < buffer.length) {
      return { buffer: outputBuffer, mimeType: outputMime, wasCompressed: true, used: 'sharp' };
    }
    return null;
  } catch (err) {
    console.warn('[Sharp] Compression failed. Escalating to Jimp...', err instanceof Error ? err.message : '');
    return null;
  }
}

// تابع Jimp اصلاح شده (همه خروجی‌ها به JPEG تبدیل می‌شوند)
async function compressWithJimp(buffer: Buffer, mimeType: string): Promise<CompressionResult | null> {
  try {
    const image = await Jimp.read(buffer);
    const maxDim = 1920;

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        image.resize({ w: maxDim });
      } else {
        image.resize({ h: maxDim });
      }
    }

    // همه تصاویر به JPEG با کیفیت ۷۵ تبدیل می‌شوند
    const outputBuffer = await image.getBuffer(JimpMime.jpeg, { quality: 75 });
    const wasCompressed = outputBuffer.length < buffer.length;
    
    return {
      buffer: outputBuffer,
      mimeType: JimpMime.jpeg,
      wasCompressed,
      used: 'jimp'
    };
  } catch (err) {
    console.warn('[Jimp] Compression failed. Proceeding with original file:', err instanceof Error ? err.message : '');
    return null;
  }
}

async function compressImageBuffer(buffer: Buffer, mimeType: string): Promise<CompressionResult> {
  if (!mimeType.startsWith('image/') || buffer.length < 500 * 1024) {
    return { buffer, mimeType, wasCompressed: false, used: 'none' };
  }

  const sharpResult = await compressWithSharp(buffer, mimeType);
  if (sharpResult) return sharpResult;

  const jimpResult = await compressWithJimp(buffer, mimeType);
  if (jimpResult) return jimpResult;

  return { buffer, mimeType, wasCompressed: false, used: 'none' };
}

function validateFile(file: File | null, type: string, customName?: string | null): string | null {
  if (!file) return 'فایلی ارسال نشده است.';
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'نوع فایل نامعتبر است.';
  if (file.size > MAX_FILE_SIZE) return `حجم فایل بیشتر از ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} مگابایت است. سرور نمی‌تواند این فایل را بپذیرد.`;
  if (!ALLOWED_TYPES.includes(type)) return 'دسته‌بندی یا مسیر ذخیره‌سازی نامعتبر است.';
  if (customName && !CUSTOM_NAME_REGEX.test(customName)) return 'نام سفارشی شامل کاراکترهای غیرمجاز است.';
  return null;
}

// ============================================================================
// متد GET (بهینه‌سازی تصاویر با Imgproxy)
// ============================================================================

const hexToBuffer = (hex: string): Buffer => Buffer.from(hex, 'hex');
const urlSafeBase64 = (buffer: Buffer): string => buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const w = searchParams.get('w') || '0';
  const q = searchParams.get('q') || '75';

  if (!url) return new NextResponse('URL missing', { status: 400 });
  
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  if (!isImage) return NextResponse.redirect(url);
  
  const key = process.env.IMGPROXY_KEY;
  const salt = process.env.IMGPROXY_SALT;
  const imgproxyHost = process.env.IMGPROXY_URL;
  
  if (!key || !salt || !imgproxyHost) return NextResponse.redirect(url);
  
  const encodedUrl = urlSafeBase64(Buffer.from(url));
  const path = `/rs:fill:${w}:0:0/q:${q}/${encodedUrl}`;
  const hmac = crypto.createHmac('sha256', hexToBuffer(key));
  hmac.update(hexToBuffer(salt));
  hmac.update(path);
  const signature = urlSafeBase64(hmac.digest());
  const resultUrl = `${imgproxyHost}/${signature}${path}`;
  
  try {
    const response = await fetch(resultUrl);
    if (!response.ok) throw new Error('Imgproxy failure');
    const blob = await response.arrayBuffer();
    return new NextResponse(blob, { headers: { 'Content-Type': response.headers.get('Content-Type') || 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch (e) {
    console.error('Imgproxy error:', e);
    return NextResponse.redirect(url);
  }
}

// ============================================================================
// متد POST (آپلود با احراز هویت و فشرده‌سازی)
// ============================================================================

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'لطفاً وارد حساب کاربری خود شوید.', message: 'لطفاً وارد حساب کاربری خود شوید.' },
        { status: 401 }
      );
    }

    // گرفتن دیتای فرم در بلاک محافظت‌شده برای کنترل خطاهای مربوط به حجم Next.js
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err: any) {
      console.error("FormData parsing error:", err);
      if (err.message?.includes('boundary') || err.message?.includes('exceeded')) {
        return NextResponse.json(
          { success: false, error: 'حجم فایل بیش از حد مجاز سرور است یا ارتباط اینترنت شما در حین آپلود قطع شد.', message: 'حجم فایل بیش از حد مجاز است.' },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'خطا در دریافت اطلاعات فایل. لطفاً صفحه را رفرش کرده و دوباره تلاش کنید.', message: 'خطا در دریافت اطلاعات فایل.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'general';
    // دریافت مسیر پوشه سفارشی (مثلاً KSCataloge) در غیر این صورت استفاده از همان type
    const folder = (formData.get('folder') as string) || type; 
    const customName = formData.get('customName') as string | null;
    const skipCompression = formData.get('skipCompression') === 'true';

    // ارزیابی بر اساس folder تا مسیرهای جدید رد نشوند
    const typeToValidate = ALLOWED_TYPES.includes(folder) ? folder : type;
    const validationError = validateFile(file, typeToValidate, customName);
    
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError, message: validationError }, { status: 400 });
    }

    const validFile = file!;
    const fileArrayBuffer = await validFile.arrayBuffer();
    let currentBuffer = Buffer.from(fileArrayBuffer);
    
    let finalMimeType = validFile.type;
    let finalExtension = validFile.name.split('.').pop() || 'bin';
    let wasCompressed = false;
    let compressionRatio = 0;
    let toolUsed: 'sharp' | 'jimp' | 'none' = 'none';
    const originalSize = currentBuffer.length;

    if (!skipCompression && finalMimeType.startsWith('image/')) {
      const compressed = await compressImageBuffer(currentBuffer, finalMimeType);
      currentBuffer = Buffer.from(compressed.buffer);
      finalMimeType = compressed.mimeType;
      wasCompressed = compressed.wasCompressed;
      toolUsed = compressed.used;
      
      if (wasCompressed && originalSize > 0) {
        compressionRatio = ((originalSize - currentBuffer.length) / originalSize) * 100;
      }
      
      if (finalMimeType === 'image/jpeg') finalExtension = 'jpg';
      else if (finalMimeType === 'image/webp') finalExtension = 'webp';
      else if (finalMimeType === 'image/png') finalExtension = 'png';
      else if (finalMimeType === 'image/gif') finalExtension = 'gif';
    }

    let uniqueName: string;
    if (customName) {
      // اگر فرانت‌اند نام سفارشی (مثل ks-cat-slug) ارسال کرد، دقیقاً همان نام + پسوند استفاده می‌شود
      uniqueName = `${customName}.${finalExtension}`;
    } else {
      // برای فایل‌های معمولی، Timestamp برای جلوگیری از تداخل اضافه می‌شود
      const baseName = validFile.name.replace(/\s+/g, '-').split('.').shift() || 'file';
      uniqueName = `${Date.now()}-${baseName}.${finalExtension}`;
    }

    // آپلود فایل در پوشه مشخص‌شده (مثلاً KSCataloge)
    const fileUrl = await uploadToMinio(currentBuffer, uniqueName, folder, finalMimeType);
    
    let successMessage = 'فایل با موفقیت آپلود شد.';
    if (wasCompressed) {
      const toolName = toolUsed === 'sharp' ? 'Sharp' : 'Jimp';
      successMessage = `فایل با موفقیت آپلود و فشرده شد (کاهش حجم: ${Math.round(compressionRatio)}٪ با ${toolName}).`;
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      originalSize: originalSize,
      finalSize: currentBuffer.length,
      compressionRatio: Math.round(compressionRatio),
      wasCompressed,
      usedTool: toolUsed,
      message: successMessage
    });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    return NextResponse.json(
      { success: false, error: `خطا در سیستم آپلود: ${message}`, message: `خطا در سیستم آپلود: ${message}` }, 
      { status: 500 }
    );
  }
}

// ============================================================================
// متد PUT (تغییر نام فایل و تنظیم به عنوان کاتالوگ استاندارد)
// ============================================================================

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'لطفاً وارد حساب کاربری خود شوید.', message: 'لطفاً وارد حساب کاربری خود شوید.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldUrl, targetName, folder } = body;
    
    if (!oldUrl || !targetName) {
      return NextResponse.json({ success: false, message: 'اطلاعات ارسالی (لینک قبلی یا نام هدف) ناقص است.' }, { status: 400 });
    }

    // 1. دریافت محتوای فایل فعلی از سرور MinIO با استفاده از URL
    const oldRes = await fetch(oldUrl);
    if (!oldRes.ok) {
      throw new Error('فایل مبدأ در سرور یافت نشد.');
    }
    const oldBuffer = Buffer.from(await oldRes.arrayBuffer());
    
    // استخراج فرمت و آدرس هدف برای بررسی وجود فایل
    const mimeType = oldRes.headers.get('content-type') || 'application/pdf';
    const urlParts = oldUrl.split('/');
    urlParts.pop(); // حذف نام فایل قبلی
    const baseUrl = urlParts.join('/');
    const targetUrl = `${baseUrl}/${targetName}`;

    // 2. بررسی اینکه آیا کاتالوگی با این نام استاندارد از قبل وجود دارد؟
    if (oldUrl !== targetUrl) {
      try {
        const checkRes = await fetch(targetUrl, { method: 'HEAD' });
        if (checkRes.ok) {
          // اگر کاتالوگ قبلی وجود داشت، آن را دانلود و با یک نام بک‌آپ ذخیره می‌کنیم تا از بین نرود
          const backupRes = await fetch(targetUrl);
          const backupBuffer = Buffer.from(await backupRes.arrayBuffer());
          // جدا کردن فرمت و اضافه کردن Timestamp
          const nameWithoutExt = targetName.substring(0, targetName.lastIndexOf('.'));
          const ext = targetName.substring(targetName.lastIndexOf('.'));
          const backupName = `${nameWithoutExt}-backup-${Date.now()}${ext}`;
          
          await uploadToMinio(backupBuffer, backupName, folder || 'KSCataloge', mimeType);
        }
      } catch (checkErr) {
        // نادیده گرفتن خطا در صورتی که فایل از قبل وجود نداشته باشد
      }
    }

    // 3. آپلود فایل در مسیر هدف با نام استاندارد (مثلاً ks-cat-slug.pdf)
    const newUrl = await uploadToMinio(oldBuffer, targetName, folder || 'KSCataloge', mimeType);

    // 4. پاک کردن فایل با نام اولیه و رندوم (برای جلوگیری از اشغال فضای سرور)
    if (oldUrl !== newUrl) {
      await deleteFromMinio(oldUrl);
    }

    return NextResponse.json({ 
      success: true, 
      url: newUrl, 
      message: 'فایل با موفقیت تغییر نام یافت و به عنوان کاتالوگ تنظیم شد.' 
    });

  } catch (error) {
    console.error('Rename/Move error:', error);
    const message = error instanceof Error ? error.message : 'خطای ناشناخته';
    return NextResponse.json(
      { success: false, error: `خطا در تغییر نام فایل: ${message}`, message: `خطا در تغییر نام فایل: ${message}` }, 
      { status: 500 }
    );
  }
}

// ============================================================================
// متد DELETE (حذف فایل)
// ============================================================================

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'لطفاً وارد حساب کاربری خود شوید.', message: 'لطفاً وارد حساب کاربری خود شوید.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, error: 'آدرس فایل الزامی است', message: 'آدرس فایل الزامی است' }, { status: 400 });

    await deleteFromMinio(url);
    return NextResponse.json({ success: true, message: 'فایل با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ success: false, error: 'خطا در حذف فایل', message: 'خطا در حذف فایل' }, { status: 500 });
  }
}