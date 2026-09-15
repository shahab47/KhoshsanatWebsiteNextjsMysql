// src/lib/auth-middleware.ts
import { verifyToken } from './auth';
import db from '@/lib/db';

interface CacheEntry {
  role: string;
  allowedPaths: string[];
  expires: number;
}
const userCache = new Map<number, CacheEntry>();

export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const userId = payload.id as number;
  const role = payload.role as string;

  if (role === 'MAIN_ADMIN') {
    return { role, allowedPaths: null };
  }

  const cached = userCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return { role: cached.role, allowedPaths: cached.allowedPaths };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, allowedPaths: true }
  });
  if (!user) return null;

  // حل مشکل split با اطمینان از اینکه allowedPaths رشته است
  const rawPaths = user.allowedPaths ?? ''; // اگر null یا undefined بود، رشته خالی جایگزین می‌شود
  const allowedPaths: string[] = rawPaths
    .split(',')
    .map((p: string) => p.trim())
    .filter((p: string) => p !== '');

  userCache.set(userId, {
    role: user.role,
    allowedPaths,
    expires: Date.now() + 5 * 60 * 1000
  });
  return { role: user.role, allowedPaths };
}

import { cookies } from 'next/headers';

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}