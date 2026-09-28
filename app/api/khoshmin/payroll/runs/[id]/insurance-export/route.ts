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
    const { fileName, content, summary } =
      await DisketteExportService.generateTaminInsuranceExport(id);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'X-Total-Employees': summary.totalEmployees.toString(),
        'X-Total-30Percent': summary.total30PercentInsurance.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating insurance export:', error);
    return NextResponse.json({ error: error.message || 'خطا در تولید گزارش بیمه تامین اجتماعی' }, { status: 500 });
  }
}
