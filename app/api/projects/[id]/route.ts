// مسیر فایل: src/app/api/projects/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromMinio } from '@/lib/minio';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    
    const project = await db.project.update({
      where: { id },
      data: { ...body }
    });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ویرایش پروژه' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    // 🟢 پاک کردن عکس اصلی و گالری از فضای ابری MinIO
    if (project.imageUrl) await deleteFromMinio(project.imageUrl);

    if (project.gallery) {
      let galleryArray: string[] = [];
      if (typeof project.gallery === 'string') {
        try { galleryArray = JSON.parse(project.gallery); } catch(e){}
      } else if (Array.isArray(project.gallery)) {
        galleryArray = project.gallery as string[];
      }
      for (const url of galleryArray) {
        await deleteFromMinio(url);
      }
    }

    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف پروژه' }, { status: 500 });
  }
}