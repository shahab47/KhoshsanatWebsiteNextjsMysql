// مسیر فایل: src/app/api/projects/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { 
  extractUrlsFromJson, 
  extractImagesFromHtml, 
  cleanupRemovedFiles, 
  deleteFilesFromMinio 
} from '@/lib/minio';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const identifier = decodeURIComponent(resolvedParams.id);
    const parsedId = parseInt(identifier);

    let project = null;
    if (!isNaN(parsedId)) {
      project = await db.project.findFirst({
        where: {
          OR: [
            { id: parsedId },
            { slug: identifier }
          ]
        }
      });
    } else {
      project = await db.project.findFirst({
        where: { slug: identifier }
      });
    }

    if (!project) {
      return NextResponse.json({ error: 'پروژه یافت نشد' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching single project:', error);
    return NextResponse.json({ error: 'خطا در دریافت پروژه' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });

    const body = await request.json();
    const { id: _, createdAt: __, updatedAt: ___, ...updateData } = body;
    
    // ۱. بررسی پروژه قبلی و پاکسازی تفاضلی فایل‌های کاور، گالری و عکس‌های ادیتور متن
    const oldProject = await db.project.findUnique({ where: { id } });
    if (oldProject) {
      const oldFiles = [
        oldProject.imageUrl,
        ...extractUrlsFromJson(oldProject.gallery),
        ...extractImagesFromHtml(oldProject.content)
      ];
      const newFiles = [
        body.imageUrl,
        ...extractUrlsFromJson(body.gallery),
        ...extractImagesFromHtml(body.content)
      ];
      await cleanupRemovedFiles(oldFiles, newFiles);
    }

    const project = await db.project.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'خطا در ویرایش پروژه' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });
    
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    // پاک کردن عکس اصلی، گالری و تصاویر ادیتور متن از فضای ابری MinIO
    const allFilesToDelete = [
      project.imageUrl,
      ...extractUrlsFromJson(project.gallery),
      ...extractImagesFromHtml(project.content)
    ];

    await deleteFilesFromMinio(allFilesToDelete);

    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'خطا در حذف پروژه' }, { status: 500 });
  }
}