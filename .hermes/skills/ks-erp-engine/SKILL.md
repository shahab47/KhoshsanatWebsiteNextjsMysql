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
  - Level 1: Group (Ø¯Ø§Ø±Ø§ÛŒÛŒâ€ŒÙ‡Ø§ÛŒ Ø¬Ø§Ø±ÛŒØŒ Ø¨Ø¯Ù‡ÛŒâ€ŒÙ‡Ø§ØŒ Ø³Ø±Ù…Ø§ÛŒÙ‡ØŒ Ø¯Ø±Ø¢Ù…Ø¯Ù‡Ø§ØŒ Ø¨Ù‡Ø§ÛŒ ØªÙ…Ø§Ù…â€ŒØ´Ø¯Ù‡)
  - Level 2: General / Kol (Ú©Ù„)
  - Level 3: Subsidiary / Moein (Ù…Ø¹ÛŒÙ†)
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
  1. `RAW_MATERIALS` (Ù…ÙˆØ§Ø¯ Ø§ÙˆÙ„ÛŒÙ‡ ÙÙ„Ø²ÛŒ Ùˆ ÙÙ„Ù‡)
  2. `WORK_IN_PROGRESS` (Ú©Ø§Ù„Ø§ÛŒ Ø¯Ø± Ø¬Ø±ÛŒØ§Ù† Ø³Ø§Ø®Øª Ù¾Ø§ÛŒ Ø®Ø·ÙˆØ·)
  3. `FINISHED_GOODS` (Ù‚Ø·Ø¹Ø§Øª Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡ Ø¢Ù…Ø§Ø¯Ù‡ Ø¨Ø§Ø±Ú¯ÛŒØ±ÛŒ)
  4. `SCRAP` (Ø¶Ø§ÛŒØ¹Ø§Øª Ùˆ Ù‚Ø±Ø§Ø¶Ù‡ ÙÙ„Ø²ÛŒ)

## 3. Tax Compliance & Statutory Diskettes
- **Samaneh Modyan (Tax ID)**: 22-character unique ID:
  `MemoryID (6 chars) + HexEpochDays (5 chars) + HexSerial (10 chars) + VerhoeffCheckDigit (1 char)`
  Verhoeff uses the dihedral group $D_5$.
  Signature: JWS with RSA Private Key (`RS256`).
- **Social Security Insurance**: FoxPro DBF files:
  `DSKKAR00.DBF` (workshop header) & `DSKWOR00.DBF` (insured workers breakdown) with IranSystem encoding.
- **Salary Tax (Article 86)**: 3 text files: `WP.txt`, `WH.txt`, `WK.txt`.

