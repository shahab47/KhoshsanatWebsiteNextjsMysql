import { NextResponse } from 'next/server';
import { listMinioObjects, uploadToMinio, s3Client } from '@/lib/minio';
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
  const targetFieldNames = ['imageUrl', 'catalogUrl', 'gallery', 'media', 'url', 'attachmentUrl', 'signatureUrl', 'attachments'];
  const models = Prisma.dmmf.datamodel.models;
  const usages: { model: string; id: number; field: string }[] = [];

  for (const model of models) {
    const modelTargetFields = model.fields.filter(f => targetFieldNames.includes(f.name));
    if (modelTargetFields.length > 0) {
      const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      try {
        // @ts-ignore
        const records = await prisma[delegateName].findMany();
        records.forEach((record: any) => {
          modelTargetFields.forEach(field => {
            const value = record[field.name];
            if (!value) return;
            if (value === url || (Array.isArray(value) && value.includes(url)) || (typeof value === 'string' && value.includes(url))) {
              usages.push({ model: model.name, id: record.id, field: field.name });
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
    const bucketName = process.env.MINIO_BUCKET_NAME || 'khoshsanat-media';
    const minioBaseUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}`;

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
            url: `${minioBaseUrl}/${obj.name}`
          });
        }
      });
      return NextResponse.json({ success: true, folders, files, currentPrefix: prefix });
    }

    if (action === 'orphans') {
      const allMinioObjects = await listMinioObjects('', true);
      const minioFileUrls = allMinioObjects.filter(o => !o.prefix && !o.name.endsWith('/')).map(o => `${minioBaseUrl}/${o.name}`);
      let activeDatabaseUrls: string[] = [];

      try {
        const targetFieldNames = ['imageUrl', 'catalogUrl', 'gallery', 'media', 'url', 'attachmentUrl', 'signatureUrl', 'attachments'];
        const models = Prisma.dmmf.datamodel.models;

        for (const model of models) {
          const modelTargetFields = model.fields.filter(f => targetFieldNames.includes(f.name));
          if (modelTargetFields.length > 0) {
            const selectQuery: Record<string, boolean> = {};
            modelTargetFields.forEach(f => { selectQuery[f.name] = true; });
            const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
            // @ts-ignore
            const records = await prisma[delegateName].findMany({ select: selectQuery });

            records.forEach((record: any) => {
              modelTargetFields.forEach(field => {
                const value = record[field.name];
                if (!value) return;
                if (typeof value === 'string') {
                  if (value.trim().startsWith('[')) {
                    try {
                      const parsed = JSON.parse(value);
                      if (Array.isArray(parsed)) activeDatabaseUrls.push(...parsed);
                    } catch { activeDatabaseUrls.push(value); }
                  } else { activeDatabaseUrls.push(value); }
                } else if (Array.isArray(value)) {
                  activeDatabaseUrls.push(...value);
                }
              });
            });
          }
        }
      } catch (dbError) { return NextResponse.json({ success: false, message: 'خطا در خواندن دیتابیس' }, { status: 500 }); }

      if (activeDatabaseUrls.length === 0) return NextResponse.json({ success: false, message: 'هیچ فایلی در دیتابیس یافت نشد' }, { status: 400 });

      const orphanedUrls = minioFileUrls.filter(url => !activeDatabaseUrls.includes(url));
      const orphanedFiles = allMinioObjects.filter(obj => orphanedUrls.some(url => url.endsWith(obj.name))).map(obj => ({
        name: obj.name.split('/').pop(), path: obj.name, size: obj.size, lastModified: obj.lastModified, url: `${minioBaseUrl}/${obj.name}`
      }));

      return NextResponse.json({ success: true, totalMinioFiles: minioFileUrls.length, totalDbFiles: activeDatabaseUrls.length, orphansCount: orphanedFiles.length, orphans: orphanedFiles });
    }

    return NextResponse.json({ success: false, message: 'عملیات درخواستی نامعتبر است' }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message || 'خطای سرور در پردازش درخواست' }, { status: 500 }); }
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

    // 🟢 در حالت Replace، نیازی به آپدیت دیتابیس نیست. فقط فایل رو روی فایل قبلی رونویسی (Overwrite) می‌کنیم.
    if (replaceUrl) {
      const bucketName = process.env.MINIO_BUCKET_NAME || 'khoshsanat-media';
      const oldObjectPath = replaceUrl.split(`/${bucketName}/`)[1];
      if (oldObjectPath) {
        finalFileName = oldObjectPath.split('/').pop() || file.name;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const newUrl = await uploadToMinio(buffer, finalFileName, folder, file.type);
    
    return NextResponse.json({ success: true, url: newUrl });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message || 'خطای سرور در آپلود فایل' }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const body = await request.json();
    const { action } = body;
    const bucketName = process.env.MINIO_BUCKET_NAME || 'khoshsanat-media';
    const minioBaseUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}`;

    // 🟢 تغییر نام (Rename) - آپدیت دیتابیس برای فایل و پوشه
    if (action === 'rename') {
      const { type, path, newName, oldUrl } = body;
      
      if (type === 'file' && oldUrl && newName) {
        const oldObjectName = oldUrl.split(`/${bucketName}/`)[1];
        const pathParts = oldObjectName.split('/');
        pathParts.pop(); 
        const prefix = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
        const newObjectName = `${prefix}${newName}`;

        await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: `${bucketName}/${oldObjectName}`, Key: newObjectName }));
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldObjectName }));

        const newUrl = `${minioBaseUrl}/${newObjectName}`;
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
          
          await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: `${bucketName}/${obj.name}`, Key: newObjectName }));
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.name }));

          const oldObjUrl = `${minioBaseUrl}/${obj.name}`;
          const newObjUrl = `${minioBaseUrl}/${newObjectName}`;
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
          
          await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: `${bucketName}/${oldObjectName}`, Key: newObjectName }));
          
          if (isCut) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldObjectName }));
            const oldUrl = `${minioBaseUrl}/${oldObjectName}`;
            const newUrl = `${minioBaseUrl}/${newObjectName}`;
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
            
            await s3Client.send(new CopyObjectCommand({ Bucket: bucketName, CopySource: `${bucketName}/${obj.name}`, Key: newObjectName }));
            
            if (isCut) {
              await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.name }));
              const oldUrl = `${minioBaseUrl}/${obj.name}`;
              const newUrl = `${minioBaseUrl}/${newObjectName}`;
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
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message || 'خطای سرور در ویرایش فایل' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'MAIN_ADMIN') return NextResponse.json({ success: false, message: 'عدم دسترسی' }, { status: 403 });

    const { items, removeFromDb } = await request.json(); 
    const bucketName = process.env.MINIO_BUCKET_NAME || 'khoshsanat-media';

    for (const item of items) {
      if (item.type === 'file') {
        if (removeFromDb && item.url) {
          const usages = await findDbUsage(item.url);
          for (const usage of usages) {
            const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
            // @ts-ignore
            await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: "" } });
          }
        }
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: item.path }));
      } else if (item.type === 'folder') {
        const objects = await listMinioObjects(item.path, true);
        for (const obj of objects) {
          if (!obj.name) continue;
          const objUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${obj.name}`;
          if (removeFromDb) {
            const usages = await findDbUsage(objUrl);
            for (const usage of usages) {
              const delegateName = usage.model.charAt(0).toLowerCase() + usage.model.slice(1);
              // @ts-ignore
              await prisma[delegateName].update({ where: { id: usage.id }, data: { [usage.field]: "" } });
            }
          }
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.name }));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message || 'خطای سرور در حذف فایل' }, { status: 500 }); }
}