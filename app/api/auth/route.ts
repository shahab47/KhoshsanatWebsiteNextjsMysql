// مسیر فایل: src/app/api/auth/route.ts

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return NextResponse.json({ user: null });
    const user = await verifyToken(token);
    return NextResponse.json({ user });
}

export async function POST(req: Request) {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
        const { email, password } = body;
        
        // ساخت ادمین اولیه اگر دیتابیس خالی بود
        const count = await db.user.count();
        if (count === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await db.user.create({
                data: { name: 'مدیر کل', email: 'admin@khoshsanat.ir', password: hash, role: 'MAIN_ADMIN' }
            });
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json({ error: 'اطلاعات ورود صحیح نیست' }, { status: 401 });
        }

        const token = await signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
        const res = NextResponse.json({ success: true });
        res.cookies.set('admin_token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
        return res;
    }

    if (action === 'logout') {
        const res = NextResponse.json({ success: true });
        res.cookies.delete('admin_token');
        return res;
    }

    if (action === 'forgot') {
        const { email } = body;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        await db.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExp: new Date(Date.now() + 3600000) }
        });
        
        // شبیه‌سازی ارسال ایمیل در کنسول
        console.log(`\n\nReset Link: http://localhost:3000/admin/login?reset=${resetToken}\n\n`);
        return NextResponse.json({ success: true, message: 'لینک بازیابی در کنسول چاپ شد.' });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
}