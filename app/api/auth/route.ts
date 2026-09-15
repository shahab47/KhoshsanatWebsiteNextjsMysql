// src/app/api/auth/route.ts

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/mail';
import { randomInt } from 'crypto';

// ==========================================
// محافظت در برابر حملات Brute Force
// ==========================================
const loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // ۱۵ دقیقه

function checkBruteForce(email: string): { blocked: boolean; remainingMinutes?: number } {
  const key = email.toLowerCase().trim();
  const record = loginAttempts.get(key);
  if (!record) return { blocked: false };
  
  if (record.blockedUntil > Date.now()) {
    const remaining = Math.ceil((record.blockedUntil - Date.now()) / 60000);
    return { blocked: true, remainingMinutes: remaining };
  }
  
  // ریست بعد از اتمام زمان بلاک
  if (record.blockedUntil > 0 && record.blockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return { blocked: false };
  }
  
  return { blocked: false };
}

function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase().trim();
  const record = loginAttempts.get(key) || { count: 0, lastAttempt: 0, blockedUntil: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = Date.now() + BLOCK_DURATION;
  }
  loginAttempts.set(key, record);
}

function clearFailedAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase().trim());
}

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
    } catch {
        const response = NextResponse.json({ user: null });
        response.cookies.delete('admin_token');
        return response;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        // ==========================================
        // 1. لاگین (ورود کاربر)
        // ==========================================
        if (action === 'login') {
            const { email, password } = body;
            
            if (!email || !password) {
                return NextResponse.json({ error: 'لطفاً ایمیل و رمز عبور را وارد کنید' }, { status: 400 });
            }

            // بررسی محدودیت تلاش‌های ناموفق (Brute Force Protection)
            const bruteCheck = checkBruteForce(email);
            if (bruteCheck.blocked) {
                return NextResponse.json({ 
                    error: `به دلیل تلاش‌های ناموفق متعدد، حساب شما به مدت ${bruteCheck.remainingMinutes} دقیقه مسدود شده است.` 
                }, { status: 429 });
            }

            // بررسی وجود حداقل یک کاربر در سیستم
            const count = await db.user.count();
            if (count === 0) {
                return NextResponse.json({ 
                    error: 'هیچ کاربری در سیستم ثبت نشده است. لطفاً ابتدا از طریق صفحه ثبت‌نام اقدام کنید.' 
                }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();
            const user = await db.user.findUnique({ where: { email: cleanEmail } });
            
            if (!user || !(await bcrypt.compare(password, user.password))) {
                recordFailedAttempt(email);
                return NextResponse.json({ error: 'اطلاعات ورود (ایمیل یا رمز عبور) صحیح نیست' }, { status: 401 });
            }

            // لاگین موفق - پاک کردن سابقه تلاش‌های ناموفق
            clearFailedAttempts(email);

            // بررسی وضعیت تایید کاربر
            if (user.status === 'PENDING') {
                return NextResponse.json({ 
                    error: 'حساب کاربری شما هنوز توسط مدیر ارشد تایید نشده است. پس از تایید توسط ادمین، ایمیل اطلاع‌رسانی دریافت خواهید کرد.' 
                }, { status: 403 });
            }

            if (user.status === 'REJECTED') {
                return NextResponse.json({ 
                    error: 'درخواست ثبت‌نام شما توسط مدیریت تایید نشده است.' 
                }, { status: 403 });
            }

            if (user.status === 'BLOCKED') {
                return NextResponse.json({ 
                    error: 'حساب کاربری شما مسدود شده است. لطفاً با مدیریت تماس بگیرید.' 
                }, { status: 403 });
            }

            const token = await signToken({
                id: user.id,
                role: user.role,
                status: user.status,
                name: user.name,
                email: user.email,
                allowedPaths: user.allowedPaths
            });

            const res = NextResponse.json({ 
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                }
            });
            
            // تشخیص پروتکل امن (HTTPS) از هدر Nginx
            const forwardedProto = req.headers.get('x-forwarded-proto');
            const isSecure = forwardedProto === 'https';
            
            res.cookies.set('admin_token', token, {
                httpOnly: true,
                secure: isSecure,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 روز
            });
            
            return res;
        }

        // ==========================================
        // 2. ثبت‌نام کاربر جدید (در انتظار تایید ادمین)
        // ==========================================
        if (action === 'register') {
            const { name, email, password } = body;

            if (!name || !name.trim()) {
                return NextResponse.json({ error: 'لطفاً نام و نام خانوادگی را وارد کنید' }, { status: 400 });
            }

            if (!email || !email.trim()) {
                return NextResponse.json({ error: 'لطفاً آدرس ایمیل معتبر وارد کنید' }, { status: 400 });
            }

            if (!password || password.length < 6) {
                return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();

            // بررسی تکراری نبودن ایمیل
            const existingUser = await db.user.findUnique({ where: { email: cleanEmail } });
            if (existingUser) {
                return NextResponse.json({ error: 'این آدرس ایمیل قبلاً در سیستم ثبت شده است' }, { status: 400 });
            }

            const hash = await bcrypt.hash(password, 12);
            
            // فقط اولین کاربر ثبت‌نام شده به عنوان ادمین ارشد تایید می‌شود
            const userCount = await db.user.count();
            const isFirstAdmin = userCount === 0;

            await db.user.create({
                data: {
                    name: name.trim(),
                    email: cleanEmail,
                    password: hash,
                    role: isFirstAdmin ? 'MAIN_ADMIN' : 'CONTENT_ADMIN',
                    status: isFirstAdmin ? 'APPROVED' : 'PENDING',
                }
            });

            if (isFirstAdmin) {
                return NextResponse.json({
                    success: true,
                    message: 'حساب کاربری مدیر ارشد با موفقیت ایجاد گردید. اکنون می‌توانید وارد شوید.',
                });
            }

            return NextResponse.json({
                success: true,
                message: 'ثبت‌نام شما با موفقیت انجام شد. حساب کاربری شما پس از بررسی و تایید توسط مدیر ارشد فعال خواهد شد و ایمیل تایید برای شما ارسال می‌گردد.',
            });
        }

        // ==========================================
        // 3. خروج (Logout)
        // ==========================================
        if (action === 'logout') {
            const res = NextResponse.json({ success: true });
            res.cookies.delete('admin_token');
            return res;
        }

        // ==========================================
        // 4. فراموشی رمز عبور (ارسال کد ۶ رقمی به ایمیل)
        // ==========================================
        if (action === 'forgot') {
            const { email } = body;
            if (!email || !email.trim()) {
                return NextResponse.json({ error: 'لطفاً آدرس ایمیل خود را وارد کنید' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();
            const user = await db.user.findUnique({ where: { email: cleanEmail } });
            
            if (!user) {
                return NextResponse.json({ error: 'کاربری با این آدرس ایمیل در سیستم یافت نشد' }, { status: 404 });
            }

            if (user.status === 'PENDING') {
                return NextResponse.json({ 
                    error: 'حساب کاربری شما هنوز توسط مدیر سیستم تایید نشده است.' 
                }, { status: 400 });
            }

            if (user.status === 'BLOCKED' || user.status === 'REJECTED') {
                return NextResponse.json({ 
                    error: 'حساب کاربری شما غیرفعال یا مسدود است. لطفاً با پشتیبانی تماس بگیرید.' 
                }, { status: 400 });
            }

            // تولید کد ۶ رقمی عددی با رمزنگاری امن
            const otpCode = randomInt(100000, 1000000).toString();
            const tokenExp = new Date(Date.now() + 30 * 60 * 1000); // ۳۰ دقیقه اعتبار

            await db.user.update({
                where: { id: user.id },
                data: {
                    resetToken: otpCode,
                    resetTokenExp: tokenExp,
                }
            });

            // ارسال ایمیل حاوی کد ۶ رقمی
            const emailHtml = `
              <p>سلام <strong>${user.name}</strong> عزیز،</p>
              <p>درخواستی برای بازیابی رمز عبور حساب کاربری شما در سامانه <strong>خوش‌صنعت پایدار</strong> ثبت شده است.</p>
              
              <div style="background-color: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
                <span style="font-size: 13px; color: #475569; display: block; margin-bottom: 10px; font-weight: bold;">کد تایید ۶ رقمی بازیابی رمز عبور:</span>
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2563eb; font-family: monospace; display: inline-block;">${otpCode}</span>
              </div>

              <div style="background-color: #eff6ff; border-right: 4px solid #2563eb; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #1e3a8a; line-height: 1.8; margin-bottom: 20px;">
                ⏱️ این کد به مدت <strong>۳۰ دقیقه</strong> دارای اعتبار است.<br/>
                🔒 برای تغییر رمز عبور، این کد را به همراه رمز جدید در فرم بازیابی وارد نمایید.
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ⚠️ چنانچه شما درخواست بازیابی رمز عبور نداده‌اید، لطفاً این پیام را نادیده بگیرید؛ حساب کاربری شما در امنیت کامل قرار دارد.
              </p>
            `;

            const mailRes = await sendEmail({
                to: user.email,
                subject: 'کد تایید بازیابی رمز عبور | خوش‌صنعت پایدار',
                html: emailHtml,
            });

            if (!mailRes.success) {
                console.error('Failed to send OTP email:', mailRes.error);
                return NextResponse.json({ 
                    error: `ارسال ایمیل با خطا مواجه شد (${mailRes.error || 'عدم اتصال به سرور ایمیل'}). لطفاً از صحت تنظیمات ایمیل اطمینان حاصل کرده یا مجدداً تلاش نمایید.` 
                }, { status: 500 });
            }

            return NextResponse.json({ 
                success: true, 
                message: `کد تایید ۶ رقمی به ایمیل ${cleanEmail} ارسال شد (اعتبار: ۳۰ دقیقه). لطفاً صندوق ورودی (یا اسپم) خود را بررسی کنید.` 
            });
        }

        // ==========================================
        // 5. تایید کد و تنظیم رمز جدید (Reset with Code)
        // ==========================================
        if (action === 'reset_with_code' || action === 'reset') {
            const { email, code, token, newPassword } = body;
            const otpCode = (code || token || '').trim();

            if (!email || !email.trim()) {
                return NextResponse.json({ error: 'آدرس ایمیل الزامی است' }, { status: 400 });
            }

            if (!otpCode) {
                return NextResponse.json({ error: 'لطفاً کد تایید ۶ رقمی را وارد کنید' }, { status: 400 });
            }

            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();
            const user = await db.user.findUnique({
                where: { email: cleanEmail }
            });

            if (!user) {
                return NextResponse.json({ error: 'کاربری با این آدرس ایمیل یافت نشد' }, { status: 404 });
            }

            if (!user.resetToken) {
                return NextResponse.json({ 
                    error: 'هیچ کد تاییدی برای این حساب صادر نشده است یا قبلاً استفاده شده است. لطفاً مجدداً درخواست کد دهید.' 
                }, { status: 400 });
            }

            if (user.resetToken !== otpCode) {
                return NextResponse.json({ 
                    error: 'کد تایید ۶ رقمی وارد شده نادرست است' 
                }, { status: 400 });
            }

            if (user.resetTokenExp && user.resetTokenExp < new Date()) {
                return NextResponse.json({ 
                    error: 'زمان اعتبار ۳۰ دقیقه‌ای این کد به پایان رسیده است. لطفاً مجدداً درخواست ارسال ایمیل تایید دهید.' 
                }, { status: 400 });
            }

            const hash = await bcrypt.hash(newPassword, 12);
            await db.user.update({
                where: { id: user.id },
                data: {
                    password: hash,
                    resetToken: null,
                    resetTokenExp: null,
                }
            });

            return NextResponse.json({ 
                success: true, 
                message: 'رمز عبور شما با موفقیت تغییر یافت. اکنون می‌توانید با رمز عبور جدید وارد شوید.' 
            });
        }

        return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
    } catch (error: any) {
        console.error('Auth API Error:', error);
        return NextResponse.json({ error: 'خطای سرور در پردازش درخواست. لطفاً مجدداً تلاش کنید.' }, { status: 500 });
    }
}