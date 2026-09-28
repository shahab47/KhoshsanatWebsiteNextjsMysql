import db from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface CreateBankAccountData {
  companyId?: string | null;
  bankName: string;
  branchName?: string | null;
  branchCode?: string | null;
  accountNumber: string;
  iban?: string | null;
  cardPrefix?: string | null;
  currency?: string;
  accountId?: string | null;
  posTerminalId?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  initialBalance?: number | Prisma.Decimal;
}

export class BankAccountService {
  /**
   * دریافت لیست کلیه حساب‌های بانکی کارخانه
   */
  static async getBankAccounts(companyId?: string | null) {
    return await db.bankAccount.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        _count: {
          select: { cheques: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * دریافت اطلاعات یک حساب بانکی بر اساس شناسه
   */
  static async getBankAccountById(id: string) {
    return await db.bankAccount.findUnique({
      where: { id },
      include: {
        company: true,
        cheques: {
          orderBy: { dueDate: 'asc' },
          take: 20,
        },
      },
    });
  }

  /**
   * ایجاد حساب بانکی جدید
   */
  static async createBankAccount(data: CreateBankAccountData) {
    // در صورتی که این حساب پیش‌فرض تنظیم شده باشد، حساب‌های دیگر را غیرپیش‌فرض کن
    if (data.isDefault && data.companyId) {
      await db.bankAccount.updateMany({
        where: { companyId: data.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    let accountId = data.accountId;
    if (!accountId) {
      const defaultBankAcc = await db.account.findUnique({
        where: { code: '110101' },
      });
      accountId = defaultBankAcc?.id || null;
    }

    return await db.bankAccount.create({
      data: {
        companyId: data.companyId || null,
        bankName: data.bankName,
        branchName: data.branchName || null,
        branchCode: data.branchCode || null,
        accountNumber: data.accountNumber,
        iban: data.iban || null,
        cardPrefix: data.cardPrefix || null,
        currency: data.currency || 'IRR',
        accountId,
        posTerminalId: data.posTerminalId || null,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        initialBalance: data.initialBalance ? new Prisma.Decimal(data.initialBalance) : new Prisma.Decimal(0),
      },
    });
  }

  /**
   * محاسبه مانده دفتری نقد و بانک بر مبنای اسناد ثبت‌شده
   */
  static async getAccountBalance(bankAccountId: string) {
    const bank = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bank) throw new Error('حساب بانکی یافت نشد.');

    // محاسبه مجموع چک‌های وصول‌شده به این حساب
    const clearedCheques = await db.cheque.aggregate({
      where: {
        bankAccountId,
        status: 'CLEARED',
      },
      _sum: { amount: true },
    });

    const initial = bank.initialBalance || new Prisma.Decimal(0);
    const clearedSum = clearedCheques._sum.amount || new Prisma.Decimal(0);

    return initial.add(clearedSum);
  }
}
