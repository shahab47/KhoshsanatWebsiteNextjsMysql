import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/mail';

async function getSession() {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET() {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role === 'MAIN_ADMIN') {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        allowedPaths: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } else {
    const user = await db.user.findUnique({
      where: { id: session.id as number },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        allowedPaths: true,
        createdAt: true,
      }
    });
    return NextResponse.json(user ? [user] : []);
  }
}

export async function POST(req: Request) {
  const session: any = await getSession();
  if (!session || session.role !== 'MAIN_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, password, role, status, allowedPaths } = await req.json();
  const hash = await bcrypt.hash(password, 10);
  try {
    const cleanEmail = email.trim().toLowerCase();
    const newUser = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hash,
        role: role || 'CONTENT_ADMIN',
        status: status || 'APPROVED',
        allowedPaths: allowedPaths || null,
      }
    });
    return NextResponse.json({ success: true, user: newUser });
  } catch (e) {
    return NextResponse.json({ error: 'ایمیل تکراری است' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, email, password, role, status, allowedPaths } = await req.json();

  if (session.role === 'CONTENT_ADMIN' && id !== session.id) {
    return NextResponse.json({ error: 'شما فقط مجاز به ویرایش پروفایل خود هستید' }, { status: 403 });
  }

  const existingUser = await db.user.findUnique({ where: { id } });
  if (!existingUser) {
    return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
  }

  const dataToUpdate: any = {};
  if (name) dataToUpdate.name = name.trim();
  if (email) dataToUpdate.email = email.trim().toLowerCase();
  
  if (session.role === 'MAIN_ADMIN') {
    if (role !== undefined) dataToUpdate.role = role;
    if (status !== undefined) dataToUpdate.status = status;
    if (allowedPaths !== undefined) dataToUpdate.allowedPaths = allowedPaths;
  }
  if (password) dataToUpdate.password = await bcrypt.hash(password, 12);

  const updatedUser = await db.user.update({
    where: { id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      allowedPaths: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // اگر کاربر توسط ادمین تایید (APPROVED) شد و قبلاً تایید نشده بود، ایمیل تاییدیه ارسال شود
  if (
    session.role === 'MAIN_ADMIN' &&
    status === 'APPROVED' &&
    existingUser.status !== 'APPROVED'
  ) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://khoshsanat.ir';
    const roleTitle = (updatedUser.role === 'MAIN_ADMIN') ? 'مدیر ارشد' : 'مدیر محتوا';
    
    const approvalHtml = `
      <p>سلام <strong>${updatedUser.name}</strong> عزیز،</p>
      <p>حساب کاربری شما در سامانه اتوماسیون و پنل مدیریت <strong>شرکت خوش‌صنعت پایدار</strong> توسط مدیر ارشد با موفقیت <strong>تایید و فعال</strong> گردید.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #166534; font-size: 16px;">مشخصات ورود به سامانه:</h3>
        <p style="margin: 6px 0; color: #15803d; font-size: 14px;">• ایمیل کاربری: <strong>${updatedUser.email}</strong></p>
        <p style="margin: 6px 0; color: #15803d; font-size: 14px;">• نقش و سطح دسترسی: <strong>${roleTitle}</strong></p>
        <p style="margin: 6px 0; color: #15803d; font-size: 14px;">• رمز عبور: همان رمزی که هنگام ثبت‌نام انتخاب نمودید</p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${siteUrl}/login" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: bold; padding: 14px 32px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          ورود به پنل مدیریت
        </a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        در صورت بروز هرگونه مشکل یا نیاز به تغییر دسترسی‌ها، با مدیر ارشد سیستم در ارتباط باشید.
      </p>
    `;

    try {
      await sendEmail({
        to: updatedUser.email,
        subject: 'تایید و فعال‌سازی حساب کاربری | خوش‌صنعت پایدار',
        html: approvalHtml,
        senderId: session.id,
      });
    } catch (mailErr) {
      console.error('Failed to send approval email:', mailErr);
    }
  }

  return NextResponse.json({ success: true, user: updatedUser });
}

export async function DELETE(req: Request) {
  const session: any = await getSession();
  if (!session || session.role !== 'MAIN_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const idParam = new URL(req.url).searchParams.get('id');
  const targetId = parseInt(idParam || '');
  if (isNaN(targetId)) {
    return NextResponse.json({ error: 'شناسه کاربر نامعتبر است' }, { status: 400 });
  }

  if (targetId === session.id)
    return NextResponse.json({ error: 'خودتان را نمی‌توانید حذف کنید' }, { status: 400 });

  await db.user.delete({ where: { id: targetId } });
  return NextResponse.json({ success: true });
}