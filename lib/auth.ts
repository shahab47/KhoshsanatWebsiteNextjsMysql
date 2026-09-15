// مسیر فایل: src/lib/auth.ts

import { jwtVerify, SignJWT } from 'jose';

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Application cannot start without it.');
}
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}