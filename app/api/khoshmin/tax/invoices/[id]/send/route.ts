import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { ModyanService } from '@/lib/tax/modyan-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const invoiceId = parseInt(id, 10);
    const result = await ModyanService.sendInvoiceToModyan(invoiceId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending invoice to Modyan:', error);
    return NextResponse.json({ error: error.message || 'خطا در ارسال صورتحساب به سامانه مودیان' }, { status: 400 });
  }
}
