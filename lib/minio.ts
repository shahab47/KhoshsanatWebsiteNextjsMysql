import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ۱. تنظیمات اولیه اتصال
// پورت ۹۰۰۰ برای عملیات API و پورت ۹۰۰۱ برای پنل مدیریت استفاده می‌شود.
const endpoint = "http://45.149.78.107:9000";
const bucketName = process.env.MINIO_BUCKET_NAME || "khoshsanat-media";

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: endpoint,
  forcePathStyle: true, 
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
});

/**
 * آپلود فایل به MinIO
 * @param fileBuffer محتوای فایل به صورت بافر
 * @param fileName نام فایل (مثلاً image.jpg)
 * @param folderName نام پوشه (مثلاً products)
 * @param mimeType نوع فایل (مثلاً image/jpeg)
 */
export async function uploadToMinio(fileBuffer: Buffer, fileName: string, folderName: string, mimeType: string) {
  // ساخت مسیر: folder/filename
  const fullPath = `${folderName}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fullPath,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    
    // بازگرداندن آدرس کامل برای ذخیره در دیتابیس
    // خروجی: http://45.149.78.107:9000/khoshsanat-media/products/image.jpg
    return `${endpoint}/${bucketName}/${fullPath}`;
  } catch (error) {
    console.error("خطا در آپلود فایل به MinIO:", error);
    throw error;
  }
}

/**
 * حذف فایل از MinIO بر اساس آدرس URL ذخیره شده
 * @param fileUrl آدرس کامل فایل که در دیتابیس ذخیره شده بود
 */
export async function deleteFromMinio(fileUrl: string) {
  if (!fileUrl) return;

  try {
    // استخراج Key (مسیر فایل) از کل URL
    // منطق: حذف بخش ابتدایی آدرس تا بعد از نام باکت
    const urlPattern = `${endpoint}/${bucketName}/`;
    const fileKey = fileUrl.replace(urlPattern, "");

    if (fileKey === fileUrl) {
        console.error("فرمت آدرس فایل برای حذف معتبر نیست");
        return;
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("خطا در حذف فایل از MinIO:", error);
  }
}