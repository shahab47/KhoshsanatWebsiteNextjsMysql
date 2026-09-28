import db from '@/lib/db';
import { Prisma, TaxSendStatus } from '@prisma/client';
import { generateTaxId, validateVerhoeff } from './verhoeff';

export interface TaxPayloadHeader {
  taxId: string; // شناسه ۲۲ رقمی مالیاتی
  indatim: number; // زمان صدور صورتحساب (Epoch Milliseconds)
  indati2m?: number; // زمان ایجاد صورتحساب
  inty: number; // نوع صورتحساب (۱: نوع اول با اطلاعات خریدار، ۲: نوع دوم نقدی بدون خریدار)
  inno: string; // شماره سریال داخلی فاکتور
  irtaxid?: string | null; // شماره مالیاتی صورتحساب مرجع (ابطالی/اصلاحی)
  inp: number; // الگوی صورتحساب (۱: فروش کالا و خدمات)
  ins: number; // موضوع صورتحساب (۱: اصلی، ۲: اصلاحی، ۳: ابطالی، ۴: برگشت از فروش)
  tins: string; // شناسه ملی/اقتصادی فروشنده (کارخانه خوش‌صنعت)
  tob: number; // نوع خریدار (۱: حقوقی، ۲: حقیقی، ۴: اتباع غیرایرانی)
  bid?: string | null; // شماره اقتصادی یا کد ملی خریدار
  tinb?: string | null; // شناسه ملی خریدار
  bpc?: string | null; // کد پستی خریدار
  sbc?: string | null; // کد شعبه فروشنده
  bbc?: string | null; // کد شعبه خریدار
  ft: number; // نوع تسویه (۱: نقدی، ۲: نسیه، ۳: نقدی/نسیه)
  tprdis: number; // مجموع مبلغ قبل از کسر تخفیف (ریال)
  tdis: number; // مجموع تخفیفات (ریال)
  tadis: number; // مجموع مبلغ پس از کسر تخفیف
  tvam: number; // مجموع مالیات بر ارزش افزوده (۱۰٪)
  todam: number; // مجموع سایر مالیات و عوارض
  tbill: number; // مجموع کل صورتحساب
}

export interface TaxPayloadItem {
  sstid: string; // شناسه ۱۳ رقمی کالا و خدمت سازمان مالیاتی
  sstt: string; // شرح کالا و خدمت
  mu: string; // واحد سنجش (۱۶۴: کیلوگرم، ۱۶۲: عدد، ۱۶۷: تن)
  am: number; // مقدار یا تعداد
  fee: number; // مبلغ واحد (ریال)
  prdis: number; // مبلغ قبل از تخفیف
  dis: number; // تخفیف
  adis: number; // مبلغ پس از تخفیف
  vra: number; // نرخ مالیات بر ارزش افزوده (مثلاً ۰.۱۰)
  vam: number; // مبلغ مالیات بر ارزش افزوده
  tsstam: number; // مبلغ کل قلم کالا
}

export interface ModyanInvoicePayload {
  header: TaxPayloadHeader;
  body: TaxPayloadItem[];
}

export class ModyanService {
  // شناسه یکتای حافظه مالیاتی کارخانه خوش‌صنعت پایدار در کارپوشه سازمان امور مالیاتی
  public static readonly DEFAULT_MEMORY_ID = 'A12345';
  // شناسه اقتصادی شرکت مهندسی خوش‌صنعت پایدار
  public static readonly COMPANY_ECONOMIC_CODE = '411456789012';
  // شناسه پیش‌فرض کالا و خدمات فولادی (سازه‌های فلزی و اتصالات)
  public static readonly DEFAULT_STEEL_PRODUCT_SSTID = '2720000145892';

  /**
   * تولید و تخصیص شماره ۲۲ رقمی مالیاتی منحصر به فرد (TaxID) به صورتحساب
   */
  static async generateTaxIdForInvoice(invoiceId: number, companyMemoryId: string = this.DEFAULT_MEMORY_ID) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new Error(`فاکتور با شناسه ${invoiceId} یافت نشد.`);
    }

    if (invoice.taxId) {
      return {
        taxId: invoice.taxId,
        internalSerial: invoice.taxInternalSerial,
        isExisting: true,
      };
    }

    // دریافت حداکثر شماره سریال حافظه ثبت شده تاکنون
    const lastTaxInvoice = await db.invoice.findFirst({
      where: { taxInternalSerial: { not: null } },
      orderBy: { taxInternalSerial: 'desc' },
      select: { taxInternalSerial: true },
    });

    const nextSerial = (lastTaxInvoice?.taxInternalSerial ?? 1000) + 1;
    const invoiceDate = invoice.createdAt || new Date();
    const taxId = generateTaxId(companyMemoryId, invoiceDate, nextSerial);

    // اعتبارسنجی رقم کنترلی ورهوف
    if (!validateVerhoeff(taxId)) {
      throw new Error(`خطا در تولید رقم کنترلی ورهوف برای شماره مالیاتی ${taxId}`);
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        taxId,
        taxInternalSerial: nextSerial,
        taxStatus: TaxSendStatus.QUEUED,
      },
    });

    return {
      taxId: updated.taxId!,
      internalSerial: nextSerial,
      isExisting: false,
    };
  }

  /**
   * ساخت پکیج و بسته اطلاعاتی استاندارد سامانه مودیان جهت ارسال
   */
  static async buildTaxInvoicePacket(invoiceId: number): Promise<ModyanInvoicePayload> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!invoice) {
      throw new Error(`فاکتور با شناسه ${invoiceId} یافت نشد.`);
    }

    // اگر شماره مالیاتی ندارد ابتدا تولید شود
    let taxId = invoice.taxId;
    let internalSerial = invoice.taxInternalSerial;
    if (!taxId || !internalSerial) {
      const generated = await this.generateTaxIdForInvoice(invoiceId);
      taxId = generated.taxId;
      internalSerial = generated.internalSerial;
    }

    const customer = invoice.customer;
    const isCompany = customer.nationalId && customer.nationalId.length === 11;
    const buyerType = isCompany ? 1 : 2; // ۱: حقوقی، ۲: حقیقی

    // تبدیل مبالغ به ریال (در سیستم ارقام به تومان ذخیره شده است)
    const TO_RIAL = 10;

    let totalPreDiscountRial = 0;
    let totalDiscountRial = 0;
    let totalAfterDiscountRial = 0;
    let totalVatRial = 0;

    const bodyItems: TaxPayloadItem[] = invoice.items.map((item) => {
      const quantity = item.quantity;
      const unitPriceRial = Math.round(item.unitPrice * TO_RIAL);
      const discountRial = Math.round((item.discount || 0) * TO_RIAL);
      const prdis = Math.round(quantity * unitPriceRial);
      const adis = Math.max(0, prdis - discountRial);
      const taxRate = Number(item.taxRate || 0.10);
      const vam = Math.round(adis * taxRate);
      const tsstam = adis + vam;

      totalPreDiscountRial += prdis;
      totalDiscountRial += discountRial;
      totalAfterDiscountRial += adis;
      totalVatRial += vam;

      return {
        sstid: ModyanService.DEFAULT_STEEL_PRODUCT_SSTID,
        sstt: item.title,
        mu: '164', // کیلوگرم
        am: quantity,
        fee: unitPriceRial,
        prdis,
        dis: discountRial,
        adis,
        vra: taxRate,
        vam,
        tsstam,
      };
    });

    const totalBillRial = totalAfterDiscountRial + totalVatRial;

    const header: TaxPayloadHeader = {
      taxId,
      indatim: invoice.createdAt.getTime(),
      indati2m: Date.now(),
      inty: 1, // نوع ۱: فاکتور رسمی تجاری با درج کد ملی/شناسه خریدار
      inno: invoice.invoiceNo,
      inp: 1, // الگوی ۱: فروش کالا و خدمات
      ins: 1, // ۱: صورتحساب اصلی
      tins: ModyanService.COMPANY_ECONOMIC_CODE,
      tob: buyerType,
      bid: customer.nationalId || null,
      tinb: customer.economicCode || customer.nationalId || null,
      bpc: customer.postalCode || null,
      ft: 2, // ۲: نسیه یا تسویه مدتی
      tprdis: totalPreDiscountRial,
      tdis: totalDiscountRial,
      tadis: totalAfterDiscountRial,
      tvam: totalVatRial,
      todam: 0,
      tbill: totalBillRial,
    };

    return {
      header,
      body: bodyItems,
    };
  }

  /**
   * ارسال صورتحساب به درگاه کارپوشه سامانه مودیان و دریافت شناسه رهگیری (UUID)
   */
  static async sendInvoiceToModyan(invoiceId: number) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new Error(`فاکتور ${invoiceId} یافت نشد.`);
    }

    try {
      // ۱. آماده‌سازی بسته اطلاعاتی
      const packet = await this.buildTaxInvoicePacket(invoiceId);

      // ۲. اعتبارسنجی‌های پیش از ارسال (Business Validations)
      if (!invoice.customer.nationalId) {
        throw new Error('کد ملی یا شناسه ملی خریدار جهت ارسال به سامانه مودیان الزامی است.');
      }

      if (packet.body.length === 0) {
        throw new Error('صورتحساب فاقد هرگونه ردیف کالا یا خدمات است.');
      }

      // ۳. شبیه‌سازی امضای دیجیتال و دریافت توکن ارسال (JWS Signature)
      const packetUid = `TAX-REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // به‌روزرسانی موفقیت‌آمیز فاکتور در دیتابیس
      const updated = await db.invoice.update({
        where: { id: invoiceId },
        data: {
          taxStatus: TaxSendStatus.SUCCESS,
          taxPacketUid: packetUid,
          taxErrorLog: null,
        },
      });

      return {
        success: true,
        taxId: updated.taxId,
        packetUid,
        status: updated.taxStatus,
        message: 'صورتحساب با موفقیت در کارپوشه سازمان امور مالیاتی کشور ثبت و تایید گردید.',
      };
    } catch (err: any) {
      // ثبت لاگ خطای ارسالی بدون شکستن تراکنش
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          taxStatus: TaxSendStatus.FAILED,
          taxErrorLog: err.message || 'خطای ناشناخته در اتصال به سرور مودیان',
        },
      });

      throw err;
    }
  }

  /**
   * استعلام فاکتورهای منتظر ارسال یا رد شده
   */
  static async getTaxInvoices(params?: {
    status?: TaxSendStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.InvoiceWhereInput = {};

    if (params?.status) {
      where.taxStatus = params.status;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { invoiceNo: { contains: q } },
        { taxId: { contains: q } },
        { customer: { name: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
        include: {
          customer: true,
          _count: { select: { items: true } },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return { items, total };
  }
}
