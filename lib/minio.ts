// مسیر فایل: src/lib/minio.ts
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

console.log("----------------------------------------------------------------------");
console.log("⚙️ [MINIO_INIT]: در حال مقداردهی اولیه پیکربندی متمرکز S3 / MinIO...");
console.log("----------------------------------------------------------------------");

const isDev = process.env.NODE_ENV === 'development';

// تمامی اطلاعات از .env خوانده می‌شود
const endpointFromEnv = process.env.MINIO_ENDPOINT || "127.0.0.1:9000";
const [host, port] = endpointFromEnv.split(':');
const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
const minioEndpoint = `${protocol}://${host}:${port}`;
export const bucketName = process.env.MINIO_BUCKET_NAME || "khoshsanat-media";

export const publicBaseUrl = isDev
  ? `http://${host}:${port}`
  : (process.env.NEXT_PUBLIC_SITE_URL || "https://khoshsanat.ir");

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: minioEndpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
});

// ================================================================
// ۱. ابزار کمکی: استخراج هوشمند کلید (Key) فایل از هر نوع URL یا مسیر
// ================================================================
export function extractKeyFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const cleanUrl = fileUrl.trim();
  if (!cleanUrl) return null;

  try {
    const targetSegment = `/${bucketName}/`;
    
    // الف) اگر حاوی نام باکت باشد
    if (cleanUrl.includes(targetSegment)) {
      const afterBucket = cleanUrl.split(targetSegment)[1];
      if (afterBucket) {
        const withoutQuery = afterBucket.split('?')[0].split('#')[0];
        return decodeURIComponent(withoutQuery);
      }
    }

    // ب) اگر با URL استاندارد شروع شده باشد
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const parsedUrl = new URL(cleanUrl);
      const pathname = parsedUrl.pathname;
      if (pathname.includes(targetSegment)) {
        const afterBucket = pathname.split(targetSegment)[1];
        return decodeURIComponent(afterBucket);
      }
    }

    // ج) اگر کلید مستقیم پاس داده شده باشد (بدون باکت اما دارای فرمت پوشه/فایل)
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/')) {
      const withoutQuery = cleanUrl.split('?')[0].split('#')[0];
      return decodeURIComponent(withoutQuery);
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ================================================================
// ۲. بررسی معتبر بودن آدرس فایل متعلق به باکت MinIO
// ================================================================
export function isValidMinioUrl(fileUrl?: string | null): boolean {
  return extractKeyFromUrl(fileUrl) !== null;
}

// ================================================================
// ۳. قالب‌بندی آدرس عمومی بر اساس محیط (Dev / Prod)
// ================================================================
export function formatMinioUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  return isDev 
    ? `${publicBaseUrl}/${bucketName}/${cleanKey}`
    : `${publicBaseUrl.replace(/\/$/, '')}/minio/${bucketName}/${cleanKey}`;
}

// ================================================================
// ۴. استخراج تمام تصاویر MinIO از داخل متون غنی و کدهای HTML
// ================================================================
export function extractImagesFromHtml(html?: string | null): string[] {
  if (!html || typeof html !== 'string') return [];
  const urls: string[] = [];
  
  // استخراج از تگ‌های <img>
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && isValidMinioUrl(src) && !urls.includes(src)) {
      urls.push(src);
    }
  }

  // استخراج از تگ‌های <a> در صورت اشاره به فایل‌های MinIO (مانند PDF کاتالوگ)
  const aRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  while ((match = aRegex.exec(html)) !== null) {
    const href = match[1];
    if (href && isValidMinioUrl(href) && !urls.includes(href)) {
      urls.push(href);
    }
  }

  return urls;
}

// ================================================================
// ۵. استخراج تمام آدرس‌های MinIO از داخل ساختارهای JSON (گالری، پیوست‌ها و ...)
// ================================================================
export function extractUrlsFromJson(jsonValue?: any): string[] {
  if (!jsonValue) return [];
  const urls: string[] = [];

  const traverse = (val: any) => {
    if (!val) return;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          traverse(parsed);
          return;
        } catch {}
      }
      if (isValidMinioUrl(trimmed) && !urls.includes(trimmed)) {
        urls.push(trimmed);
      }
    } else if (Array.isArray(val)) {
      val.forEach(item => traverse(item));
    } else if (typeof val === 'object') {
      // فیلدهای محتمل حاوی آدرس فایل
      const targetKeys = ['url', 'imageUrl', 'catalogUrl', 'attachmentUrl', 'signatureUrl', 'path', 'src', 'href'];
      for (const [k, v] of Object.entries(val)) {
        if (targetKeys.includes(k) && typeof v === 'string' && isValidMinioUrl(v)) {
          if (!urls.includes(v)) urls.push(v);
        } else {
          traverse(v);
        }
      }
    }
  };

  traverse(jsonValue);
  return urls;
}

// ================================================================
// ۶. بررسی سریع وجود یک فایل در مینیو (بدون دانلود بدنه فایل)
// ================================================================
export async function checkFileExistsInMinio(fileKey: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: bucketName, Key: fileKey });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

// ================================================================
// ۷. کپی/تغییر نام فوق‌سریع فایل داخل خود سرور S3 (بدون مصرف RAM)
// ================================================================
export async function copyInMinio(sourceKey: string, destinationKey: string) {
  console.log(`🔄 [S3_COPY_FUNC]: در حال کپی فیزیکی از "${sourceKey}" به "${destinationKey}" در داخل S3...`);
  const copySource = encodeURI(`${bucketName}/${sourceKey}`);

  const command = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: copySource,
    Key: destinationKey,
  });

  try {
    await s3Client.send(command);
    console.log(`✅ [S3_COPY_SUCCESS]: عملیات کپی انجام شد.`);
    return formatMinioUrl(destinationKey);
  } catch (error: any) {
    console.error("❌ [S3_COPY_ERROR]: خطا در کپی سریع S3:", error.message);
    throw error;
  }
}

// ================================================================
// ۸. آپلود فایل در باکت MinIO
// ================================================================
export async function uploadToMinio(fileBuffer: Buffer, fileName: string, folderName: string, mimeType: string) {
  const cleanFolder = folderName.replace(/^\/+|\/+$/g, '');
  const cleanFileName = fileName.replace(/^\/+/, '');
  const fullPath = cleanFolder ? `${cleanFolder}/${cleanFileName}` : cleanFileName;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fullPath,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    return formatMinioUrl(fullPath);
  } catch (error: any) {
    console.error("❌❌❌ [UPLOAD_FUNC_CRITICAL_ERROR]: ", error.message);
    throw error;
  }
}

// ================================================================
// ۹. حذف تکی فایل از MinIO با قابلیت هندل انواع آدرس
// ================================================================
export async function deleteFromMinio(fileUrl?: string | null) {
  if (!fileUrl) return;

  try {
    const fileKey = extractKeyFromUrl(fileUrl);
    if (!fileKey) return;

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    await s3Client.send(command);
    console.log(`✅ [DELETE_FUNC_SUCCESS]: فایل "${fileKey}" از MinIO حذف شد.`);
  } catch (error: any) {
    console.error(`❌ [DELETE_FUNC_ERROR] خطا در حذف فایل "${fileUrl}":`, error.message);
  }
}

// ================================================================
// ۱۰. حذف گروهی و بهینه فایل‌ها از MinIO (Batch Delete)
// ================================================================
export async function deleteFilesFromMinio(urlsOrKeys: (string | null | undefined)[]) {
  if (!urlsOrKeys || urlsOrKeys.length === 0) return;

  const validKeys = Array.from(new Set(
    urlsOrKeys
      .map(u => extractKeyFromUrl(u))
      .filter((k): k is string => k !== null && k.length > 0)
  ));

  if (validKeys.length === 0) return;

  // حذف در دسته‌های ۱۰۰۰ تایی بر اساس استاندارد S3
  const chunkSize = 1000;
  for (let i = 0; i < validKeys.length; i += chunkSize) {
    const chunk = validKeys.slice(i, i + chunkSize);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: chunk.map(Key => ({ Key })),
          Quiet: true,
        },
      });
      await s3Client.send(command);
      console.log(`✅ [BATCH_DELETE_SUCCESS]: تعداد ${chunk.length} فایل از MinIO حذف گردید.`);
    } catch (error: any) {
      console.error(`❌ [BATCH_DELETE_ERROR]: خطا در حذف گروهی فایل‌ها:`, error.message);
      // تلاش مجدد تکی در صورت خطای گروهی
      for (const singleKey of chunk) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: singleKey }));
        } catch (singleErr) {}
      }
    }
  }
}

// ================================================================
// ۱۱. پاکسازی تفاضلی فایل‌های حذف شده یا تغییر یافته (Diff Cleanup)
// ================================================================
export async function cleanupRemovedFiles(
  oldUrls: (string | null | undefined)[], 
  newUrls: (string | null | undefined)[]
) {
  const oldKeys = oldUrls.map(u => extractKeyFromUrl(u)).filter((k): k is string => k !== null);
  const newKeys = new Set(newUrls.map(u => extractKeyFromUrl(u)).filter((k): k is string => k !== null));

  const removedKeys = oldKeys.filter(k => !newKeys.has(k));
  if (removedKeys.length > 0) {
    console.log(`🧹 [CLEANUP_REMOVED_FILES]: در حال پاکسازی ${removedKeys.length} فایل جایگزین شده / حذف شده از MinIO...`);
    await deleteFilesFromMinio(removedKeys);
  }
}

// ================================================================
// ۱۲. دریافت لیست آبجکت‌ها و پوشه‌ها در MinIO
// ================================================================
export async function listMinioObjects(prefix: string = '', recursive: boolean = false): Promise<any[]> {
  const objects: any[] = [];
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/',
    });
    const response = await s3Client.send(command);

    if (!recursive && response.CommonPrefixes) {
      response.CommonPrefixes.forEach(p => {
        if (p.Prefix) objects.push({ prefix: p.Prefix });
      });
    }

    if (response.Contents) {
      response.Contents.forEach(c => {
        if (c.Key && c.Key !== prefix) {
          objects.push({
            name: c.Key,
            size: c.Size,
            lastModified: c.LastModified,
            url: formatMinioUrl(c.Key),
          });
        }
      });
    }
    return objects;
  } catch (error: any) {
    throw error;
  }
}

// ================================================================
// ۱۳. موتور اسکن جامع دیتابیس: استخراج تمام URLهای فعال فایل‌ها در کل پروژه
// ================================================================
export async function getAllDatabaseFileUrls(): Promise<string[]> {
  const activeFileUrls = new Set<string>();
  const targetFieldNames = [
    'imageUrl', 'catalogUrl', 'gallery', 'media', 'url', 
    'attachmentUrl', 'signatureUrl', 'attachments', 'content', 'description', 'value'
  ];

  try {
    const models = Prisma.dmmf.datamodel.models;

    for (const model of models) {
      const modelTargetFields = model.fields.filter(f => targetFieldNames.includes(f.name));
      if (modelTargetFields.length === 0) continue;

      const selectQuery: Record<string, boolean> = {};
      modelTargetFields.forEach(f => { selectQuery[f.name] = true; });
      const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

      // @ts-ignore
      if (typeof prisma[delegateName]?.findMany !== 'function') continue;

      // @ts-ignore
      const records = await prisma[delegateName].findMany({ select: selectQuery });

      records.forEach((record: any) => {
        modelTargetFields.forEach(field => {
          const value = record[field.name];
          if (!value) return;

          // ۱. فیلدهای متنی ساده یا آدرس تکی
          if (typeof value === 'string') {
            // اگر محتوای HTML یا متن طولانی باشد
            if (field.name === 'content' || field.name === 'description' || value.includes('<img')) {
              const htmlImages = extractImagesFromHtml(value);
              htmlImages.forEach(u => activeFileUrls.add(u));
            }

            // اگر رشته JSON باشد
            if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
              const jsonUrls = extractUrlsFromJson(value);
              jsonUrls.forEach(u => activeFileUrls.add(u));
            } else if (isValidMinioUrl(value)) {
              activeFileUrls.add(value);
            }
          }
          // ۲. فیلدهای آرایه یا آبجکت JSON
          else if (typeof value === 'object') {
            const jsonUrls = extractUrlsFromJson(value);
            jsonUrls.forEach(u => activeFileUrls.add(u));
          }
        });
      });
    }
  } catch (error: any) {
    console.error("❌ [DB_SCAN_ERROR]: خطا در اسکن کامل فایل‌های دیتابیس:", error.message);
  }

  return Array.from(activeFileUrls);
}