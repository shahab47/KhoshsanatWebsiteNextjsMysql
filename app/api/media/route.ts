import { NextResponse } from 'next/server';
import { 
  listMinioObjects, 
  uploadToMinio, 
  s3Client, 
  bucketName, 
  formatMinioUrl, 
  extractKeyFromUrl, 
  getAllDatabaseFileUrls,
  deleteFilesFromMinio,
  extractImagesFromHtml,
  extractUrlsFromJson
} from '@/lib/minio';
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch { return null; }
}

async function findDbUsage(url: string) {
  const targetKey = extractKeyFromUrl(url);
  if (!targetKey) return [];

  const targetFieldNames = [
    'imageUrl', 'catalogUrl', 'gallery', 'media', 'url', 
    'attachmentUrl', 'signatureUrl', 'attachments', 'content', 'description', 'value'
  ];
  const models = Prisma.dmmf.datamodel.models;
  const usages: { model: string; id: number; field: string; isJson: boolean }[] = [];

  for (const model of models) {
    const modelTargetFields = model.fields.filter(f => targetFieldNames.includes(f.name));
    if (modelTargetFields.length > 0) {
      const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      try {
        // @ts-ignore
        if (typeof prisma[delegateName]?.findMany !== 'function') continue;
        // @ts-ignore
        const records = await prisma[delegateName].findMany();
        records.forEach((record: any) => {
          modelTargetFields.forEach(field => {
            const value = record[field.name];
            if (!value) return;

            let isMatched = false;
            let isJson = field.type === 'Json' || Array.isArray(value);

            if (typeof value === 'string') {
              if (field.name === 'content' || field.name === 'description' || value.includes('<img')) {
                const htmlImages = extractImagesFromHtml(value);
                isMatched = htmlImages.some(u => extractKeyFromUrl(u) === targetKey);
              } else if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
                const jsonUrls = extractUrlsFromJson(value);
                isMatched = jsonUrls.some(u => extractKeyFromUrl(u) === targetKey);
                isJson = true;
              } else {
                isMatched = extractKeyFromUrl(value) === targetKey;
              }
            } else if (typeof value === 'object') {
              const jsonUrls = extractUrlsFromJson(value);
              isMatched = jsonUrls.some(u => extractKeyFromUrl(u) === targetKey);
              isJson = true;
            }

            if (isMatched) {
              usages.push({ model: model.name, id: record.id, field: field.name, isJson });
            }
          });
        });
      } catch (e) {}
    }
  }
  return usages;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const prefix = searchParams.get('prefix') || '';

    if (action === 'check') {
      const urlToCheck = searchParams.get('url');
      if (!urlToCheck) return NextResponse.json({ success: false, message: 'آدرس فایل ارسال نشده است' }, { status: 400 });
      const usages = await findDbUsage(urlToCheck);
      return NextResponse.json({ success: true, inUse: usages.length > 0, usages });
    }

    if (action === 'list') {
      const rawObjects = await listMinioObjects(prefix, false);
      const folders: string[] = [];
      const files: any[] = [];

      rawObjects.forEach(obj => {
        if (obj.prefix) folders.push(obj.prefix);
        else if (obj.name && !obj.name.endsWith('/')) { 
          files.push({
            name: obj.name.replace(prefix, ''),
            path: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: formatMinioUrl(obj.name)
          });
        }
      });
      return NextResponse.json({ success: true, folders, files, currentPrefix: prefix });
    }

    if (action === 'orphans') {
      const allMinioObjects = await listMinioObjects('', true);
      const minioFiles = allMinioObjects.filter(o => !o.prefix && o.name && !o.name.endsWith('/'));
      
      // استخراج تمام فایل‌های فعال از دیتابیس با موتور جامع
      const activeDatabaseUrls = await getAllDatabaseFileUrls();
      const activeDbKeys = new Set(
        activeDatabaseUrls
          .map(u => extractKeyFromUrl(u))
          .filter((k): k is string => k !== null)
      );

      const orphanedFiles = minioFiles
        .filter(obj => !activeDbKeys.has(obj.name))
        .map(obj => ({
          name: obj.name.split('/').pop(),
          path: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          url: formatMinioUrl(obj.name)
        }));

      return NextResponse.json({ 
        success: true, 
        totalMinioFiles: minioFiles.length, 
        totalDbFiles: activeDbKeys.size, 
        orphansCount: orphanedFiles.length, 
        orphans: orphanedFiles 
      });
    }

    return NextResponse.json({ success: false, message: 'عملیات درخواستی نامعتبر است' }, { status: 400 });
  } catch (error: any) { 
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور در پردازش درخواست' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    // ۱. ساخت پوشه
    if (action === 'createFolder') {
      const folderName = formData.get('folderName') as string;
      const prefix = formData.get('prefix') as string || '';
      await uploadToMinio(Buffer.from(''), `${folderName}/`, prefix, 'application/x-directory');
      return NextResponse.json({ success: true });
    }

    // ۲. آپلود یا Replace
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || '';
    const replaceUrl = formData.get('replaceUrl') as string | null;

    if (!file) return NextResponse.json({ success: false, message: 'فایلی برای آپلود انتخاب نشده است' }, { status: 400 });

    let finalFileName = file.name;

    // در حالت Replace، نیازی به آپدیت دیتابیس نیست. فقط فایل رو روی فایل قبلی رونویسی (Overwrite) می‌کنیم.
    if (replaceUrl) {
      const oldKey = extractKeyFromUrl(replaceUrl);
      if (oldKey) {
        finalFileName = oldKey.split('/').pop() || file.name;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const newUrl = await uploadToMinio(buffer, finalFileName, folder, file.type);
    
    return NextResponse.json({ success: true, url: newUrl });
  } catch (error: any) { 
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور در آپلود فایل' }, { status: 500 }); 
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    // 🟢 تغییر نام (Rename) - آپدیت دیتابیس برای فایل و پوشه
    if (action === 'rename') {
      const { type, path, newName, oldUrl } = body;
      
      if (type === 'file' && oldUrl && newName) {
        const oldObjectName = extractKeyFromUrl(oldUrl) || path;
        const pathParts = oldObjectName.split('/');
        pathParts.pop(); 
        const prefix = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
        const newObjectName = `${prefix}${newName}`;

        await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: encodeURI(`${bucketName}/${oldObjectName}`), Key: newObjectName }));
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldObjectName }));

        const newUrl = formatMinioUrl(newObjectName);
        const usages = await findDbUsage(oldUrl);
        for (const usage of usages) {
          const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
          // @ts-ignore
          await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: newUrl } });
        }
        return NextResponse.json({ success: true, newUrl });
      } 
      else if (type === 'folder' && path && newName) {
        const objects = await listMinioObjects(path, true);
        const pathParts = path.split('/').filter(Boolean);
        pathParts.pop(); 
        const parentPrefix = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
        const newFolderPath = `${parentPrefix}${newName}/`;

        for (const obj of objects) {
          if (!obj.name) continue;
          const relativePath = obj.name.substring(path.length);
          const newObjectName = `${newFolderPath}${relativePath}`;
          
          await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: encodeURI(`${bucketName}/${obj.name}`), Key: newObjectName }));
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.name }));

          const oldObjUrl = formatMinioUrl(obj.name);
          const newObjUrl = formatMinioUrl(newObjectName);
          const usages = await findDbUsage(oldObjUrl);
          for (const usage of usages) {
            const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
            // @ts-ignore
            await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: newObjUrl } });
          }
        }
        return NextResponse.json({ success: true });
      }
    }

    // 🟢 کپی یا کات کردن (Paste)
    if (action === 'paste') {
      const { items, destination, isCut } = body;
      for (const item of items) {
        if (item.type === 'file') {
          const oldObjectName = item.path;
          const fileName = item.newName ? item.newName : oldObjectName.split('/').pop();
          const newObjectName = `${destination}${fileName}`;
          
          await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: encodeURI(`${bucketName}/${oldObjectName}`), Key: newObjectName }));
          
          if (isCut) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldObjectName }));
            const oldUrl = formatMinioUrl(oldObjectName);
            const newUrl = formatMinioUrl(newObjectName);
            const usages = await findDbUsage(oldUrl);
            for (const usage of usages) {
              const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
              // @ts-ignore
              await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: newUrl } });
            }
          }
        } else if (item.type === 'folder') {
          const objects = await listMinioObjects(item.path, true);
          const folderName = item.newName ? item.newName : item.path.split('/').filter(Boolean).pop();

          for (const obj of objects) {
            if (!obj.name || obj.name.endsWith('/')) continue;
            const relativePath = obj.name.substring(item.path.length);
            const newObjectName = `${destination}${folderName}/${relativePath}`;
            
            await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: encodeURI(`${bucketName}/${obj.name}`), Key: newObjectName }));
            
            if (isCut) {
              await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.name }));
              const oldUrl = formatMinioUrl(obj.name);
              const newUrl = formatMinioUrl(newObjectName);
              const usages = await findDbUsage(oldUrl);
              for (const usage of usages) {
                const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
                // @ts-ignore
                await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: newUrl } });
              }
            }
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error: any) { 
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور در ویرایش فایل' }, { status: 500 }); 
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const { items, removeFromDb } = await request.json(); 
    const keysToDelete: string[] = [];

    for (const item of items) {
      if (item.type === 'file') {
        const itemKey = item.path || extractKeyFromUrl(item.url);
        if (itemKey) {
          keysToDelete.push(itemKey);
          if (removeFromDb) {
            const usages = await findDbUsage(item.url || itemKey);
            for (const usage of usages) {
              const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
              // @ts-ignore
              await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: null } });
            }
          }
        }
      } else if (item.type === 'folder') {
        const objects = await listMinioObjects(item.path, true);
        for (const obj of objects) {
          if (!obj.name) continue;
          keysToDelete.push(obj.name);
          if (removeFromDb) {
            const usages = await findDbUsage(obj.name);
            for (const usage of usages) {
              const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
              // @ts-ignore
              await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: null } });
            }
          }
        }
      }
    }

    await deleteFilesFromMinio(keysToDelete);

    return NextResponse.json({ success: true });
  } catch (error: any) { 
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور در حذف فایل' }, { status: 500 }); 
  }
}