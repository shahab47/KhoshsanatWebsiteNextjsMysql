import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { Prisma, PurchaseOrderStatus, GoodsReceiptStatus, SupplierInvoiceStatus, ChequeStatus, ChequeType } from '@prisma/client';
import { SupplierService } from '@/lib/procurement/supplier-service';
import { PurchaseOrderService } from '@/lib/procurement/purchase-order-service';
import { GoodsReceiptService } from '@/lib/procurement/goods-receipt-service';
import { SupplierInvoiceService } from '@/lib/procurement/supplier-invoice-service';
import { SupplierPaymentService } from '@/lib/procurement/supplier-payment-service';
import { InventoryService } from '@/lib/warehouse/inventory-service';
import { ChequeService } from '@/lib/treasury/cheque-service';

describe('Phase 5: Procurement, Supplier Management & Raw Materials Inbound Integration', () => {
  let testSupplierId: string;
  let testProductId: number;
  let testWarehouseId: string;
  let testBankAccountId: string;
  let testCustomerId: number;

  const createdOrderIds: string[] = [];
  const createdReceiptIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdChequeIds: string[] = [];

  beforeAll(async () => {
    // ۱. دریافت یا ایجاد انبار مواد اولیه WH-RAW-01
    let wh = await db.warehouse.findUnique({ where: { code: 'WH-RAW-01' } });
    if (!wh) {
      const branch = await db.branch.findFirst();
      wh = await db.warehouse.create({
        data: {
          code: 'WH-RAW-01',
          name: 'انبار مواد اولیه و مقاطع فولادی کارخانه',
          type: 'RAW_MATERIALS',
          branchId: branch?.id || 'branch-default',
        },
      });
    }
    testWarehouseId = wh.id;

    // ۲. ایجاد یا دریافت کالای مقطع فولادی تست (ورق سیاه ST37)
    let product = await db.product.findFirst({
      where: { title: { contains: 'ورق فولادی ST37 تست تدارکات' } },
    });
    if (!product) {
      let subcat = await db.subcategory.findFirst();
      if (!subcat) {
        let cat = await db.category.findFirst();
        if (!cat) {
          cat = await db.category.create({
            data: { title: 'مقاطع و آهن‌آلات', slug: `metals-${Date.now()}` },
          });
        }
        subcat = await db.subcategory.create({
          data: {
            title: 'ورق و پروفیل صنعتی',
            categoryId: cat.id,
          },
        });
      }

      product = await db.product.create({
        data: {
          title: 'ورق فولادی ST37 تست تدارکات',
          slug: `st37-sheet-${Date.now()}`,
          imageUrl: '/test.png',
          subcategoryId: subcat.id,
          description: 'ورق سیاه ضخامت ۱۵ میل برای تیرورق‌ها و اتصالات صنعتی',
          isRawMaterial: true,
        },
      });
    }
    testProductId = product.id;

    // ۳. ایجاد یا دریافت حساب بانکی تست کارخانه
    let bankAcc = await db.bankAccount.findFirst({
      where: { accountNumber: 'TEST-MELLAT-PO-99' },
    });
    if (!bankAcc) {
      const defaultCompany = await db.company.findFirst({ where: { isDefault: true } });
      const defaultBankAcc = await db.account.findUnique({ where: { code: '110101' } });
      bankAcc = await db.bankAccount.create({
        data: {
          company: defaultCompany ? { connect: { id: defaultCompany.id } } : undefined,
          bankName: 'بانک ملت',
          branchName: 'شعبه بازار آهن شادآباد',
          branchCode: '6520',
          accountNumber: 'TEST-MELLAT-PO-99',
          iban: 'IR990120000000008877665544',
          accountId: defaultBankAcc?.id,
          isActive: true,
        },
      });
    }
    testBankAccountId = bankAcc.id;

    // ۴. ایجاد مشتری تست جهت صدور چک صیادی برای تست ظهرنویسی
    const testCustomer = await db.customer.create({
      data: {
        name: 'شرکت مهندسی و ساختمانی البرز سازه',
        email: `alborz_proc_${Date.now()}@example.com`,
        phone: '02177889900',
        company: 'البرز سازه',
        nationalId: `1400${Date.now().toString().slice(-7)}`,
        economicCode: '411000999888',
        creditLimit: 300_000_000,
        riskRating: 'LOW',
      },
    });
    testCustomerId = testCustomer.id;
  });

  afterAll(async () => {
    // پاکسازی داده‌های تست با حفظ یکپارچگی ارجاعی
    try {
      for (const payId of createdPaymentIds) {
        await db.supplierPayment.delete({ where: { id: payId } }).catch(() => {});
      }
      for (const invId of createdInvoiceIds) {
        await db.supplierInvoice.delete({ where: { id: invId } }).catch(() => {});
      }
      for (const rId of createdReceiptIds) {
        await db.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: rId } }).catch(() => {});
        await db.goodsReceipt.delete({ where: { id: rId } }).catch(() => {});
      }
      for (const poId of createdOrderIds) {
        await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } }).catch(() => {});
        await db.purchaseOrder.delete({ where: { id: poId } }).catch(() => {});
      }
      for (const chqId of createdChequeIds) {
        await db.cheque.delete({ where: { id: chqId } }).catch(() => {});
      }
      if (testSupplierId) {
        await db.supplier.delete({ where: { id: testSupplierId } }).catch(() => {});
      }
      if (testCustomerId) {
        await db.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
      }
    } catch (err) {
      console.warn('Cleanup error in procurement integration tests:', err);
    }
  });

  // =========================================================================
  // ۱. تست چرخه تعریف و مشخصات تامین‌کننده
  // =========================================================================
  describe('۱. Supplier Management & Validation', () => {
    it('باید تامین‌کننده صنعتی جدید با تولید خودکار کد یکتا (SUP-) و اعتبارسنجی ثبت شود', async () => {
      const nationalId = `1010${Date.now().toString().slice(-7)}`;
      const supplier = await SupplierService.createSupplier({
        name: 'مجتمع فولاد سپهر ایرانیان (تست تدارکات)',
        companyName: 'شرکت صنایع فولاد سپهر سهامی خاص',
        nationalId,
        economicCode: '411555666777',
        phone: '02166332211',
        mobile: '09129998877',
        contactPerson: 'مهندس رضایی',
        bankName: 'بانک تجارت',
        bankAccount: '1234567890',
        bankIban: 'IR550180000000001234567890',
        creditLimit: 500_000_000,
        rating: 'A',
      });

      expect(supplier).toBeDefined();
      expect(supplier.id).toBeDefined();
      expect(supplier.code).toMatch(/^SUP-\d{6}$/);
      expect(supplier.name).toBe('مجتمع فولاد سپهر ایرانیان (تست تدارکات)');
      expect(Number(supplier.totalPayable)).toBe(0);
      expect(Number(supplier.creditLimit)).toBe(500_000_000);
      expect(supplier.rating).toBe('A');

      testSupplierId = supplier.id;
    });

    it('باید از ثبت تامین‌کننده تکراری با شناسه ملی یکسان جلوگیری کند', async () => {
      const existing = await db.supplier.findUnique({ where: { id: testSupplierId } });
      expect(existing?.nationalId).toBeDefined();

      await expect(
        SupplierService.createSupplier({
          name: 'تامین‌کننده جعلی با شناسه تکراری',
          nationalId: existing!.nationalId!,
        })
      ).rejects.toThrow(/قبلاً ثبت شده است/);
    });
  });

  // =========================================================================
  // ۲. تست ثبت سفارش خرید مقاطع فلزی (Industrial PO)
  // =========================================================================
  describe('۲. Purchase Order Lifecycle & 10% VAT Calculation', () => {
    let testPoId: string;

    it('باید سفارش خرید جدید را با محاسبه ارزش افزوده ۱۰٪، کرایه حمل و ردیف‌های کالا ثبت کند', async () => {
      // سفارش ۱۰,۰۰۰ کیلوگرم ورق با نرخ هر کیلو ۴۰,۰۰۰ تومان
      // ناخالص = ۴۰۰,۰۰۰,۰۰۰ تومان
      // مالیات ۱۰٪ = ۴۰,۰۰۰,۰۰۰ تومان
      // کرایه حمل = ۵,۰۰۰,۰۰۰ تومان
      // جمع کل = ۴۴۵,۰۰۰,۰۰۰ تومان
      const po = await PurchaseOrderService.createPurchaseOrder({
        supplierId: testSupplierId,
        expectedDate: new Date(Date.now() + 86400000 * 3), // ۳ روز آینده
        freightCost: 5_000_000,
        description: 'سفارش ورق سیاه ST37 جهت پروژه سوله شادآباد',
        items: [
          {
            productId: testProductId,
            orderedQty: 10_000, // ۱۰ تن
            unitPrice: 40_000,  // ۴۰ هزار تومان/کیلو
            taxRate: 10,
            uom: 'KG',
            steelGrade: 'ST37',
            heatNumber: 'HEAT-9840',
          },
        ],
      });

      expect(po).toBeDefined();
      expect(po.orderNo).toMatch(/^PO-\d{6}$/);
      expect(po.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(Number(po.subtotal)).toBe(400_000_000);
      expect(Number(po.taxAmount)).toBe(40_000_000);
      expect(Number(po.freightCost)).toBe(5_000_000);
      expect(Number(po.totalAmount)).toBe(445_000_000);
      expect(po.items).toHaveLength(1);
      expect(Number(po.items[0].orderedQty)).toBe(10_000);
      expect(Number(po.items[0].receivedQty)).toBe(0);

      testPoId = po.id;
      createdOrderIds.push(po.id);
    });

    it('باید سفارش خرید پیش‌نویس را به وضعیت APPROVED تغییر دهد', async () => {
      const approved = await PurchaseOrderService.approvePurchaseOrder(testPoId);
      expect(approved.status).toBe(PurchaseOrderStatus.APPROVED);
    });
  });

  // =========================================================================
  // ۳. تست توزین باسکول ورود بار (GRN) و انتقال به کاردکس میانگین موزون
  // =========================================================================
  describe('۳. Digital Weighbridge Scale Inbound & Warehouse Kardex Moving Average', () => {
    it('باید در صورت کوچکتر بودن وزن ناخالص از وزن خالی کامیون، خطای اعتبارسنجی باسکول صادر شود', async () => {
      await expect(
        GoodsReceiptService.createGoodsReceipt({
          supplierId: testSupplierId,
          scaleGrossKg: 5_000,  // پر
          scaleTareKg: 8_000,   // خالی (ناممکن!)
          items: [
            {
              productId: testProductId,
              receivedQty: 5_000,
              unitCost: 40_000,
            },
          ],
        })
      ).rejects.toThrow(/وزن ناخالص.*کمتر از وزن تار/);
    });

    it('باید قبض رسید انبار با توزین دقیق باسکول ثبت شده، مقادیر PO به‌روزرسانی و کاردکس شارژ شود', async () => {
      const po = await db.purchaseOrder.findFirst({
        where: { id: createdOrderIds[0] },
        include: { items: true },
      });
      expect(po).toBeDefined();
      const poItemId = po!.items[0].id;

      // توزین ورود تریلی: ناخالص ۲۴,۵۰۰ کیلو - تار ۱۴,۵۰۰ کیلو = خالص ۱۰,۰۰۰ کیلو
      const receipt = await GoodsReceiptService.createGoodsReceipt({
        supplierId: testSupplierId,
        purchaseOrderId: po!.id,
        warehouseId: testWarehouseId,
        scaleGrossKg: 24_500,
        scaleTareKg: 14_500,
        scaleTicketNo: 'SCALE-TK-8877',
        waybillNo: 'WB-TEH-5544',
        truckPlate: 'ایران ۲۲ - ۹۹۹ ع ۳۳',
        driverName: 'راننده اصغر کریمی',
        driverNationalId: '0012345678',
        driverPhone: '09120001122',
        heatNumber: 'HEAT-9840',
        qcPassed: true,
        items: [
          {
            purchaseOrderItemId: poItemId,
            productId: testProductId,
            receivedQty: 10_000, // ۱۰,۰۰۰ کیلوگرم
            unitCost: 40_000,
            steelGrade: 'ST37',
            heatNumber: 'HEAT-9840',
          },
        ],
      });

      expect(receipt).toBeDefined();
      expect(receipt.receiptNo).toMatch(/^GRN-\d{6}$/);
      expect(Number(receipt.scaleGrossKg)).toBe(24_500);
      expect(Number(receipt.scaleTareKg)).toBe(14_500);
      expect(Number(receipt.scaleNetKg)).toBe(10_000);
      expect(receipt.qcPassed).toBe(true);

      createdReceiptIds.push(receipt.id);

      // بررسی به‌روزرسانی سفارش خرید مرتبط:
      const updatedPo = await db.purchaseOrder.findUnique({
        where: { id: po!.id },
        include: { items: true },
      });
      expect(Number(updatedPo!.items[0].receivedQty)).toBe(10_000);
      expect(updatedPo!.status).toBe(PurchaseOrderStatus.COMPLETED);

      // بررسی کاردکس انبار مواد اولیه و میانگین موزون:
      const stock = await InventoryService.getCurrentStockAndAverageCost(testWarehouseId, testProductId);
      expect(stock.currentQuantity.toNumber()).toBeGreaterThanOrEqual(10_000);
      expect(stock.averageCost.toNumber()).toBe(40_000);
    });
  });

  // =========================================================================
  // ۴. تست فاکتور خرید (Supplier Invoice) با انطباق سه‌طرفه و سند دوبل مالی
  // =========================================================================
  describe('۴. Supplier Invoice & Double-Entry Journal Voucher (3-Way Matching)', () => {
    let testInvoiceId: string;

    it('باید فاکتور خرید ثبت شده و سند دوبل متوازن (Dr: ۱۱۰۵۰۱, Dr: ۱۱۰۶۰۱ / Cr: ۲۱۰۱۰۱) صادر گردد', async () => {
      // فاکتور خرید: ۴۰۰ میلیون کالا + ۴۰ میلیون مالیات ارزش افزوده + ۵ میلیون کرایه حمل = ۴۴۵ میلیون
      const invoice = await SupplierInvoiceService.createSupplierInvoice({
        supplierId: testSupplierId,
        purchaseOrderId: createdOrderIds[0],
        invoiceNo: 'TAX-INV-778899',
        invoiceDate: new Date(),
        amount: 400_000_000,
        taxAmount: 40_000_000,
        freightCost: 5_000_000,
        autoPostVoucher: true,
      });

      expect(invoice).toBeDefined();
      expect(invoice).not.toBeNull();
      expect(invoice!.systemNo).toMatch(/^SINV-\d{6}$/);
      expect(invoice!.invoiceNo).toBe('TAX-INV-778899');
      expect(Number(invoice!.finalAmount)).toBe(445_000_000);
      expect(Number(invoice!.paidAmount)).toBe(0);
      expect(invoice!.status).toBe(SupplierInvoiceStatus.PENDING);
      expect(invoice!.journalVoucherId).toBeDefined();

      testInvoiceId = invoice!.id;
      createdInvoiceIds.push(invoice!.id);

      // بررسی سند حسابداری صادر شده:
      const voucher = await db.journalVoucher.findUnique({
        where: { id: invoice!.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });

      expect(voucher).toBeDefined();
      expect(voucher!.status).toBe('FINALIZED');
      expect(Number(voucher!.totalDebit)).toBe(445_000_000);
      expect(Number(voucher!.totalCredit)).toBe(445_000_000);

      // بررسی آرتیکل‌ها:
      // ۱. بدهکار مواد اولیه (۱۱۰۵۰۱): ۴۰۵ میلیون (کالا + کرایه)
      const matEntry = voucher!.entries.find((e) => e.account.code === '110501');
      expect(matEntry).toBeDefined();
      expect(Number(matEntry!.debit)).toBe(405_000_000);

      // ۲. بدهکار مالیات ارزش افزوده خرید ۱۰٪ (۱۱۰۶۰۱): ۴۰ میلیون
      const vatEntry = voucher!.entries.find((e) => e.account.code === '110601');
      expect(vatEntry).toBeDefined();
      expect(Number(vatEntry!.debit)).toBe(40_000_000);

      // ۳. بستانکار حساب‌های پرداختنی تجاری تامین‌کننده (۲۱۰۱۰۱): ۴۴۵ میلیون
      const payableEntry = voucher!.entries.find((e) => e.account.code === '210101');
      expect(payableEntry).toBeDefined();
      expect(Number(payableEntry!.credit)).toBe(445_000_000);

      // بررسی به‌روزرسانی مانده بستانکاری دفتری تامین‌کننده:
      const supplier = await db.supplier.findUnique({ where: { id: testSupplierId } });
      expect(Number(supplier!.totalPayable)).toBe(445_000_000);
    });
  });

  // =========================================================================
  // ۵. تست پرداخت وجه به تامین‌کننده (حواله بانکی و ظهرنویسی چک صیادی)
  // =========================================================================
  describe('۵. Supplier Payments (Bank Transfer & Cheque Endorsement)', () => {
    it('باید پرداخت بخشی از فاکتور از طریق حواله بانکی ثبت و سند دوبل (Dr: ۲۱۰۱۰۱ / Cr: ۱۱۰۱۰۱) صادر شود', async () => {
      // پرداخت ۲۰۰ میلیون تومان از طریق حواله بانکی
      const payment1 = await SupplierPaymentService.createSupplierPayment({
        supplierId: testSupplierId,
        supplierInvoiceId: createdInvoiceIds[0],
        amount: 200_000_000,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountId: testBankAccountId,
        receiptNo: 'PAYA-REF-112233',
        description: 'پرداخت بخش اول فاکتور از حساب ملت',
      });

      expect(payment1).toBeDefined();
      expect(payment1).not.toBeNull();
      expect(payment1!.paymentNo).toMatch(/^SPAY-\d{6}$/);
      expect(Number(payment1!.amount)).toBe(200_000_000);
      expect(payment1!.journalVoucherId).toBeDefined();

      createdPaymentIds.push(payment1!.id);

      // بررسی وضعیت فاکتور خرید:
      const invoice = await db.supplierInvoice.findUnique({
        where: { id: createdInvoiceIds[0] },
      });
      expect(Number(invoice!.paidAmount)).toBe(200_000_000);
      expect(invoice!.status).toBe(SupplierInvoiceStatus.PARTIALLY_PAID);

      // بررسی مانده بدهی تامین‌کننده (۴۴۵ - ۲۰۰ = ۲۴۵ میلیون):
      const supplier = await db.supplier.findUnique({ where: { id: testSupplierId } });
      expect(Number(supplier!.totalPayable)).toBe(245_000_000);
    });

    it('باید تسویه باقی‌مانده فاکتور از طریق ظهرنویسی/خرج چک صیادی مشتری انجام شود', async () => {
      // ۱. ثبت یک فقره چک صیادی دریافتی از مشتری به مبلغ ۲۴۵ میلیون تومان در صندوق کارخانه
      const sayadId = `8888${Date.now().toString().slice(-12)}`;
      const cheque = await ChequeService.receiveCheque({
        customerId: testCustomerId,
        sayadId,
        chequeNumber: 'CHQ-CLIENT-9900',
        amount: 245_000_000, // مبلغ باقی‌مانده بدهی فاکتور
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 86400000 * 45), // ۴۵ روز بعد
        bankName: 'بانک پاسارگاد',
        drawerName: 'البرز سازه (مشتری کارخانه)',
      });

      expect(cheque).toBeDefined();
      expect(cheque).not.toBeNull();
      expect(cheque!.status).toBe(ChequeStatus.RECEIVED);
      createdChequeIds.push(cheque!.id);

      // ۲. پرداخت به تامین‌کننده با ظهرنویسی این چک صیادی
      const payment2 = await SupplierPaymentService.createSupplierPayment({
        supplierId: testSupplierId,
        supplierInvoiceId: createdInvoiceIds[0],
        amount: 245_000_000,
        paymentMethod: 'CHEQUE_ENDORSED',
        chequeId: cheque!.id,
        receiptNo: 'PEYCHAK-ENDORSE-9988',
        description: 'تسویه نهایی با ظهرنویسی چک صیادی البرز سازه',
      });

      expect(payment2).toBeDefined();
      expect(payment2).not.toBeNull();
      expect(payment2!.journalVoucherId).toBeDefined();
      createdPaymentIds.push(payment2!.id);

      // ۳. بررسی تغییر وضعیت چک به TRANSFERRED (خرج‌شده):
      const updatedCheque = await db.cheque.findUnique({ where: { id: cheque!.id } });
      expect(updatedCheque!.status).toBe(ChequeStatus.TRANSFERRED);

      // ۴. بررسی سند حسابداری دوبل ظهرنویسی:
      // Dr: حساب‌های پرداختنی تامین‌کنندگان (۲۱۰۱۰۱): ۲۴۵,۰۰۰,۰۰۰
      // Cr: اسناد دریافتنی تجاری - نزد صندوق (۱۱۰۴۰۱): ۲۴۵,۰۰۰,۰۰۰
      const voucher = await db.journalVoucher.findUnique({
        where: { id: payment2!.journalVoucherId! },
        include: { entries: { include: { account: true } } },
      });
      expect(voucher).toBeDefined();
      expect(Number(voucher!.totalDebit)).toBe(245_000_000);
      expect(Number(voucher!.totalCredit)).toBe(245_000_000);

      const drPayable = voucher!.entries.find((e) => e.account.code === '210101');
      expect(drPayable).toBeDefined();
      expect(Number(drPayable!.debit)).toBe(245_000_000);

      const crNotes = voucher!.entries.find((e) => e.account.code === '110401');
      expect(crNotes).toBeDefined();
      expect(Number(crNotes!.credit)).toBe(245_000_000);

      // ۵. بررسی وضعیت نهایی فاکتور: تسویه کامل (PAID)
      const finalInvoice = await db.supplierInvoice.findUnique({
        where: { id: createdInvoiceIds[0] },
      });
      expect(Number(finalInvoice!.paidAmount)).toBe(445_000_000);
      expect(finalInvoice!.status).toBe(SupplierInvoiceStatus.PAID);

      // ۶. بررسی مانده نهایی تامین‌کننده: دقیقا ۰ تومان!
      const finalSupplier = await db.supplier.findUnique({ where: { id: testSupplierId } });
      expect(Number(finalSupplier!.totalPayable)).toBe(0);
    });
  });
});
