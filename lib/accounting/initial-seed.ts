import db from '@/lib/db';
import {
  AccountNature,
  AccountType,
  MappingTrigger,
  VoucherType,
  VoucherStatus,
  Prisma,
} from '@prisma/client';
import { SequenceService } from './sequence-service';
import { PeriodService } from './period-service';
import { DEFAULT_ACCOUNTING_MAPPINGS } from './accounting-mapping';

export async function seedAccountingCore() {
  console.log('--- آغاز استقرار هسته حسابداری و داده‌های پایه سازمانی ---');

  // ۱. شرکت پیش‌فرض (Default Company)
  const company = await db.company.upsert({
    where: { code: 'KS-ENG' },
    create: {
      code: 'KS-ENG',
      name: 'شرکت مهندسی خوش‌صنعت پایدار',
      nationalId: '14010203040',
      economicCode: '411516171819',
      registrationNo: '582910',
      currency: 'IRR',
      isDefault: true,
    },
    update: {
      name: 'شرکت مهندسی خوش‌صنعت پایدار',
      isDefault: true,
    },
  });

  // ۲. شعبه پیش‌فرض (Default Branch)
  const branch = await db.branch.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'CENTRAL',
      },
    },
    create: {
      companyId: company.id,
      code: 'CENTRAL',
      name: 'دفتر مرکزی و مجتمع کارخانجات صنعتی',
      isDefault: true,
    },
    update: {},
  });

  // ۳. مراکز هزینه استاندارد
  const costCentersData = [
    { code: 'CC-PROD-01', name: 'خط تولید اتصالات و براکت‌های مهندسی' },
    { code: 'CC-SALES-01', name: 'واحد بازرگانی و فروش' },
    { code: 'CC-ADMIN-01', name: 'امور مالی و اداری' },
  ];

  for (const cc of costCentersData) {
    await db.costCenter.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: cc.code,
        },
      },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code: cc.code,
        name: cc.name,
      },
      update: {
        name: cc.name,
      },
    });
  }

  // ۳.۱. انبارهای صنعتی چهارگانه کارخانه
  const warehousesData = [
    { code: 'WH-RAW-01', name: 'انبار مواد اولیه و مقاطع فولادی', type: 'RAW_MATERIALS' as const },
    { code: 'WH-WIP-01', name: 'انبار قطعات در جریان ساخت (پای خطوط)', type: 'WORK_IN_PROGRESS' as const },
    { code: 'WH-FG-01', name: 'انبار محصول نهایی و قطعات آماده بارگیری', type: 'FINISHED_GOODS' as const },
    { code: 'WH-SCRAP-01', name: 'انبار ضایعات و قراضه فلزی', type: 'SCRAP' as const },
  ];

  for (const wh of warehousesData) {
    await db.warehouse.upsert({
      where: { code: wh.code },
      create: {
        branchId: branch.id,
        code: wh.code,
        name: wh.name,
        type: wh.type,
      },
      update: {
        name: wh.name,
        type: wh.type,
      },
    });
  }

  // ۳.۲. حساب‌های بانکی کارخانه خوش‌صنعت پایدار
  const defaultBank = await db.bankAccount.findFirst({
    where: { companyId: company.id, isDefault: true },
  });
  if (!defaultBank) {
    await db.bankAccount.create({
      data: {
        companyId: company.id,
        bankName: 'بانک ملت',
        branchName: 'شعبه مرکزی بازار آهن شادآباد',
        branchCode: '6520',
        accountNumber: '4852963011',
        iban: 'IR820120000000004852963011',
        currency: 'IRR',
        isDefault: true,
        isActive: true,
        initialBalance: new Prisma.Decimal(150000000),
      },
    });
  }

  // ۳.۳. صندوق تنخواه‌گردان مرکزی کارخانه
  await db.pettyCashFund.upsert({
    where: { code: 'PC-FACTORY-01' },
    create: {
      companyId: company.id,
      code: 'PC-FACTORY-01',
      title: 'صندوق تنخواه‌گردان مرکزی کارخانه شادآباد',
      holderName: 'مسئول مالی و تنخواه‌دار کارخانه',
      holderPhone: '09121234567',
      limitAmount: new Prisma.Decimal(30000000),
      currentBalance: new Prisma.Decimal(10000000),
    },
    update: {
      title: 'صندوق تنخواه‌گردان مرکزی کارخانه شادآباد',
    },
  });

  // ۴. سال مالی ۱۴۰۵ و دوره‌های ۱۲ گانه
  const existingFiscalYear = await db.fiscalYear.findUnique({
    where: {
      companyId_year: {
        companyId: company.id,
        year: 1405,
      },
    },
  });

  if (!existingFiscalYear) {
    await PeriodService.createFiscalYear({
      companyId: company.id,
      year: 1405,
      title: 'سال مالی ۱۴۰۵',
      startDate: new Date('2026-03-21T00:00:00.000Z'),
      endDate: new Date('2027-03-20T23:59:59.999Z'),
    });
  }

  // ۵. درخت استاندارد حساب‌ها (Chart of Accounts)
  const accountsData = [
    // --- سطح ۱: گروه‌ها ---
    { code: '1', name: 'دارایی‌های جاری', level: 1, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: null },
    { code: '2', name: 'بدهی‌های جاری', level: 1, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: null },
    { code: '3', name: 'حقوق صاحبان سهام و سرمایه', level: 1, nature: AccountNature.CREDIT, type: AccountType.EQUITY, parentCode: null },
    { code: '4', name: 'درآمدها و فروش', level: 1, nature: AccountNature.CREDIT, type: AccountType.REVENUE, parentCode: null },
    { code: '5', name: 'بهای تمام‌شده کالای فروش‌رفته', level: 1, nature: AccountNature.DEBIT, type: AccountType.COGS, parentCode: null },
    { code: '6', name: 'هزینه‌های عملیاتی و اداری', level: 1, nature: AccountNature.DEBIT, type: AccountType.EXPENSE, parentCode: null },

    // --- سطح ۲: کل ---
    { code: '11', name: 'موجودی نقد و بانک', level: 2, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '1' },
    { code: '12', name: 'حساب‌ها و اسناد دریافتنی تجاری', level: 2, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '1' },
    { code: '14', name: 'پیش‌پرداخت‌ها و سفارشات', level: 2, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '1' },
    { code: '15', name: 'موجودی مواد و کالا', level: 2, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '1' },
    { code: '21', name: 'حساب‌ها و اسناد پرداختنی تجاری', level: 2, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '2' },
    { code: '22', name: 'پیش‌دریافت از مشتریان', level: 2, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '2' },
    { code: '23', name: 'سایر بدهی‌ها و ذخایر', level: 2, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '2' },
    { code: '31', name: 'سرمایه و تراز افتتاحیه', level: 2, nature: AccountNature.CREDIT, type: AccountType.EQUITY, parentCode: '3' },
    { code: '33', name: 'سود و زیان انباشته و جاری', level: 2, nature: AccountNature.CREDIT, type: AccountType.EQUITY, parentCode: '3' },
    { code: '41', name: 'فروش ناخالص کالا و خدمات', level: 2, nature: AccountNature.CREDIT, type: AccountType.REVENUE, parentCode: '4' },
    { code: '51', name: 'بهای تمام‌شده کالای فروش‌رفته (COGS)', level: 2, nature: AccountNature.DEBIT, type: AccountType.COGS, parentCode: '5' },
    { code: '61', name: 'هزینه‌های عمومی و اداری', level: 2, nature: AccountNature.DEBIT, type: AccountType.EXPENSE, parentCode: '6' },

    // --- سطح ۳: معین ---
    { code: '110101', name: 'موجودی نقد و بانک‌ها', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '11' },
    { code: '110201', name: 'صندوق و تنخواه‌گردان کارخانه', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '11' },
    { code: '110301', name: 'حساب‌های دریافتنی تجاری - مشتریان', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '12' },
    { code: '110401', name: 'اسناد دریافتنی تجاری - چک‌های نزد صندوق', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '12' },
    { code: '110402', name: 'اسناد دریافتنی تجاری - در جریان وصول (واگذار شده به بانک)', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '12' },
    { code: '110501', name: 'موجودی مواد اولیه و مصالح فولادی', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '15' },
    { code: '110502', name: 'کالای در جریان ساخت (WIP)', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '15' },
    { code: '110503', name: 'موجودی کالای ساخته‌شده آماده بارگیری', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '15' },
    { code: '110504', name: 'انبار ضایعات و قراضه', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '15' },
    { code: '110601', name: 'مالیات بر ارزش افزوده خرید (اعتبار مالیاتی)', level: 3, nature: AccountNature.DEBIT, type: AccountType.ASSET, parentCode: '14' },
    { code: '210101', name: 'حساب‌های پرداختنی تجاری - تامین‌کنندگان', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '21' },
    { code: '210401', name: 'اسناد پرداختنی تجاری - چک‌های صادره', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '21' },
    { code: '210201', name: 'پیش‌دریافت از مشتریان', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '22' },
    { code: '210301', name: 'حقوق و دستمزد پرداختنی', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '23' },
    { code: '210601', name: 'مالیات بر ارزش افزوده فروش پرداختنی', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '23' },
    { code: '210602', name: 'بیمه تامین اجتماعی پرداختنی', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '23' },
    { code: '210603', name: 'مالیات حقوق پرداختنی', level: 3, nature: AccountNature.CREDIT, type: AccountType.LIABILITY, parentCode: '23' },
    { code: '320101', name: 'تراز افتتاحیه', level: 3, nature: AccountNature.DUAL, type: AccountType.EQUITY, parentCode: '31' },
    { code: '330101', name: 'سود و زیان انباشته', level: 3, nature: AccountNature.DUAL, type: AccountType.EQUITY, parentCode: '33' },
    { code: '330201', name: 'خلاصه سود و زیان سال مالی', level: 3, nature: AccountNature.DUAL, type: AccountType.EQUITY, parentCode: '33' },
    { code: '410101', name: 'درآمد حاصل از فروش قطعات و اتصالات', level: 3, nature: AccountNature.CREDIT, type: AccountType.REVENUE, parentCode: '41' },
    { code: '510101', name: 'بهای تمام‌شده کالای فروش‌رفته (COGS)', level: 3, nature: AccountNature.DEBIT, type: AccountType.COGS, parentCode: '51' },
    { code: '610101', name: 'هزینه دستمزد و حقوق پرسنل', level: 3, nature: AccountNature.DEBIT, type: AccountType.EXPENSE, parentCode: '61' },
    { code: '610201', name: 'هزینه کسری و انحراف انبارگردانی', level: 3, nature: AccountNature.DEBIT, type: AccountType.EXPENSE, parentCode: '61' },
  ];

  // درج به ترتیب سطوح
  for (let l = 1; l <= 3; l++) {
    const levelAccounts = accountsData.filter((a) => a.level === l);
    for (const acc of levelAccounts) {
      let parentId: string | null = null;
      if (acc.parentCode) {
        const parent = await db.account.findUnique({
          where: { code: acc.parentCode },
        });
        parentId = parent?.id || null;
      }

      await db.account.upsert({
        where: { code: acc.code },
        create: {
          code: acc.code,
          name: acc.name,
          level: acc.level,
          nature: acc.nature,
          accountType: acc.type,
          parentId,
          companyId: company.id,
        },
        update: {
          name: acc.name,
          nature: acc.nature,
          accountType: acc.type,
          parentId,
        },
      });
    }
  }

  // ۶. نگاشت پیش‌فرض رویدادهای مالی (Accounting Mappings)
  for (const m of DEFAULT_ACCOUNTING_MAPPINGS) {
    const debit = await db.account.findUnique({ where: { code: m.debitAccountCode } });
    const credit = await db.account.findUnique({ where: { code: m.creditAccountCode } });

    if (debit && credit) {
      await db.accountingMapping.upsert({
        where: {
          companyId_trigger: {
            companyId: company.id,
            trigger: m.trigger,
          },
        },
        create: {
          companyId: company.id,
          trigger: m.trigger,
          debitAccountId: debit.id,
          creditAccountId: credit.id,
          description: m.description,
        },
        update: {
          debitAccountId: debit.id,
          creditAccountId: credit.id,
          description: m.description,
        },
      });
    }
  }

  // ۷. تنظیم کف شماره‌اندازهای اسناد
  await SequenceService.setFloorValue('VOUCHER', 1000, company.id);
  await SequenceService.setFloorValue('INVOICE', 3, company.id);
  await SequenceService.setFloorValue('DELIVERY', 1, company.id);
  await SequenceService.setFloorValue('RECEIPT', 2, company.id);
  await SequenceService.setFloorValue('WAYBILL', 1, company.id);
  await SequenceService.setFloorValue('SCALE_TICKET', 1, company.id);

  // ۸. صدور سند تراز افتتاحیه و موازنه ۱۰۰٪ داده‌های واقعی مشتری فعلی
  await reconcileLegacyOpeningData(company.id);

  console.log('✅ استقرار هسته حسابداری و موازنه داده‌های پیشین با موفقیت انجام شد.');
}

/**
 * موازنه دقیق داده‌های تاریخی:
 * مشتری شناسه ۴ دارای ۵۱,۰۴۵ تومان فاکتور و ۴,۵۴۶,۴۵۴ تومان پرداختی با مانده ۴,۴۹۵,۴۰۹- تومان است.
 * صدور سند تراز افتتاحیه با آرتیکل‌های معین مشتری.
 */
async function reconcileLegacyOpeningData(companyId: string) {
  const OPENING_IDEMPOTENCY = 'OPENING-RECONCILIATION-1405-V1';
  const existingOpening = await db.journalVoucher.findUnique({
    where: { idempotencyKey: OPENING_IDEMPOTENCY },
  });

  if (existingOpening) {
    return;
  }

  const arAccount = await db.account.findUnique({ where: { code: '110301' } }); // معین مشتریان
  const openingAccount = await db.account.findUnique({ where: { code: '320101' } }); // تراز افتتاحیه
  const bankAccount = await db.account.findUnique({ where: { code: '110101' } }); // نقد و بانک

  if (!arAccount || !openingAccount || !bankAccount) {
    console.warn('حساب‌های لازم برای سند تراز افتتاحیه یافت نشدند.');
    return;
  }

  // داده‌های فاکتورها و پرداخت‌های پیشین مشتری شماره ۴:
  // جمع فاکتورها: ۵۱,۰۴۵
  // جمع پرداختی‌ها: ۴,۵۴۶,۴۵۴
  const totalInvoiced = new Prisma.Decimal(51045);
  const totalPaid = new Prisma.Decimal(4546454);

  // آرتیکل ۱: بدهکار کردن معین مشتری ۴ بابت فاکتورهای تاریخی (INV-000001 تا INV-000003)
  // آرتیکل ۲: بستانکار کردن تراز افتتاحیه
  // آرتیکل ۳: بدهکار کردن بانک بابت وصولی‌های تاریخی
  // آرتیکل ۴: بستانکار کردن معین مشتری ۴ بابت تسویه/پیش‌دریافت تاریخی
  const entries = [
    {
      accountId: arAccount.id,
      detail1Type: 'CUSTOMER',
      detail1Id: '4',
      debit: totalInvoiced,
      credit: new Prisma.Decimal(0),
      description: 'ثبت بدهی ناشی از فاکتورهای تاریخی INV-000001 تا INV-000003',
      rowOrder: 1,
    },
    {
      accountId: openingAccount.id,
      detail1Type: null,
      detail1Id: null,
      debit: new Prisma.Decimal(0),
      credit: totalInvoiced,
      description: 'تراز افتتاحیه - فروش‌های انتقالی دوره قبل',
      rowOrder: 2,
    },
    {
      accountId: bankAccount.id,
      detail1Type: null,
      detail1Id: null,
      debit: totalPaid,
      credit: new Prisma.Decimal(0),
      description: 'موجودی نقدی حاصل از واریزی‌های انتقالی مشتریان دوره قبل',
      rowOrder: 3,
    },
    {
      accountId: arAccount.id,
      detail1Type: 'CUSTOMER',
      detail1Id: '4',
      debit: new Prisma.Decimal(0),
      credit: totalPaid,
      description: 'ثبت پرداختی‌ها و پیش‌دریافت انتقالی مشتری شناسه ۴',
      rowOrder: 4,
    },
  ];

  const totalVoucherAmount = totalInvoiced.add(totalPaid);

  const { rawNumber } = await SequenceService.nextNumber('VOUCHER', companyId);

  await db.journalVoucher.create({
    data: {
      voucherNo: rawNumber,
      voucherDate: new Date('2026-03-21T00:00:00.000Z'),
      type: VoucherType.OPENING,
      description: 'سند تراز افتتاحیه و انتقال سوابق مالی و فاکتورهای پیشین به هسته حسابداری ERP',
      status: VoucherStatus.FINALIZED,
      referenceModule: 'OPENING',
      referenceId: 'LEGACY-MIGRATION',
      idempotencyKey: OPENING_IDEMPOTENCY,
      companyId,
      totalDebit: totalVoucherAmount,
      totalCredit: totalVoucherAmount,
      postedAt: new Date(),
      entries: {
        create: entries,
      },
    },
  });

  console.log('✅ سند تراز افتتاحیه شماره ۱۰۰۱ با موفقیت صادر و قطعی شد.');
}
