import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import db from '@/lib/db';
import { SalaryTaxDisketteService } from '@/lib/payroll/tax-diskette-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const run = await db.payrollRun.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json({ error: 'دوره حقوق یافت نشد' }, { status: 404 });
    }

    const diskettes = await SalaryTaxDisketteService.generateArticle86Diskette({
      year: run.year,
      month: run.month,
    });

    return NextResponse.json({
      runNumber: run.runNumber,
      year: run.year,
      month: run.month,
      files: {
        wp: diskettes.wp,
        wh: diskettes.wh,
        wk: diskettes.wk,
      },
      stats: diskettes.stats,
    });
  } catch (error: any) {
    console.error('Error generating Article 86 diskette:', error);
    return NextResponse.json({ error: error.message || 'خطا در تولید فایل‌های ماده ۸۶' }, { status: 500 });
  }
}
