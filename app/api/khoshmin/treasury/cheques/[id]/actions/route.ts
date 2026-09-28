import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { ChequeService } from '@/lib/treasury/cheque-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: 'نوع عملیات (action) الزامی است.' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'deposit':
        if (!body.bankAccountId) {
          return NextResponse.json({ error: 'شناسه حساب بانکی مقصد الزامی است.' }, { status: 400 });
        }
        result = await ChequeService.depositCheque(id, body.bankAccountId);
        break;

      case 'clear':
        result = await ChequeService.clearCheque(id);
        break;

      case 'bounce':
        result = await ChequeService.bounceCheque(id, body.reason || 'کسری موجودی و واخواست بانکی');
        break;

      default:
        return NextResponse.json({ error: `عملیات نامعتبر: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing cheque action:', error);
    return NextResponse.json({ error: error.message || 'خطا در اجرای عملیات چک' }, { status: 400 });
  }
}
