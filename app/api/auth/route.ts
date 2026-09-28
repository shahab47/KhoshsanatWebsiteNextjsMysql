// src/app/api/auth/route.ts

import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/mail';
import { randomInt, createHash, timingSafeEqual } from 'crypto';

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

// ==========================================
// ثابت‌های امنیتی فرآیند تایید ایمیل و کدهای OTP
// ==========================================
const RESEND_COOLDOWN_SECONDS = 90; // ۹۰ ثانیه فاصله مجاز ارسال مجدد در سرور
const OTP_EXPIRY_MINUTES = 3;       // ۳ دقیقه زمان اعتبار کد تایید ثبت‌نام
const MAX_OTP_ATTEMPTS = 3;         // حداکثر ۳ تلاش ناموفق قبل از ابطال کد
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        // 2. ثبت‌نام کاربر جدید (مرحله ۱: ارسال کد تایید ۶ رقمی به ایمیل)
        // ==========================================
        if (action === 'register') {
            const { name, email, password } = body;

            if (!name || !name.trim()) {
                return NextResponse.json({ error: 'لطفاً نام و نام خانوادگی را وارد کنید' }, { status: 400 });
            }

            if (!email || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
                return NextResponse.json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید' }, { status: 400 });
            }

            if (!password || password.length < 8) {
                return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ کاراکتر باشد' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();

            // بررسی تکراری نبودن ایمیل در کاربران سامانه
            const existingUser = await db.user.findUnique({ where: { email: cleanEmail } });
            if (existingUser) {
                return NextResponse.json({ error: 'این آدرس ایمیل قبلاً در سامانه ثبت شده است' }, { status: 400 });
            }

            // بررسی تایمر ارسال مجدد سمت سرور (Server-side Cooldown)
            const lastToken = await db.verificationToken.findFirst({
                where: { email: cleanEmail, purpose: 'REGISTER' },
                orderBy: { createdAt: 'desc' }
            });

            if (lastToken) {
                const diffSec = Math.floor((Date.now() - lastToken.createdAt.getTime()) / 1000);
                if (diffSec < RESEND_COOLDOWN_SECONDS) {
                    const waitSec = RESEND_COOLDOWN_SECONDS - diffSec;
                    return NextResponse.json({
                        error: `لطفاً ${waitSec} ثانیه دیگر جهت درخواست مجدد کد تایید شکیبا باشید.`,
                        remainingCooldown: waitSec
                    }, { status: 429 });
                }
            }

            // تولید کد ۶ رقمی امن و هش SHA-256
            const otpCode = randomInt(100000, 1000000).toString();
            const codeHash = createHash('sha256').update(otpCode).digest('hex');
            const passwordHash = await bcrypt.hash(password, 12);

            // پاک‌سازی توکن‌های منقضی یا قبلی این ایمیل
            await db.verificationToken.deleteMany({
                where: { email: cleanEmail, purpose: 'REGISTER' }
            });

            // ذخیره توکن موقت با انقضای ۳ دقیقه در دیتابیس
            await db.verificationToken.create({
                data: {
                    email: cleanEmail,
                    codeHash,
                    purpose: 'REGISTER',
                    payload: { name: name.trim(), passwordHash },
                    attempts: 0,
                    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
                }
            });

            // ایمیل تاییدیه با قالب سازمانی
            const emailHtml = `
              <p>سلام <strong>${name.trim()}</strong> عزیز،</p>
              <p>از درخواست ثبت‌نام شما در سامانه رسمی <strong>شرکت خوش‌صنعت پایدار</strong> سپاسگزاریم.</p>
              <p>جهت تایید هویت و فعال‌سازی حساب کاربری، لطفاً کد تایید ۶ رقمی زیر را در فرم ثبت‌نام وارد نمایید:</p>
              
              <div style="background-color: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
                <span style="font-size: 13px; color: #475569; display: block; margin-bottom: 10px; font-weight: bold;">کد ۶ رقمی تایید ایمیل:</span>
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #2563eb; font-family: monospace; display: inline-block;">${otpCode}</span>
              </div>

              <div style="background-color: #eff6ff; border-right: 4px solid #2563eb; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #1e3a8a; line-height: 1.8; margin-bottom: 20px;">
                ⏱️ این کد به مدت <strong>${OTP_EXPIRY_MINUTES} دقیقه</strong> دارای اعتبار است.<br/>
                🔒 کد تایید کاملاً محرمانه است؛ آن را در اختیار افراد دیگر قرار ندهید.
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                چنانچه شما درخواست ثبت‌نام ارسال نکرده‌اید، این پیام را نادیده بگیرید.
              </p>
            `;

            console.log(`\n========================================`);
            console.log(`🔑 [AUTH REGISTER OTP] برای ${cleanEmail}: ${otpCode}`);
            console.log(`========================================\n`);

            if (process.env.NODE_ENV === 'production') {
                const mailRes = await sendEmail({
                    to: cleanEmail,
                    subject: 'کد تایید ثبت‌نام | خوش‌صنعت پایدار',
                    html: emailHtml,
                    isSensitive: true,
                });

                if (!mailRes.success) {
                    return NextResponse.json({
                        error: `ارسال ایمیل تاییدیه با خطا مواجه شد (${mailRes.error || 'عدم اتصال به میل‌سرور'}). لطفاً مجدداً تلاش نمایید.`
                    }, { status: 500 });
                }
            } else {
                sendEmail({
                    to: cleanEmail,
                    subject: 'کد تایید ثبت‌نام | خوش‌صنعت پایدار',
                    html: emailHtml,
                    isSensitive: true,
                }).catch(err => console.error('[DEV EMAIL BACKGROUND ERROR]:', err?.message));
            }

            return NextResponse.json({
                success: true,
                step: 'verify',
                email: cleanEmail,
                resendCooldown: RESEND_COOLDOWN_SECONDS,
                message: `کد تایید ۶ رقمی به آدرس ایمیل ${cleanEmail} ارسال گردید. لطفاً صندوق ورودی (یا اسپم) خود را بررسی کنید (اعتبار: ${OTP_EXPIRY_MINUTES} دقیقه).`
            });
        }

        // ==========================================
        // 3. تایید کد و ایجاد قطعی کاربر (مرحله ۲ ثبت‌نام)
        // ==========================================
        if (action === 'register_verify') {
            const { email, code } = body;
            const otpCode = (code || '').trim();

            if (!email || !email.trim()) {
                return NextResponse.json({ error: 'آدرس ایمیل الزامی است' }, { status: 400 });
            }

            if (!otpCode || otpCode.length !== 6) {
                return NextResponse.json({ error: 'لطفاً کد تایید ۶ رقمی را به صورت کامل وارد کنید' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();

            const tokenRecord = await db.verificationToken.findFirst({
                where: { email: cleanEmail, purpose: 'REGISTER' },
                orderBy: { createdAt: 'desc' }
            });

            if (!tokenRecord) {
                return NextResponse.json({
                    error: 'کد تاییدی برای این ایمیل یافت نشد یا قبلاً استفاده گردیده است. لطفاً مجدداً ثبت‌نام کنید.'
                }, { status: 400 });
            }

            // بررسی انقضای کد (۳ دقیقه)
            if (tokenRecord.expiresAt < new Date()) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({
                    error: 'زمان اعتبار ۳ دقیقه‌ای این کد به پایان رسیده است. لطفاً مجدداً درخواست کد تایید دهید.'
                }, { status: 400 });
            }

            // بررسی سقف مجاز تلاش‌های اشتباه (حداکثر ۳ تلاش)
            if (tokenRecord.attempts >= MAX_OTP_ATTEMPTS) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({
                    error: 'به دلیل ۳ بار ورود کد اشتباه، این کد باطل گردید. لطفاً فرآیند ثبت‌نام را مجدداً تکرار فرمایید.'
                }, { status: 429 });
            }

            // مقایسه امن هش کد ورودی با timingSafeEqual
            const inputHash = createHash('sha256').update(otpCode).digest('hex');
            const isMatch = timingSafeEqual(Buffer.from(tokenRecord.codeHash), Buffer.from(inputHash));

            if (!isMatch) {
                const updated = await db.verificationToken.update({
                    where: { id: tokenRecord.id },
                    data: { attempts: { increment: 1 } }
                });
                const remaining = MAX_OTP_ATTEMPTS - updated.attempts;
                if (remaining <= 0) {
                    await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                    return NextResponse.json({
                        error: 'کد تایید نادرست بود و به دلیل اتمام سقف مجاز تلاش، باطل شد. لطفاً مجدداً درخواست ارسال کد دهید.'
                    }, { status: 400 });
                }
                return NextResponse.json({
                    error: `کد تایید ۶ رقمی وارد شده نادرست است. (${remaining} تلاش باقی‌مانده)`
                }, { status: 400 });
            }

            // کد صحیح است — استخراج اطلاعات و ایجاد کاربر
            const payload = tokenRecord.payload as { name?: string; passwordHash?: string } | null;
            if (!payload || !payload.name || !payload.passwordHash) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({ error: 'اطلاعات ثبت‌نام منقضی شده است. لطفاً از ابتدا ثبت‌نام کنید.' }, { status: 400 });
            }

            // بررسی مجدد عدم ثبت تکراری همزمان
            const existingUser = await db.user.findUnique({ where: { email: cleanEmail } });
            if (existingUser) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({ error: 'این آدرس ایمیل قبلاً در سیستم ثبت شده است.' }, { status: 400 });
            }

            const userCount = await db.user.count();
            const isFirstAdmin = userCount === 0;

            await db.user.create({
                data: {
                    name: payload.name,
                    email: cleanEmail,
                    password: payload.passwordHash,
                    role: isFirstAdmin ? 'MAIN_ADMIN' : 'CONTENT_ADMIN',
                    status: isFirstAdmin ? 'APPROVED' : 'PENDING',
                }
            });

            // حذف توکن موقت استفاده شده
            await db.verificationToken.delete({ where: { id: tokenRecord.id } });

            if (isFirstAdmin) {
                return NextResponse.json({
                    success: true,
                    message: 'ایمیل شما تایید شد و حساب کاربری مدیر ارشد با موفقیت ایجاد گردید. اکنون می‌توانید وارد شوید.',
                });
            }

            return NextResponse.json({
                success: true,
                message: 'ایمیل شما با موفقیت تایید شد. حساب کاربری شما پس از بررسی و تایید نهایی توسط مدیر ارشد فعال خواهد شد.',
            });
        }

        // ==========================================
        // 4. خروج (Logout)
        // ==========================================
        if (action === 'logout') {
            const res = NextResponse.json({ success: true });
            res.cookies.delete('admin_token');
            return res;
        }

        // ==========================================
        // 5. فراموشی رمز عبور (ارسال کد ۶ رقمی امن با تایمر سرور)
        // ==========================================
        if (action === 'forgot') {
            const { email } = body;
            if (!email || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
                return NextResponse.json({ error: 'لطفاً آدرس ایمیل معتبر خود را وارد کنید' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();
            const user = await db.user.findUnique({ where: { email: cleanEmail } });
            
            if (!user) {
                // پاسخ یکسان برای ممانعت از User Enumeration
                return NextResponse.json({ 
                    success: true,
                    message: `در صورتی که حسابی با ایمیل ${cleanEmail} در سامانه وجود داشته باشد، کد تایید ارسال گردید.`
                });
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

            // بررسی تایمر ارسال مجدد سروری (Cooldown ۹۰ ثانیه)
            const lastToken = await db.verificationToken.findFirst({
                where: { email: cleanEmail, purpose: 'FORGOT_PASSWORD' },
                orderBy: { createdAt: 'desc' }
            });

            if (lastToken) {
                const diffSec = Math.floor((Date.now() - lastToken.createdAt.getTime()) / 1000);
                if (diffSec < RESEND_COOLDOWN_SECONDS) {
                    const waitSec = RESEND_COOLDOWN_SECONDS - diffSec;
                    return NextResponse.json({
                        error: `لطفاً ${waitSec} ثانیه دیگر جهت درخواست مجدد کد تایید شکیبا باشید.`,
                        remainingCooldown: waitSec
                    }, { status: 429 });
                }
            }

            // تولید کد ۶ رقمی عددی با هش امن
            const otpCode = randomInt(100000, 1000000).toString();
            const codeHash = createHash('sha256').update(otpCode).digest('hex');

            await db.verificationToken.deleteMany({
                where: { email: cleanEmail, purpose: 'FORGOT_PASSWORD' }
            });

            await db.verificationToken.create({
                data: {
                    email: cleanEmail,
                    codeHash,
                    purpose: 'FORGOT_PASSWORD',
                    attempts: 0,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // ۵ دقیقه اعتبار
                }
            });

            // ارسال ایمیل حاوی کد ۶ رقمی
            const emailHtml = `
              <p>سلام <strong>${user.name}</strong> عزیز،</p>
              <p>درخواستی برای بازیابی رمز عبور حساب کاربری شما در سامانه <strong>خوش‌صنعت پایدار</strong> ثبت شده است.</p>
              
              <div style="background-color: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0;">
                <span style="font-size: 13px; color: #475569; display: block; margin-bottom: 10px; font-weight: bold;">کد تایید ۶ رقمی بازیابی رمز عبور:</span>
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #2563eb; font-family: monospace; display: inline-block;">${otpCode}</span>
              </div>

              <div style="background-color: #eff6ff; border-right: 4px solid #2563eb; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #1e3a8a; line-height: 1.8; margin-bottom: 20px;">
                ⏱️ این کد به مدت <strong>۵ دقیقه</strong> دارای اعتبار است.<br/>
                🔒 برای تغییر رمز عبور، این کد را به همراه رمز جدید در فرم بازیابی وارد نمایید.
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                ⚠️ چنانچه شما درخواست بازیابی رمز عبور نداده‌اید، لطفاً این پیام را نادیده بگیرید؛ حساب کاربری شما در امنیت کامل قرار دارد.
              </p>
            `;

            console.log(`\n========================================`);
            console.log(`🔑 [AUTH FORGOT OTP] برای ${cleanEmail}: ${otpCode}`);
            console.log(`========================================\n`);

            if (process.env.NODE_ENV === 'production') {
                const mailRes = await sendEmail({
                    to: user.email,
                    subject: 'کد تایید بازیابی رمز عبور | خوش‌صنعت پایدار',
                    html: emailHtml,
                    isSensitive: true,
                });

                if (!mailRes.success) {
                    return NextResponse.json({ 
                        error: `ارسال ایمیل با خطا مواجه شد (${mailRes.error || 'عدم اتصال به سرور ایمیل'}). لطفاً مجدداً تلاش نمایید.` 
                    }, { status: 500 });
                }
            } else {
                sendEmail({
                    to: user.email,
                    subject: 'کد تایید بازیابی رمز عبور | خوش‌صنعت پایدار',
                    html: emailHtml,
                    isSensitive: true,
                }).catch(err => console.error('[DEV EMAIL BACKGROUND ERROR]:', err?.message));
            }

            return NextResponse.json({ 
                success: true, 
                resendCooldown: RESEND_COOLDOWN_SECONDS,
                message: `کد تایید ۶ رقمی به ایمیل ${cleanEmail} ارسال شد (اعتبار: ۵ دقیقه). لطفاً صندوق ورودی (یا اسپم) خود را بررسی کنید.` 
            });
        }

        // ==========================================
        // 6. تایید کد و تنظیم رمز جدید (Reset with Code)
        // ==========================================
        if (action === 'reset_with_code' || action === 'reset') {
            const { email, code, token, newPassword } = body;
            const otpCode = (code || token || '').trim();

            if (!email || !email.trim()) {
                return NextResponse.json({ error: 'آدرس ایمیل الزامی است' }, { status: 400 });
            }

            if (!otpCode || otpCode.length !== 6) {
                return NextResponse.json({ error: 'لطفاً کد تایید ۶ رقمی را وارد کنید' }, { status: 400 });
            }

            if (!newPassword || newPassword.length < 8) {
                return NextResponse.json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد' }, { status: 400 });
            }

            const cleanEmail = email.trim().toLowerCase();
            const user = await db.user.findUnique({
                where: { email: cleanEmail }
            });

            if (!user) {
                return NextResponse.json({ error: 'کاربری با این آدرس ایمیل یافت نشد' }, { status: 404 });
            }

            const tokenRecord = await db.verificationToken.findFirst({
                where: { email: cleanEmail, purpose: 'FORGOT_PASSWORD' },
                orderBy: { createdAt: 'desc' }
            });

            if (!tokenRecord) {
                return NextResponse.json({ 
                    error: 'هیچ کد تاییدی برای این حساب صادر نشده است یا قبلاً استفاده شده است. لطفاً مجدداً درخواست کد دهید.' 
                }, { status: 400 });
            }

            if (tokenRecord.expiresAt < new Date()) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({ 
                    error: 'زمان اعتبار ۵ دقیقه‌ای این کد به پایان رسیده است. لطفاً مجدداً درخواست ارسال ایمیل تایید دهید.' 
                }, { status: 400 });
            }

            if (tokenRecord.attempts >= MAX_OTP_ATTEMPTS) {
                await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                return NextResponse.json({ 
                    error: 'به دلیل ۳ بار ورود کد اشتباه، این کد باطل گردید. لطفاً مجدداً درخواست ارسال کد دهید.' 
                }, { status: 429 });
            }

            const inputHash = createHash('sha256').update(otpCode).digest('hex');
            const isMatch = timingSafeEqual(Buffer.from(tokenRecord.codeHash), Buffer.from(inputHash));

            if (!isMatch) {
                const updated = await db.verificationToken.update({
                    where: { id: tokenRecord.id },
                    data: { attempts: { increment: 1 } }
                });
                const remaining = MAX_OTP_ATTEMPTS - updated.attempts;
                if (remaining <= 0) {
                    await db.verificationToken.delete({ where: { id: tokenRecord.id } });
                    return NextResponse.json({ 
                        error: 'کد تایید نادرست بود و به دلیل اتمام سقف مجاز تلاش، باطل شد. لطفاً مجدداً درخواست کد دهید.' 
                    }, { status: 400 });
                }
                return NextResponse.json({ 
                    error: `کد تایید ۶ رقمی وارد شده نادرست است. (${remaining} تلاش باقی‌مانده)` 
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

            await db.verificationToken.delete({ where: { id: tokenRecord.id } });

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