// مسیر فایل: src/app/api/users/route.ts

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getSession() {
    const token = (await cookies()).get('admin_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (session.role === 'MAIN_ADMIN') {
        const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true } });
        return NextResponse.json(users);
    } else {
        const user = await db.user.findUnique({ where: { id: session.id as number }, select: { id: true, name: true, email: true, role: true } });
        return NextResponse.json([user]);
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'MAIN_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, email, password, role } = await req.json();
    const hash = await bcrypt.hash(password, 10);
    try {
        await db.user.create({ data: { name, email, password: hash, role } });
        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: 'ایمیل تکراری است' }, { status: 400 }); }
}

export async function PUT(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, email, password, role } = await req.json();

    // محدودیت مدیر محتوا: فقط خودش را ویرایش می‌کند و حق تغییر نقش ندارد
    if (session.role === 'CONTENT_ADMIN' && id !== session.id) {
        return NextResponse.json({ error: 'شما فقط مجاز به ویرایش پروفایل خود هستید' }, { status: 403 });
    }

    const dataToUpdate: any = { name, email };
    if (session.role === 'MAIN_ADMIN') dataToUpdate.role = role;
    if (password) dataToUpdate.password = await bcrypt.hash(password, 10);

    await db.user.update({ where: { id }, data: dataToUpdate });
    return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'MAIN_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const id = new URL(req.url).searchParams.get('id');
    if (parseInt(id!) === session.id) return NextResponse.json({ error: 'خودتان را نمی‌توانید حذف کنید' }, { status: 400 });
    await db.user.delete({ where: { id: parseInt(id!) } });
    return NextResponse.json({ success: true });
}