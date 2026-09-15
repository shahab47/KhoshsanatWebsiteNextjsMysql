---
name: ks-erp-engine
description: "Core industrial ERP, job costing, tax compliance (Modyan), and double-entry accounting rules for Khosh Sanat Paydar."
version: 1.0.0
author: Khosh Sanat Engineering Team
---

# Khosh Sanat Paydar ERP Engine Standards

## 1. Double-Entry Financial Accounting
- Every transaction MUST produce balanced entries:
  $$\sum \text{Debit} = \sum \text{Credit}$$
- Accounts hierarchy:
  - Level 1: Group (دارایی‌های جاری، بدهی‌ها، سرمایه، درآمدها، بهای تمام‌شده)
  - Level 2: General / Kol (کل)
  - Level 3: Subsidiary / Moein (معین)
  - Floating Tafsili: Detail 1 (Customer/Supplier), Detail 2 (Cost Center / Job Order)
- Statuses: `DRAFT`, `VERIFIED`, `FINALIZED`. Once `FINALIZED`, the voucher is locked and immutable.

## 2. Industrial Job Order Costing
- Cost of Goods Manufactured:
  $$\text{COGM} = \text{Direct Materials (Net)} + \text{Direct Labor} + \text{Manufacturing Overhead}$$
- Moving average inventory valuation:
  $$\bar{C}_t = \frac{V_{t-1} \cdot C_{t-1} + Q_t \cdot P_t}{V_{t-1} + Q_t}$$
- Normal Spoilage scrap deduction:
  $$\text{Direct Materials}_{\text{Net}} = \sum (Q_{\text{consumed}} \cdot \bar{C}) - (Q_{\text{scrap}} \cdot P_{\text{scrap}})$$
- 4 Warehouses:
  1. `RAW_MATERIALS` (مواد اولیه فلزی و فله)
  2. `WORK_IN_PROGRESS` (کالای در جریان ساخت پای خطوط)
  3. `FINISHED_GOODS` (قطعات ساخته شده آماده بارگیری)
  4. `SCRAP` (ضایعات و قراضه فلزی)

## 3. Tax Compliance & Statutory Diskettes
- **Samaneh Modyan (Tax ID)**: 22-character unique ID:
  `MemoryID (6 chars) + HexEpochDays (5 chars) + HexSerial (10 chars) + VerhoeffCheckDigit (1 char)`
  Verhoeff uses the dihedral group $D_5$.
  Signature: JWS with RSA Private Key (`RS256`).
- **Social Security Insurance**: FoxPro DBF files:
  `DSKKAR00.DBF` (workshop header) & `DSKWOR00.DBF` (insured workers breakdown) with IranSystem encoding.
- **Salary Tax (Article 86)**: 3 text files: `WP.txt`, `WH.txt`, `WK.txt`.
