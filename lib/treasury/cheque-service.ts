import db from '@/lib/db';
import {
  Prisma,
  ChequeType,
  ChequeStatus,
  VoucherType,
  MappingTrigger,
} from '@prisma/client';
import { VoucherService, CreateJournalEntryInput } from '@/lib/accounting/voucher-service';
import { AccountingMappingEngine } from '@/lib/accounting/accounting-mapping';

export interface ReceiveChequeInput {
  customerId: number;
  paymentId?: number | null;
  sayadId: string;
  chequeNumber: string;
  amount: number | Prisma.Decimal;
  issueDate?: Date | string;
  dueDate: Date | string;
  bankName: string;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  bankIban?: string | null;
  drawerName: string;
  drawerNationalId?: string | null;
  payeeName?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  description?: string | null;
}

export class ChequeService {
  /**
   * اعتبارسنجی ارقام شناسه صیادی (۱۶ رقم دقیق)
   */
  static validateSayadId(sayadId: string): { isValid: boolean; message?: string } {
    if (!sayadId) {
      return { isValid: false, message: 'شناسه صیادی الزامی است.' };
    }
    const cleaned = sayadId.trim().replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleaned)) {
      return { isValid: false, message: 'شناسه صیادی باید دقیقاً ۱۶ رقم عددی باشد.' };
    }
    return { isValid: true };
  }

  /**
   * دریافت و ثبت اولیه چک صیادی از مشتری همراه با صدور خودکار سند دوبل حسابداری
   * Dr: اسناد دریافتنی تجاری - چک‌های نزد صندوق (۱۱۰۴۰۱)
   * Cr: حساب‌های دریافتنی تجاری - مشتریان (۱۱۰۳۰۱)
   */
  static async receiveCheque(input: ReceiveChequeInput, externalTx?: Prisma.TransactionClient) {
    const client = externalTx || db;

    // ۱. اعتبارسنجی
    const sayadCheck = this.validateSayadId(input.sayadId);
    if (!sayadCheck.isValid) {
      throw new Error(sayadCheck.message);
    }

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw new Error('مبلغ چک صیادی باید بزرگتر از صفر باشد.');
    }

    const customer = await client.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new Error(`مشتری با شناسه ${input.customerId} یافت نشد.`);
    }

    // ۲. بررسی عدم ثبت تکراری شناسه صیاد فعال
    const existing = await client.cheque.findFirst({
      where: {
        sayadId: input.sayadId.trim(),
        status: { notIn: [ChequeStatus.CANCELLED, ChequeStatus.RETURNED_TO_CUSTOMER] },
      },
    });
    if (existing) {
      throw new Error(`چک صیادی با شناسه ${input.sayadId} قبلاً در سیستم ثبت شده است.`);
    }

    // ۳. درج رکورد چک در پایگاه‌داده
    const cheque = await client.cheque.create({
      data: {
        type: ChequeType.RECEIVABLE,
        sayadId: input.sayadId.trim(),
        chequeNumber: input.chequeNumber,
        amount,
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        dueDate: new Date(input.dueDate),
        status: ChequeStatus.RECEIVED,
        bankName: input.bankName,
        bankBranch: input.bankBranch || null,
        bankAccountNumber: input.bankAccountNumber || null,
        bankIban: input.bankIban || null,
        drawerName: input.drawerName,
        drawerNationalId: input.drawerNationalId || null,
        payeeName: input.payeeName || 'شرکت خوش‌صنعت پایدار',
        customerId: input.customerId,
        paymentId: input.paymentId || null,
        frontImageUrl: input.frontImageUrl || null,
        backImageUrl: input.backImageUrl || null,
        description: input.description || null,
      },
    });

    // ۴. صدور خودکار سند حسابداری دوبل دریافت چک
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.CHEQUE_RECEIPT,
        companyId
      );

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: اسناد دریافتنی تجاری - چک‌های نزد صندوق (۱۱۰۴۰۱)
        {
          accountId: mapping.debitAccountId,
          detail1Type: 'CUSTOMER',
          detail1Id: input.customerId.toString(),
          debit: amount,
          credit: new Prisma.Decimal(0),
          description: `دریافت چک صیادی شماره ${cheque.chequeNumber} بانک ${cheque.bankName} - صیاد: ${cheque.sayadId}`,
        },
        // بستانکار: حساب‌های دریافتنی تجاری - مشتریان (۱۱۰۳۰۱)
        {
          accountId: mapping.creditAccountId,
          detail1Type: 'CUSTOMER',
          detail1Id: input.customerId.toString(),
          debit: new Prisma.Decimal(0),
          credit: amount,
          description: `تسویه حساب مشتری ${customer.name} با دریافت چک صیادی سررسید ${new Date(input.dueDate).toLocaleDateString('fa-IR')}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند دریافت چک صیادی شماره ${cheque.chequeNumber} به مبلغ ${amount.toNumber().toLocaleString('fa-IR')} تومان از ${customer.name}`,
          type: VoucherType.RECEIPT,
          referenceModule: 'CHEQUE_RECEIPT',
          referenceId: cheque.id,
          idempotencyKey: `CHQ-REC-${cheque.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.cheque.update({
        where: { id: cheque.id },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting cheque receive voucher:', err);
    }

    return await client.cheque.findUnique({
      where: { id: cheque.id },
      include: { customer: true, bankAccount: true },
    });
  }

  /**
   * واگذاری چک صیادی به بانک جهت وصول (خواباندن به حساب / اسناد در جریان وصول)
   * Dr: اسناد دریافتنی در جریان وصول (۱۱۰۴۰۲)
   * Cr: اسناد دریافتنی تجاری - چک‌های نزد صندوق (۱۱۰۴۰۱)
   */
  static async depositCheque(
    chequeId: string,
    bankAccountId: string,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const cheque = await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true },
    });

    if (!cheque) throw new Error('چک صیادی یافت نشد.');
    if (cheque.status !== ChequeStatus.RECEIVED && cheque.status !== ChequeStatus.IN_PORTFOLIO) {
      throw new Error(`چک در وضعیت ${cheque.status} قابل واگذاری به بانک نیست.`);
    }

    const bank = await client.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bank) throw new Error('حساب بانکی مقصد یافت نشد.');

    // ۱. به‌روزرسانی وضعیت چک
    const updated = await client.cheque.update({
      where: { id: chequeId },
      data: {
        status: ChequeStatus.DEPOSITED,
        bankAccountId,
        depositedAt: new Date(),
      },
    });

    // ۲. صدور سند حسابداری انتقال از صندوق به در جریان وصول
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.CHEQUE_DEPOSIT,
        companyId
      );

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: اسناد دریافتنی در جریان وصول (۱۱۰۴۰۲)
        {
          accountId: mapping.debitAccountId,
          detail1Type: 'BANK',
          detail1Id: bankAccountId,
          debit: cheque.amount,
          credit: new Prisma.Decimal(0),
          description: `واگذاری چک صیادی ${cheque.sayadId} به ${bank.bankName} (${bank.accountNumber})`,
        },
        // بستانکار: اسناد دریافتنی نزد صندوق (۱۱۰۴۰۱)
        {
          accountId: mapping.creditAccountId,
          detail1Type: 'CUSTOMER',
          detail1Id: cheque.customerId ? cheque.customerId.toString() : null,
          debit: new Prisma.Decimal(0),
          credit: cheque.amount,
          description: `خروج چک ${cheque.chequeNumber} از صندوق اسناد بابت واگذاری به بانک`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند واگذاری چک صیادی شماره ${cheque.chequeNumber} به بانک ${bank.bankName}`,
          type: VoucherType.GENERAL,
          referenceModule: 'CHEQUE_DEPOSIT',
          referenceId: cheque.id,
          idempotencyKey: `CHQ-DEP-${cheque.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.cheque.update({
        where: { id: chequeId },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting cheque deposit voucher:', err);
    }

    return (await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true, bankAccount: true },
    })) || updated;
  }

  /**
   * وصول قطعی چک صیادی در بانک و واریز به موجودی نقدینگی
   * Dr: موجودی نقد و بانک‌ها (۱۱۰۱۰۱)
   * Cr: اسناد دریافتنی در جریان وصول (۱۱۰۴۰۲)
   */
  static async clearCheque(chequeId: string, externalTx?: Prisma.TransactionClient) {
    const client = externalTx || db;

    const cheque = await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true, bankAccount: true },
    });

    if (!cheque) throw new Error('چک صیادی یافت نشد.');
    if (cheque.status !== ChequeStatus.DEPOSITED && cheque.status !== ChequeStatus.RECEIVED) {
      throw new Error(`چک در وضعیت ${cheque.status} قابل وصول نیست.`);
    }

    // تعیین حساب مبدا بستانکار (اگر واگذار شده بود ۱۱۰۴۰۲، در غیر این صورت ۱۱۰۴۰۱)
    const isDirectFromPortfolio = cheque.status === ChequeStatus.RECEIVED;

    // ۱. به‌روزرسانی وضعیت چک
    const updated = await client.cheque.update({
      where: { id: chequeId },
      data: {
        status: ChequeStatus.CLEARED,
        clearedAt: new Date(),
      },
    });

    // ۲. صدور سند حسابداری وصول چک
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.CHEQUE_CLEAR,
        companyId
      );

      let creditAccountId = mapping.creditAccountId; // ۱۱۰۴۰۲
      if (isDirectFromPortfolio) {
        const portfolioAcc = await client.account.findUnique({
          where: { code: '110401' },
        });
        if (portfolioAcc) creditAccountId = portfolioAcc.id;
      }

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: موجودی نقد و بانک‌ها (۱۱۰۱۰۱)
        {
          accountId: mapping.debitAccountId,
          detail1Type: 'BANK',
          detail1Id: cheque.bankAccountId || null,
          debit: cheque.amount,
          credit: new Prisma.Decimal(0),
          description: `وصول قطعی چک صیادی ${cheque.sayadId} و افزایش موجودی حساب`,
        },
        // بستانکار: اسناد دریافتنی در جریان وصول / نزد صندوق
        {
          accountId: creditAccountId,
          detail1Type: isDirectFromPortfolio ? 'CUSTOMER' : 'BANK',
          detail1Id: isDirectFromPortfolio
            ? (cheque.customerId?.toString() || null)
            : (cheque.bankAccountId || null),
          debit: new Prisma.Decimal(0),
          credit: cheque.amount,
          description: `تسویه اسناد دریافتی با وصول چک شماره ${cheque.chequeNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند وصول چک صیادی شماره ${cheque.chequeNumber} به مبلغ ${cheque.amount.toNumber().toLocaleString('fa-IR')} تومان`,
          type: VoucherType.RECEIPT,
          referenceModule: 'CHEQUE_CLEAR',
          referenceId: cheque.id,
          idempotencyKey: `CHQ-CLR-${cheque.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.cheque.update({
        where: { id: chequeId },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting cheque clear voucher:', err);
    }

    return (await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true, bankAccount: true },
    })) || updated;
  }

  /**
   * اعلام برگشت چک صیادی (واخواست چک و احیای بدهی مشتری)
   * Dr: حساب‌های دریافتنی تجاری - مشتریان (۱۱۰۳۰۱)
   * Cr: اسناد دریافتنی در جریان وصول (۱۱۰۴۰۲) یا نزد صندوق (۱۱۰۴۰۱)
   */
  static async bounceCheque(
    chequeId: string,
    bounceReason: string,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const cheque = await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true },
    });

    if (!cheque) throw new Error('چک صیادی یافت نشد.');
    if (cheque.status === ChequeStatus.CLEARED) {
      throw new Error('چک وصول‌شده قابل برگشت زدن مستقیم نیست.');
    }

    const wasDeposited = cheque.status === ChequeStatus.DEPOSITED;

    // ۱. به‌روزرسانی وضعیت چک
    const updated = await client.cheque.update({
      where: { id: chequeId },
      data: {
        status: ChequeStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: bounceReason || 'کسری موجودی / اعلام بانک',
      },
    });

    // ۲. به‌روزرسانی رتبه ریسک مشتری در صورت وجود
    if (cheque.customerId) {
      await client.customer.update({
        where: { id: cheque.customerId },
        data: {
          riskRating: 'C', // ارتقای ریسک به پرخطر
          creditBlockReason: `دارای چک صیادی برگشتی به شناسه ${cheque.sayadId}`,
        },
      });
    }

    // ۳. صدور سند دوبل احیای بدهی مشتری
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const mapping = await AccountingMappingEngine.getAccountsForTrigger(
        MappingTrigger.CHEQUE_BOUNCE,
        companyId
      );

      let creditAccountId = mapping.creditAccountId; // ۱۱۰۴۰۲
      if (!wasDeposited) {
        const portfolioAcc = await client.account.findUnique({
          where: { code: '110401' },
        });
        if (portfolioAcc) creditAccountId = portfolioAcc.id;
      }

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: حساب‌های دریافتنی مشتریان (۱۱۰۳۰۱) - احیای طلب
        {
          accountId: mapping.debitAccountId,
          detail1Type: 'CUSTOMER',
          detail1Id: cheque.customerId ? cheque.customerId.toString() : null,
          debit: cheque.amount,
          credit: new Prisma.Decimal(0),
          description: `برگشت چک صیادی ${cheque.sayadId} و احیای بدهی مشتری (${bounceReason})`,
        },
        // بستانکار: اسناد دریافتنی در جریان وصول یا نزد صندوق
        {
          accountId: creditAccountId,
          detail1Type: wasDeposited ? 'BANK' : 'CUSTOMER',
          detail1Id: wasDeposited
            ? (cheque.bankAccountId || null)
            : (cheque.customerId?.toString() || null),
          debit: new Prisma.Decimal(0),
          credit: cheque.amount,
          description: `برگشت از اسناد با واخواست چک صیادی ${cheque.chequeNumber}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند واخواست و برگشت چک صیادی شماره ${cheque.chequeNumber} مشتری ${cheque.customer?.name || ''} - علت: ${bounceReason}`,
          type: VoucherType.RECEIPT,
          referenceModule: 'CHEQUE_BOUNCE',
          referenceId: cheque.id,
          idempotencyKey: `CHQ-BNC-${cheque.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.cheque.update({
        where: { id: chequeId },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting cheque bounce voucher:', err);
    }

    return (await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true, bankAccount: true },
    })) || updated;
  }

  /**
   * انتقال / خرج کردن چک صیادی به تامین‌کننده (ظهرنویسی الکترونیکی در پیچک)
   * Dr: حساب‌های پرداختنی تجاری - تامین‌کنندگان (۲۱۰۱۰۱)
   * Cr: اسناد دریافتنی تجاری - نزد صندوق (۱۱۰۴۰۱)
   */
  static async transferCheque(
    chequeId: string,
    supplierName: string,
    description?: string,
    externalTx?: Prisma.TransactionClient
  ) {
    const client = externalTx || db;

    const cheque = await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true },
    });

    if (!cheque) throw new Error('چک صیادی یافت نشد.');
    if (cheque.status !== ChequeStatus.RECEIVED && cheque.status !== ChequeStatus.IN_PORTFOLIO) {
      throw new Error(`چک در وضعیت ${cheque.status} قابل واگذاری یا خرج کردن به تامین‌کننده نیست.`);
    }

    // ۱. به‌روزرسانی وضعیت چک
    const updated = await client.cheque.update({
      where: { id: chequeId },
      data: {
        status: ChequeStatus.TRANSFERRED,
        description: description
          ? `${cheque.description ? cheque.description + ' | ' : ''}خرج شده به: ${supplierName} (${description})`
          : `${cheque.description ? cheque.description + ' | ' : ''}خرج شده به: ${supplierName}`,
      },
    });

    // ۲. صدور سند حسابداری دوبل خرج کردن چک
    try {
      const defaultCompany = await client.company.findFirst({
        where: { isDefault: true },
      });
      const companyId = defaultCompany?.id || null;

      const supplierAcc = await client.account.findUnique({
        where: { code: '210101' },
      });
      const portfolioAcc = await client.account.findUnique({
        where: { code: '110401' },
      });

      if (!supplierAcc || !portfolioAcc) {
        throw new Error('حساب‌های معین ۲۱۰۱۰۱ یا ۱۱۰۴۰۱ یافت نشدند.');
      }

      const entries: CreateJournalEntryInput[] = [
        // بدهکار: حساب‌های پرداختنی تجاری - تامین‌کنندگان (۲۱۰۱۰۱)
        {
          accountId: supplierAcc.id,
          detail1Type: 'SUPPLIER',
          detail1Id: null,
          debit: cheque.amount,
          credit: new Prisma.Decimal(0),
          description: `خرج چک صیادی ${cheque.sayadId} به ${supplierName}`,
        },
        // بستانکار: اسناد دریافتنی نزد صندوق (۱۱۰۴۰۱)
        {
          accountId: portfolioAcc.id,
          detail1Type: 'CUSTOMER',
          detail1Id: cheque.customerId ? cheque.customerId.toString() : null,
          debit: new Prisma.Decimal(0),
          credit: cheque.amount,
          description: `خروج چک ${cheque.chequeNumber} از صندوق اسناد بابت واگذاری به ${supplierName}`,
        },
      ];

      const voucher = await VoucherService.createVoucher(
        {
          voucherDate: new Date(),
          description: `سند خرج چک صیادی شماره ${cheque.chequeNumber} به ${supplierName} به مبلغ ${cheque.amount.toNumber().toLocaleString('fa-IR')} تومان`,
          type: VoucherType.PAYMENT,
          referenceModule: 'CHEQUE_TRANSFER',
          referenceId: cheque.id,
          idempotencyKey: `CHQ-XFER-${cheque.id}`,
          companyId,
          entries,
        },
        client
      );

      const finalized = await VoucherService.finalizeVoucher(voucher.id);

      await client.cheque.update({
        where: { id: chequeId },
        data: { journalVoucherId: finalized.id },
      });
    } catch (err) {
      console.error('Error posting cheque transfer voucher:', err);
    }

    const fresh = await client.cheque.findUnique({
      where: { id: chequeId },
      include: { customer: true, bankAccount: true },
    });

    return {
      ...(fresh || updated),
      transferredTo: supplierName,
    };
  }
}
