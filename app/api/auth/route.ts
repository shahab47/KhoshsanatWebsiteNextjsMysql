// src/app/api/auth/route.ts

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
    
    try {
        const user = await verifyToken(token);
        if (!user) {
            const response = NextResponse.json({ user: null });
            response.cookies.delete('admin_token');
            return response;
        }
        return NextResponse.json({ user });
    } catch (error) {
        // اگر توکن منقضی یا نامعتبر است، کوکی را پاک کن
        const response = NextResponse.json({ user: null });
        response.cookies.delete('admin_token');
        return response;
    }
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

        const token = await signToken({
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            allowedPaths: user.allowedPaths
        });
        const res = NextResponse.json({ success: true });
        
        // تشخیص پروتکل امن (HTTPS) از هدر Nginx
        const forwardedProto = req.headers.get('x-forwarded-proto');
        const isSecure = forwardedProto === 'https';
        
        res.cookies.set('admin_token', token, {
            httpOnly: true,
            secure: isSecure,        // در HTTPS true، در HTTP false
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 روز
        });
        
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
        const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login?reset=${resetToken}`;
        console.log(`\n\nReset Link: ${resetLink}\n\n`);
        
        return NextResponse.json({ success: true, message: 'لینک بازیابی رمز عبور با موفقیت ایجاد شد.' });
    }

    if (action === 'reset') {
        const { token, newPassword } = body;
        if (!token || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'توکن نامعتبر است یا رمز عبور جدید باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
        }

        const user = await db.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExp: { gte: new Date() }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'لینک بازیابی منقضی شده است یا نامعتبر می‌باشد' }, { status: 400 });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await db.user.update({
            where: { id: user.id },
            data: {
                password: hash,
                resetToken: null,
                resetTokenExp: null
            }
        });

        return NextResponse.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت. اکنون می‌توانید وارد شوید.' });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
}