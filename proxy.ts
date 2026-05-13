// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth-middleware';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // مسیرهای عمومی (نیاز به لاگین ندارند)
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

    const user = await getUserFromToken(token);
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.delete('admin_token');
      return response;
    }

    // بررسی دسترسی برای کاربران غیر مدیر ارشد
    if (user.role !== 'MAIN_ADMIN') {
      // مسیر پروفایل شخصی (/khoshmin/users) همیشه مجاز است
      const isProfileRoute = pathname === '/khoshmin/users' || pathname.startsWith('/khoshmin/users/');
      if (!isProfileRoute) {
        const isAllowed = user.allowedPaths?.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        );
        if (!isAllowed) {
          // صفحه دسترسی محدود (از ریدایرکت مستقیم به not-found استفاده می‌کنیم)
          return NextResponse.rewrite(new URL('/khoshmin/not-found', req.url));
        }
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|favicon.ico|api/auth).*)',
};