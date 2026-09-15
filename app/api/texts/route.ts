// src/app/api/texts/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { cleanupRemovedFiles, extractImagesFromHtml, isValidMinioUrl } from '@/lib/minio';

// تبدیل تگ <font color="#..."> به <span style="color: ...">
function convertFontToSpan(html: string): string {
  return html.replace(/<font\s+color=(["']?)(#[0-9a-fA-F]{6}|[a-z]+)\1\s*>/gi, (match, quote, color) => {
    return `<span style="color: ${color};">`;
  }).replace(/<\/font>/gi, '</span>');
}

export async function GET() {
  const settings = await db.setting.findMany();
  const texts = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);
  return NextResponse.json(texts);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const data = await request.json();

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        const cleanValue = convertFontToSpan(value);

        // بررسی و پاکسازی فایل‌های قدیمی MinIO در صورت تغییر تنظیمات
        const oldSetting = await db.setting.findUnique({ where: { key } });
        if (oldSetting && oldSetting.value !== cleanValue) {
          const oldFiles: string[] = [];
          if (isValidMinioUrl(oldSetting.value)) oldFiles.push(oldSetting.value);
          oldFiles.push(...extractImagesFromHtml(oldSetting.value));

          const newFiles: string[] = [];
          if (isValidMinioUrl(cleanValue)) newFiles.push(cleanValue);
          newFiles.push(...extractImagesFromHtml(cleanValue));

          if (oldFiles.length > 0) {
            await cleanupRemovedFiles(oldFiles, newFiles);
          }
        }

        await db.setting.upsert({
          where: { key },
          update: { value: cleanValue },
          create: { key, value: cleanValue }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving texts:', error);
    return NextResponse.json({ success: false, error: 'خطا در ذخیره اطلاعات' }, { status: 500 });
  }
}