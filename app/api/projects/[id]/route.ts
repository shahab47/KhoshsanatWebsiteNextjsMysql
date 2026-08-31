// مسیر فایل: src/app/api/projects/[id]/route.ts

import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFromMinio } from '@/lib/minio';

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

    // 🟢 پاک کردن عکس اصلی و گالری از فضای ابری MinIO
    if (project.imageUrl) {
      try { await deleteFromMinio(project.imageUrl); } catch(e){}
    }

    if (project.gallery) {
      let galleryArray: string[] = [];
      if (typeof project.gallery === 'string') {
        try { galleryArray = JSON.parse(project.gallery); } catch(e){}
      } else if (Array.isArray(project.gallery)) {
        galleryArray = project.gallery as string[];
      }
      for (const url of galleryArray) {
        if (typeof url === 'string') {
          try { await deleteFromMinio(url); } catch(e){}
        }
      }
    }

    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'خطا در حذف پروژه' }, { status: 500 });
  }
}