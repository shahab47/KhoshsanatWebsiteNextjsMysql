import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// ۱. خواندن داینامیک اطلاعات از محیط
const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
const host = process.env.MINIO_ENDPOINT || "127.0.0.1";
const port = process.env.MINIO_PORT || "9000";

const endpoint = `${protocol}://${host}:${port}`;
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
 */
export async function uploadToMinio(fileBuffer: Buffer, fileName: string, folderName: string, mimeType: string) {
  const fullPath = `${folderName}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fullPath,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    return `${endpoint}/${bucketName}/${fullPath}`;
  } catch (error) {
    console.error("خطا در آپلود فایل به MinIO:", error);
    throw error;
  }
}

/**
 * حذف فایل از MinIO بر اساس آدرس URL ذخیره شده
 */
export async function deleteFromMinio(fileUrl: string) {
  if (!fileUrl) return;

  try {
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

/**
 * دریافت لیست فایل‌ها و پوشه‌ها از MinIO (برای فایل منیجر)
 * @param prefix مسیر پوشه (مثلاً 'products/')
 * @param recursive در صورت true بودن تمام زیرپوشه‌ها را هم می‌خواند
 */
export async function listMinioObjects(prefix: string = '', recursive: boolean = false): Promise<any[]> {
  const objects: any[] = [];
  
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/',
    });

    const response = await s3Client.send(command);

    // افزودن پوشه‌ها (CommonPrefixes) در صورت عدم جستجوی بازگشتی
    if (!recursive && response.CommonPrefixes) {
      response.CommonPrefixes.forEach(p => {
        if (p.Prefix) objects.push({ prefix: p.Prefix });
      });
    }

    // افزودن فایل‌ها (Contents)
    if (response.Contents) {
      response.Contents.forEach(c => {
        // خود پوشه را در خروجی فایل‌ها نادیده می‌گیریم
        if (c.Key && c.Key !== prefix) {
          objects.push({
            name: c.Key,
            size: c.Size,
            lastModified: c.LastModified
          });
        }
      });
    }

    return objects;
  } catch (error) {
    console.error("خطا در دریافت لیست فایل‌ها از MinIO:", error);
    throw error;
  }
}