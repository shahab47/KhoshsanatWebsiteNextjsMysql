import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { VoucherService } from '@/lib/accounting/voucher-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'شناسه مشتری نامعتبر است' }, { status: 400 });
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 });
    }

    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // حساب معین دریافتنی مشتریان (110301)
    const arAccount = await db.account.findUnique({
      where: { code: '110301' },
    });

    if (!arAccount) {
      return NextResponse.json({ error: 'حساب معین ۱۱۰۳۰۱ یافت نشد' }, { status: 500 });
    }

    // استخراج دفاتر و گردش حساب معین این تفصیلی
    const ledger = await VoucherService.getSubsidiaryLedger({
      accountId: arAccount.id,
      detail1Id: customerId.toString(),
      startDate,
      endDate,
    });

    // غنی‌سازی ردیف‌های گردش حساب با اطلاعات فاکتور یا فیش پرداخت مرجع
    const enrichedStatement = await Promise.all(
      ledger.entries.map(async (entry) => {
        let referenceInfo: any = null;

        if (entry.voucher.referenceModule === 'SALES_INVOICE' && entry.voucher.referenceId) {
          const inv = await db.invoice.findUnique({
            where: { id: parseInt(entry.voucher.referenceId) },
            select: { id: true, invoiceNo: true, finalAmount: true, status: true },
          });
          if (inv) referenceInfo = { type: 'INVOICE', ...inv };
        } else if (entry.voucher.referenceModule === 'CUSTOMER_RECEIPT' && entry.voucher.referenceId) {
          const pay = await db.payment.findUnique({
            where: { id: parseInt(entry.voucher.referenceId) },
            select: { id: true, receiptNo: true, amount: true, paymentMethod: true },
          });
          if (pay) referenceInfo = { type: 'PAYMENT', ...pay };
        }

        const debitNum = Number(entry.debit);
        const creditNum = Number(entry.credit);
        const runningNum = Number(entry.runningBalance);

        return {
          id: entry.id,
          voucherId: entry.voucherId,
          voucherNo: entry.voucher.voucherNo,
          voucherDate: entry.voucher.voucherDate,
          voucherType: entry.voucher.type,
          description: entry.description || entry.voucher.description,
          debit: debitNum,
          credit: creditNum,
          runningBalance: runningNum,
          balanceType: runningNum > 0 ? 'DEBTOR' : runningNum < 0 ? 'CREDITOR' : 'BALANCED',
          referenceInfo,
        };
      })
    );

    return NextResponse.json({
      customerId,
      customerName: customer.name,
      finalLedgerBalance: Number(ledger.finalBalance),
      currentDebt: customer.totalDebt,
      currentPaid: customer.totalPaid,
      statement: enrichedStatement,
    });
  } catch (error: any) {
    console.error('Error fetching customer statement:', error);
    return NextResponse.json({ error: 'خطا در دریافت گردش حساب مشتری' }, { status: 500 });
  }
}
