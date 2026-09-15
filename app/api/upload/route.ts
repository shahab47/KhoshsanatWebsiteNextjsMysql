// مسیر فایل: src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
// ایمپورت توابع جدید کپی و ابزارها برای پرفورمنس بالا
import { uploadToMinio, deleteFromMinio, copyInMinio, extractKeyFromUrl, checkFileExistsInMinio } from '@/lib/minio';
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

const MAX_FILE_SIZE = 250 * 1024 * 1024; 

const ALLOWED_TYPES = [
  'sliders', 'education', 'editor-media', 'general',
  'product-slider', 'categories', 'products', 'projects',
  'company_catalog', 'KSCataloge', 'payments', 'invoices', 'receipts'
];

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
  console.log("🔐 [AUTH]: شروع فرآیند احراز هویت کاربر مدیریتی...");
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return null;
    
    const user = await verifyToken(token);
    return user;
  } catch (error: any) {
    console.error('❌ [AUTH_CRITICAL_ERROR]: خطا در احراز هویت:', error.message);
    return null;
  }
}

// ============================================================================
// بخش سوم: توابع پردازش و فشرده‌سازی
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
      default: return null;
    }

    if (outputBuffer.length < buffer.length) {
      return { buffer: outputBuffer, mimeType: outputMime, wasCompressed: true, used: 'sharp' };
    }
    return null;
  } catch (err: any) { return null; }
}

async function compressWithJimp(buffer: Buffer, mimeType: string): Promise<CompressionResult | null> {
  try {
    const image = await Jimp.read(buffer);
    const maxDim = 1920;
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) image.resize({ w: maxDim });
      else image.resize({ h: maxDim });
    }

    const outputBuffer = await image.getBuffer(JimpMime.jpeg, { quality: 75 });
    const wasCompressed = outputBuffer.length < buffer.length;
    
    return { buffer: outputBuffer, mimeType: JimpMime.jpeg, wasCompressed, used: 'jimp' };
  } catch (err: any) { return null; }
}

async function compressImageBuffer(buffer: Buffer, mimeType: string): Promise<CompressionResult> {
  try {
    if (!mimeType.startsWith('image/') || buffer.length < 500 * 1024) {
      return { buffer, mimeType, wasCompressed: false, used: 'none' };
    }
    const sharpResult = await compressWithSharp(buffer, mimeType);
    if (sharpResult) return sharpResult;
    const jimpResult = await compressWithJimp(buffer, mimeType);
    if (jimpResult) return jimpResult;

    return { buffer, mimeType, wasCompressed: false, used: 'none' };
  } catch (managerErr: any) {
    return { buffer, mimeType, wasCompressed: false, used: 'none' };
  }
}

function validateFile(file: File | null, type: string, customName?: string | null): string | null {
  try {
    if (!file) return 'فایلی ارسال نشده است.';
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'نوع فایل نامعتبر است.';
    if (file.size > MAX_FILE_SIZE) return `حجم فایل بیشتر از سقف مجاز است.`;
    if (!ALLOWED_TYPES.includes(type)) return 'مسیر ذخیره‌سازی نامعتبر است.';
    if (customName && !CUSTOM_NAME_REGEX.test(customName)) return 'نام سفارشی نامعتبر است.';
    return null;
  } catch (valErr: any) { return "خطای داخلی سیستم."; }
}

// ============================================================================
// متد GET (ایمیج پروکسی امنیتی)
// ============================================================================

const hexToBuffer = (hex: string): Buffer => Buffer.from(hex, 'hex');
const urlSafeBase64 = (buffer: Buffer): string => buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const w = searchParams.get('w') || '0';
    const q = searchParams.get('q') || '75';

    if (!url) return new NextResponse('URL missing', { status: 400 });

    // اعتبارسنجی دقیق URL و جلوگیری از حملات SSRF و Open Redirect
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new NextResponse('Invalid protocol', { status: 400 });
    }

    // مسدودسازی آدرس‌های داخلی و خصوصی (SSRF Protection)
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivate = 
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (isPrivate && !process.env.ALLOW_LOCAL_IMGPROXY) {
      return new NextResponse('Forbidden internal address', { status: 403 });
    }

    // اعتبارسنجی پسوند فایل فقط روی pathname (نه query string)
    if (!/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(parsedUrl.pathname)) {
      return new NextResponse('Invalid image format', { status: 400 });
    }
    
    const key = process.env.IMGPROXY_KEY;
    const salt = process.env.IMGPROXY_SALT;
    const imgproxyHost = process.env.IMGPROXY_URL;
    
    if (!key || !salt || !imgproxyHost) {
      return new NextResponse('Image proxy not configured', { status: 503 });
    }
    
    const encodedUrl = urlSafeBase64(Buffer.from(url));
    const path = `/rs:fill:${w}:0:0/q:${q}/${encodedUrl}`;
    const hmac = crypto.createHmac('sha256', hexToBuffer(key));
    hmac.update(hexToBuffer(salt));
    hmac.update(path);
    const signature = urlSafeBase64(hmac.digest());
    const resultUrl = `${imgproxyHost}/${signature}${path}`;
    
    try {
      const response = await fetch(resultUrl);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const blob = await response.arrayBuffer();
      return new NextResponse(blob, { 
        headers: { 
          'Content-Type': response.headers.get('Content-Type') || 'image/webp', 
          'Cache-Control': 'public, max-age=31536000, immutable' 
        } 
      });
    } catch (e: any) { 
      return new NextResponse('Image fetch failed', { status: 502 }); 
    }
  } catch (globalGetErr: any) { return new NextResponse('Internal Server Error', { status: 500 }); }
}

// ============================================================================
// متد POST (آپلود با احراز هویت و فشرده‌سازی)
// ============================================================================

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ success: false, message: 'لطفاً لاگین کنید.' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err: any) {
      return NextResponse.json({ success: false, message: 'خطا در دریافت فایل.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'general';
    const folder = (formData.get('folder') as string) || type; 
    const customName = formData.get('customName') as string | null;
    const skipCompression = formData.get('skipCompression') === 'true';

    const typeToValidate = ALLOWED_TYPES.includes(folder) ? folder : type;
    const validationError = validateFile(file, typeToValidate, customName);
    if (validationError) return NextResponse.json({ success: false, message: validationError }, { status: 400 });

    const validFile = file!;
    const fileArrayBuffer = await validFile.arrayBuffer();
    let currentBuffer = Buffer.from(fileArrayBuffer);
    
    let finalMimeType = validFile.type;
    let finalExtension = validFile.name.split('.').pop() || 'bin';
    let wasCompressed = false;
    let compressionRatio = 0;
    let toolUsed: 'sharp' | 'jimp' | 'none' = 'none';
    const originalSize = currentBuffer.length;

    try {
      if (!skipCompression && finalMimeType.startsWith('image/')) {
        const compressed = await compressImageBuffer(currentBuffer, finalMimeType);
        currentBuffer = Buffer.from(compressed.buffer);
        finalMimeType = compressed.mimeType;
        wasCompressed = compressed.wasCompressed;
        toolUsed = compressed.used;
        
        if (wasCompressed && originalSize > 0) compressionRatio = ((originalSize - currentBuffer.length) / originalSize) * 100;
        
        if (finalMimeType === 'image/jpeg') finalExtension = 'jpg';
        else if (finalMimeType === 'image/webp') finalExtension = 'webp';
        else if (finalMimeType === 'image/png') finalExtension = 'png';
        else if (finalMimeType === 'image/gif') finalExtension = 'gif';
      }
    } catch (compressLoopError: any) {}

    let uniqueName: string;
    if (customName) {
      const cleanCustomName = customName.replace(/\.[^/.]+$/, "");
      uniqueName = `${cleanCustomName}.${finalExtension}`;
    } else {
      const dotIndex = validFile.name.lastIndexOf('.');
      const baseName = (dotIndex !== -1 ? validFile.name.substring(0, dotIndex) : validFile.name).replace(/\s+/g, '-') || 'file';
      uniqueName = `${Date.now()}-${baseName}.${finalExtension}`;
    }

    let fileUrl = await uploadToMinio(currentBuffer, uniqueName, folder, finalMimeType);
    
    let successMessage = wasCompressed 
      ? `فایل آپلود و فشرده شد (کاهش: ${Math.round(compressionRatio)}٪).`
      : 'فایل با موفقیت آپلود شد.';

    return NextResponse.json({
      success: true, url: fileUrl, originalSize, finalSize: currentBuffer.length,
      compressionRatio: Math.round(compressionRatio), wasCompressed, usedTool: toolUsed, message: successMessage
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: `خطای سرور: ${error.message}` }, { status: 500 });
  }
}

// ============================================================================
// متد PUT (تغییر نام فوق سریع فایل بدون دانلود بافر)
// ============================================================================

export async function PUT(request: Request): Promise<NextResponse> {
  console.log("🔄 [PUT_ROUTE]: درخواست تغییر نام یا جابجایی فایل دریافت شد.");
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    let body: any;
    try { body = await request.json(); } 
    catch (jsonErr) { return NextResponse.json({ success: false, message: 'بدنه درخواست نامعتبر است.' }, { status: 400 }); }

    const { oldUrl, targetName, folder } = body;
    
    if (!oldUrl || !targetName) {
      return NextResponse.json({ success: false, message: 'اطلاعات ارسالی (لینک یا نام هدف) ناقص است.' }, { status: 400 });
    }

    // 1. استخراج کلید (Key) منبع از URL
    const sourceKey = extractKeyFromUrl(oldUrl);
    if (!sourceKey) {
      return NextResponse.json({ success: false, message: 'آدرس فایل قبلی (منبع) نامعتبر است و قابل استخراج نیست.' }, { status: 400 });
    }

    // 2. ساخت کلید مسیر جدید
    const targetFolder = folder || 'KSCataloge';
    const destinationKey = `${targetFolder}/${targetName}`;

    // 3. اگر مسیر جدید با قدیم فرق دارد
    if (sourceKey !== destinationKey) {
      
      // الف) بررسی تداخل و بک‌آپ گیری هوشمند (بدون دانلود)
      const fileExists = await checkFileExistsInMinio(destinationKey);
      if (fileExists) {
        console.log(`ℹ️ [PUT_INFO]: فایلی با نام "${targetName}" وجود دارد. در حال ساخت بک‌آپ سریع S3...`);
        const nameWithoutExt = targetName.substring(0, targetName.lastIndexOf('.'));
        const ext = targetName.substring(targetName.lastIndexOf('.'));
        const backupName = `${nameWithoutExt}-backup-${Date.now()}${ext}`;
        const backupKey = `${targetFolder}/${backupName}`;
        
        // کپی سریع بک‌آپ
        await copyInMinio(destinationKey, backupKey);
      }

      // ب) کپی اصلی فایل به نام جدید (درایو به درایو روی مینیو)
      console.log(`🚀 [PUT_SPEED]: شروع فرآیند کپی S3 برای تغییر نام از "${sourceKey}" به "${destinationKey}"`);
      const newUrl = await copyInMinio(sourceKey, destinationKey);

      // ج) پاک کردن فایل با نام اولیه (حالت Move)
      await deleteFromMinio(oldUrl);

      return NextResponse.json({ 
        success: true, 
        url: newUrl, 
        message: 'فایل با سرعت بسیار بالا و بدون مصرف رمِ سرور تغییر نام پیدا کرد.' 
      });
    }

    return NextResponse.json({ success: true, url: oldUrl, message: 'نام جدید با نام قدیم یکسان است.' });

  } catch (error: any) {
    console.error('❌❌❌ [PUT_ROUTE_CRITICAL_ERROR]: خطا در متد ویرایش:', error.message);
    return NextResponse.json({ success: false, message: `خطا در سیستم: ${error.message}` }, { status: 500 });
  }
}

// ============================================================================
// متد DELETE (حذف فایل)
// ============================================================================

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let url = searchParams.get('url');

    if (!url) {
      try {
        const body = await request.json();
        url = body.url;
      } catch (e) {}
    }

    if (!url) return NextResponse.json({ success: false, message: 'آدرس فایل الزامی است' }, { status: 400 });

    try {
      await deleteFromMinio(url);
    } catch (s3DelErr: any) { throw s3DelErr; }

    return NextResponse.json({ success: true, message: 'فایل حذف شد' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'خطا در سیستم حذف' }, { status: 500 });
  }
}