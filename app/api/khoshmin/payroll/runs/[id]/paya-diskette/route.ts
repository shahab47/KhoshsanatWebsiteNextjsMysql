import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { DisketteExportService } from '@/lib/payroll/diskette-export-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const { fileName, content, totalAmount, totalCount, missingIbanCount } =
      await DisketteExportService.generatePayaDiskette(id);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'X-Total-Amount': totalAmount.toString(),
        'X-Total-Count': totalCount.toString(),
        'X-Missing-Iban-Count': missingIbanCount.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating Paya diskette:', error);
    return NextResponse.json({ error: error.message || 'خطا در تولید فایل پایا' }, { status: 500 });
  }
}
