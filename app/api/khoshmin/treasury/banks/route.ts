import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { BankAccountService } from '@/lib/treasury/bank-account-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const accounts = await BankAccountService.getBankAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ error: error.message || 'خطا در دریافت لیست حساب‌های بانکی' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const body = await request.json();
    if (!body.bankName || !body.accountNumber) {
      return NextResponse.json({ error: 'نام بانک و شماره حساب الزامی است.' }, { status: 400 });
    }

    const created = await BankAccountService.createBankAccount(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: error.message || 'خطا در ایجاد حساب بانکی' }, { status: 500 });
  }
}
