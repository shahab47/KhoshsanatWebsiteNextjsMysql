// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'khoshsanat-secure-token-998877';
const key = new TextEncoder().encode(secretKey);

async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as {
      id?: number;
      role?: string;
      name?: string;
      email?: string;
      allowedPaths?: string | null;
    };
  } catch (error) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // مسیرهای عمومی
  const publicPaths = ['/login', '/api/auth'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // محافظت از تمام مسیرهای /khoshmin/*
  if (pathname.startsWith('/khoshmin')) {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.delete('admin_token');
      return response;
    }

    // بررسی دسترسی برای کاربران غیر مدیر ارشد
    if (user.role !== 'MAIN_ADMIN') {
      // صفحه داشبورد اصلی و پروفایل شخصی (/khoshmin/users) همیشه مجاز است
      const isProfileOrDashboard = 
        pathname === '/khoshmin' || 
        pathname === '/khoshmin/users' || 
        pathname.startsWith('/khoshmin/users/') ||
        pathname === '/khoshmin/not-found';

      if (!isProfileOrDashboard) {
        const rawPaths = user.allowedPaths ?? '';
        const allowed = rawPaths
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p !== '');

        const isAllowed = allowed.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        );

        if (!isAllowed) {
          return NextResponse.rewrite(new URL('/khoshmin/not-found', req.url));
        }
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/khoshmin/:path*'],
};
