# مستند مشخصات جامع و نیازمندی‌های سیستم ERP خوش‌صنعت پایدار
## Khosh Sanat Paydar ERP Master Architectural Specification

این مستند بر اساس پرامپت معمار ارشد سیستم، قوانین بنیادی طراحی، الزامات انبارداری، تولید، مالی، خزانه‌داری، سامانه مودیان، حقوق و دستمزد و استاندارد توسعه تدریجی ایجاد شده است.

---

### متن کامل پرامپت و الزامات معماری:

```markdown
تو یک Senior Software Architect، ERP Product Architect، متخصص Accounting Systems، Manufacturing ERP و Test Engineer هستی.

من یک وبسایت/وباپلیکیشن موجود دارم که بخشی از عملیات شرکت در آن پیادهسازی شده است. هدف این پروژه تبدیل تدریجی سیستم موجود به یک ERP تحت وب برای یک شرکت ایرانی تولیدکننده محصولات فلزی ساختمانی است.

این پروژه نباید با رویکرد «ساخت چند صفحه مستقل» توسعه داده شود. باید یک هسته داده و تراکنش یکپارچه ایجاد شود که عملیات فروش، مشتریان، بارنامه، باسکول، انبار، تولید، خرید، خزانه، چک، حقوق، مالیات و حسابداری را به یکدیگر متصل کند.

==================================================
## 0. قانون بسیار مهم
==================================================
قبل از هرگونه تغییر در کد:
1. کل repository را بررسی کن.
2. تکنولوژی frontend/backend/database را شناسایی کن.
3. ساختار فعلی database/schema/migrations را بررسی کن.
4. صفحه فعلی مشتریان، بدهکار/بستانکار، فاکتور و بارنامه را پیدا و کامل مطالعه کن.
5. APIهای موجود را بررسی کن.
6. مدلهای فعلی Customer / Invoice / Waybill / Payment / Product و موارد مشابه را شناسایی کن.
7. تستهای موجود را پیدا کن.
8. نحوه authentication و authorization فعلی را بررسی کن.
9. هیچ feature موجود را بدون بررسی dependencyهای آن حذف یا rewrite نکن.
10. قبل از migration از database فعلی backup تهیه کن.
11. ابتدا یک document با نام ARCHITECTURE_AUDIT.md بساز و وضعیت فعلی پروژه را ثبت کن.
همچنین: CURRENT_SYSTEM_MAP.md بساز.
بدون بررسی repository حق نداری معماری فعلی را از صفر فرض کنی.

==================================================
## 1. هدف اصلی سیستم
==================================================
سیستم نهایی باید زنجیره یکپارچه زیر را مدیریت کند:
Customer → Sales Order → Invoice → Delivery → Waybill → Scale Ticket → Warehouse Movement → Accounts Receivable → Receipt / Cheque → Treasury → Journal Entry → General Ledger
مسیر خرید:
Supplier → Purchase Request → RFQ → Supplier Quotation → Purchase Order → Goods Receipt → QC → Supplier Invoice → Accounts Payable → Payment → Journal Entry
مسیر تولید:
Sales Demand / Production Plan → MRP → Work Order → BOM → Material Issue → Production → WIP → Finished Goods → Scrap / By-product → Production Cost → Variance → Warehouse

==================================================
## 2. قوانین معماری
==================================================
اصل شماره 1: Single Source of Truth
اطلاعات یک عملیات فقط یک بار ثبت شود. Scale Ticket منبع عملیاتی وزن اندازه‌گیری شده است.
اصل شماره 2: Operational Transaction → Accounting Event
اصل شماره 3: Posted Accounting Documents are Immutable (فقط Reversal / Adjustment / Correction)
اصل شماره 4: Effective-Dated Rules (نرخ‌ها و قوانین متغیر دارای تاریخ موثر باشند: TaxRule, PayrollRule, VATRule, ...)

==================================================
## 3. Multi-Company / Multi-Branch Architecture
==================================================
Company → Branch → Warehouse → Production Site → Cost Center
تمام تراکنش‌های اصلی دارای company_id باشند.

==================================================
## 4. Master Data
==================================================
Customer, Supplier, Person, Company, Employee, Bank, BankAccount, Warehouse, WarehouseLocation, Product, ProductCategory, ProductVariant, UnitOfMeasure, TaxCategory, Vehicle, Driver, Carrier, CostCenter, Department, Project, ProductionLine, Machine, WorkCenter.
فیلدهای متالورژی و مهندسی فولاد در Product: SKU, Internal Code, Barcode, Weight, Theoretical Weight, Length, Width, Thickness, Grade, Standard, Dual UOM, Tax Codes, Accounts.

==================================================
## 5. Dual Unit of Measure
==================================================
تعداد / شاخه / طول / متر / کیلوگرم / تن
تفکیک Theoretical Quantity و Actual Quantity. گردش موجودی بر مبنای Actual Weight باسکول.

==================================================
## 6. Customer 360
==================================================
تبدیل صفحه مشتری به مرکز فرماندهی ۳۶۰ درجه:
- Summary (مانده بر مبنای Ledger، سقف اعتبار، چک‌های در جریان)
- Sales (پیش‌فاکتور، سفارش، فاکتور، مرجوعی، تخفیف)
- Logistics (تحویل‌ها، بارنامه‌ها، خودرو، راننده، باسکول)
- Finance (رسیدها، چک‌ها، تسویه‌ها، صورتحساب، سنی مطالبات)
- Documents (قراردادها، گواهی‌ها، پیوست‌ها)
- Audit (لاگ کامل تغییرات)

==================================================
## 7. Invoice / Waybill / Delivery Model
==================================================
عدم استفاده از رابطه ساده ۱ به ۱.
پشتیبانی از چند تحویل برای یک فاکتور و تجمیع بارنامه.
موجودیت‌ها: Invoice, InvoiceLine, Delivery, DeliveryLine, Waybill, WaybillLine, ScaleTicket, DeliveryAllocation.
جلوگیری سیستمی از over-delivery.

==================================================
## 8. Scale / Weighbridge
==================================================
ScaleTicket با Gateway الگوی Adapter (پشتیبانی از RS232, TCP/IP, Modbus, API).
توزین دستگاه Immutable؛ تغییر دستی فقط با پرمیشن، دلیل، تاییدیه و Audit Log.

==================================================
## 9. Warehouse (انبارداری صنعتی)
==================================================
Inventory Ledger مبتنی بر Append-only.
انواع ترنزکشن: PURCHASE_RECEIPT, PRODUCTION_RECEIPT, SALES_ISSUE, PRODUCTION_ISSUE, TRANSFER, RETURN_IN, RETURN_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, SCRAP.
محاسبه موجودی و بهای تمام‌شده میانگین موزون از Ledger با Transaction Locking.

==================================================
## 10. Batch / Lot / Heat Number
==================================================
رهگیری کامل فولاد: شماره ذوب (Heat Number)، لات، گواهینامه متالورژی (MTC/Mill Test Certificate) از تامین‌کننده تا محصول نهایی.

==================================================
## 11. Sales & Credit Check
==================================================
Quotation → Sales Order → Credit Check → Approval → Invoice → Delivery → Waybill → Scale → Warehouse Issue → Accounting → Settlement.
فرمول کنترل اعتبار پویا و بلوکه شدن خودکار در صورت تخطی از Limit.

==================================================
## 12. Accounts Receivable (حساب‌های دریافتنی)
==================================================
Customer Ledger, Invoice Aging, Payment Terms, Allocation چند به چند (یک رسید به چند فاکتور یا یک فاکتور با چند رسید).

==================================================
## 13. Treasury (خزانه‌داری)
==================================================
نقد، بانک، تنخواه، انتقال، مغایرت‌گیری بانکی (Bank Reconciliation).

==================================================
## 14. Cheque Management (مدیریت چک و سامانه صیاد)
==================================================
چرخه کامل چک: RECEIVED, IN_PORTFOLIO, TRANSFERRED, DEPOSITED, IN_CLEARING, CLEARED, BOUNCED, RETURNED, CANCELLED, SETTLED.
Sayad Adapter ایزوله.

==================================================
## 15. Petty Cash (تنخواه گردان)
==================================================
افتتاح، شارژ، اسناد هزینه با پیوست و مرکز هزینه، تسویه خودکار با تولید سند حسابداری.

==================================================
## 16. General Ledger (دفاتر قانونی و حسابداری دوبل)
==================================================
ChartOfAccounts, Account, JournalVoucher, JournalEntry, FiscalYear, FiscalPeriod.
توازن اجباری Debit = Credit، عدم پذیرش ارقام منفی یا ردیف دوطرفه، عدم ثبت سند ناتراز.

==================================================
## 17. Accounting Mapping Engine
==================================================
پیکربندی داینامیک حساب‌ها بدون hard-code کردن کد حساب در بیزینس لاجیک.

==================================================
## 18. Source Document Lineage
==================================================
رهگیری و Drill-down از سند حسابداری به فاکتور، بارنامه، باسکول، مشتری و کارگاه.

==================================================
## 19. Procurement (تدارکات و خرید)
==================================================
Purchase Requisition → RFQ → PO → GRN → QC → Supplier Invoice → 3-Way Match → AP → Payment.

==================================================
## 20. Manufacturing & BOM
==================================================
BOM نسخه‌دار با تاریخ موثر، Routing، Work Center، Work Order، Material Issue، WIP، Finished Goods، Scrap، By-product.

==================================================
## 21. Production Costing & Variance
==================================================
محاسبه مواد مستقیم، دستمزد مستقیم، سربار جذب شده، گزارش انحرافات استاندارد و واقعی (Usage, Price, Labor, Scrap Variance).

==================================================
## 22. Scrap Management
==================================================
انواع ضایعات: NORMAL, ABNORMAL, REWORKABLE, BY_PRODUCT با شیوه حسابداری مستقل و قابل تنظیم.

==================================================
## 23. Quality Control (QC)
==================================================
Inspection Plan, Tolerance, Test Result, NCR, Quarantine, Release, Reject.

==================================================
## 24. Fixed Assets (اموال و دارایی ثابت)
==================================================
طبقات دارایی، استهلاک با روش‌های استاندارد و بدون نرخ hard-code شده.

==================================================
## 25. Payroll (حقوق و دستمزد)
==================================================
محاسبه کارکرد، نوبت‌کاری، اضافه‌کاری، بیمه تامین اجتماعی (دیسکت بیمه)، مالیات حقوق ماده ۸۶ با Rule Engine بدون ارقام ثابت.

==================================================
## 26 & 27 & 28. Tax Engine & Samaneh Moadian
==================================================
تولید Tax ID ۲۲ رقمی با الگوریتم ورهوف، صف ارسال ناهمگام (Transactional Outbox)، امضای دیجیتال JWS، انطباق با قواعد مالیاتی و ارزش افزوده متغیر.

==================================================
## 29. Iran Commerce Integration (سامانه جامع تجارت)
==================================================
ماژول انطباق و ثبت موجودی/تولید در سامانه جامع تجارت با CommerceProviderAdapter.

==================================================
## 30. Freight (حمل و کرایه بار)
==================================================
قراردادهای حمل (Prepaid, Collect, Seller Paid, Customer Paid, Third Party)، بارگیر، ناوگان و راننده.

==================================================
## 31. Accounting Period & Year End
==================================================
دوره مالی، سال مالی، بستن حساب‌های موقت، بستن حساب‌های دائم، قفل دوره و صدور سند افتتاحیه/اختتامیه.

==================================================
## 32. Approval Engine (موتور تایید و گردش اسناد)
==================================================
موتور جنریک گردش کار برای فاکتورهای بالای سقف، تخطی از اعتبار، تغییر دستی وزن باسکول، اسناد اصلاحی.

==================================================
## 33 & 34. RBAC + Separation of Duties & Audit Trail
==================================================
نقش‌های تفکیک‌شده (Maker-Checker)، لاگ غیرقابل حذف کلیه رخدادهای حساس با جزئیات old/new value و IP.

==================================================
## 35. Documents (مرکز مدیریت اسناد و پیوست‌ها)
==================================================
سیستم یکپارچه پیوست‌ها بر بستر MinIO موجود با اعتبارسنجی هش و ایمنی.

==================================================
## 36 & 37 & 38. Reporting & Dashboards
==================================================
تراز آزمایشی، دفتر کل، روزنامه، معین، صورت سود و زیان، ترازنامه، سنی مطالبات، ارزش موجودی، داشبوردهای مدیریتی مدیرعامل، مالی و تولید با قابلیت Drill-Down و خروجی اکسل/PDF.

==================================================
## 39 & 40. Data Migration & Reconciliation
==================================================
پشتیبان‌گیری قبل از هر تغییر، حفظ شناسه‌های قدیمی برای ردیابی (Old Customer ID, Old Invoice ID, Old Waybill ID)، موازنه ۱۰۰ درصدی داده‌ها قبل و بعد از مایگریشن.

==================================================
## 41 & 42 & 43. Idempotency, Transaction Boundaries & Outbox
==================================================
کلید یکتایی (Idempotency Key) روی تمام تراکنش‌های موثر مالی، ترنزکشن‌های پایگاه داده اتمیک، Transactional Outbox Pattern برای ارتباطات بیرونی.

==================================================
## 44 & 45. Security & Backup
==================================================
رمزنگاری کلیدهای مالیاتی، عدم نمایش در فرانت‌اند، بکاپ‌گیری منظم و تست دوره‌ای بازیابی (Restore Verification).

==================================================
## 46, 47, 48, 49, 50. Testing Strategy & Accounting Invariants
==================================================
تست‌های اتوماتیک و یکپارچه برای نامتغیرهای حسابداری (Debit=Credit)، کنترل موجودی همزمان (Concurrency / Negative Stock Protection)، عدم ثبت دوبار سند (Double Posting Idempotency)، سناریوهای ۱۸ گانه زنجیره عملیاتی.

==================================================
## 51, 52, 53, 54, 55. UI, Persian Calendar, Decimal Money & Sequences
==================================================
رابط کاربری راست‌چین، تاریخ شمسی، نوع داده Decimal (ممنوعیت کامل Float برای پول)، شماره‌گذاری متوالی و Concurrency-safe در سرور، عدم حذف فیزیکی اسناد مالی.

==================================================
## 56 & 57. Implementation Phases & Order
==================================================
PHASE 0: System Audit (TASK-0001 to TASK-0011)
PHASE 1: Accounting Core
PHASE 2: Customer + AR + Invoice Integration (Customer 360)
PHASE 3: Delivery + Waybill + Scale
PHASE 4: Treasury + Cheques + Petty Cash
PHASE 5: Inventory + Procurement
PHASE 6: Manufacturing
PHASE 7: Payroll + HR
PHASE 8: Tax + Moadian
PHASE 9: Fixed Assets + Budget + BI
PHASE 10: Production Hardening
```
