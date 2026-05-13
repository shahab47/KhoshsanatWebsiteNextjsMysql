// src/app/api/khoshmin/customers/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'آیدی مشتری نامعتبر است' }, { status: 400 });
    }
    const notes = await db.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در دریافت یادداشت‌ها' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const { note } = await request.json();
    if (isNaN(customerId) || !note?.trim()) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }
    const newNote = await db.customerNote.create({
      data: { customerId, note: note.trim() }
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در افزودن یادداشت' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const noteId = parseInt(url.searchParams.get('noteId') || '');
    const { note } = await request.json();

    if (isNaN(customerId) || isNaN(noteId) || !note?.trim()) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.customerNote.findFirst({
      where: { id: noteId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'یادداشت یافت نشد' }, { status: 404 });
    }

    const updated = await db.customerNote.update({
      where: { id: noteId },
      data: { note: note.trim() }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ویرایش یادداشت' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const url = new URL(request.url);
    const noteId = parseInt(url.searchParams.get('noteId') || '');

    if (isNaN(customerId) || isNaN(noteId)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر' }, { status: 400 });
    }

    const existing = await db.customerNote.findFirst({
      where: { id: noteId, customerId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'یادداشت یافت نشد' }, { status: 404 });
    }

    await db.customerNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در حذف یادداشت' }, { status: 500 });
  }
}