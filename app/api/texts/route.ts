// src/app/api/texts/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

// تبدیل تگ <font color="#..."> به <span style="color: ...">
function convertFontToSpan(html: string): string {
  // الگوی regex برای یافتن تگ‌های font با attribute color
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
    const data = await request.json();

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // تبدیل تگ font به span
        const cleanValue = convertFontToSpan(value);
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