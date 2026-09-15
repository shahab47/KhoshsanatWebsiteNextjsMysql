/**
 * الگوریتم تقارنی ورهوف (Verhoeff) مبتنی بر گروه دووجهی درجه ۵ (D5)
 * و تولید شماره ۲۲ رقمی مالیاتی صورتحساب الکترونیکی سامانه مودیان کشور
 */

const MULTIPLICATION_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const PERMUTATION_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const INVERSE_TABLE: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * محاسبه رقم کنترل ورهوف روی رشته عددی
 */
export function calculateVerhoeff(numericStr: string): number {
  let c = 0;
  const reversedDigits = numericStr.split('').reverse().map(Number);
  for (let i = 0; i < reversedDigits.length; i++) {
    c = MULTIPLICATION_TABLE[c][PERMUTATION_TABLE[(i + 1) % 8][reversedDigits[i]]];
  }
  return INVERSE_TABLE[c];
}

/**
 * اعتبارسنجی رقم کنترلی یک رشته مالیاتی یا عددی با الگوریتم ورهوف
 */
export function validateVerhoeff(fullNumericStr: string): boolean {
  let c = 0;
  const reversedDigits = fullNumericStr.split('').reverse().map(Number);
  for (let i = 0; i < reversedDigits.length; i++) {
    c = MULTIPLICATION_TABLE[c][PERMUTATION_TABLE[i % 8][reversedDigits[i]]];
  }
  return c === 0;
}

/**
 * تولید شماره ۲۲ رقمی منحصربه‌فرد مالیاتی صورتحساب
 * @param memoryId شناسه یکتای حافظه مالیاتی کارپوشه (۶ کاراکتر)
 * @param invoiceDate تاریخ ثبت فاکتور
 * @param internalSerial شماره سریال ترتیبی فاکتور در حافظه
 */
export function generateTaxId(memoryId: string, invoiceDate: Date, internalSerial: number): string {
  // تعداد روزهای سپری شده از تاریخ ۱۹۷۰/۰۱/۰۱ (Unix Epoch Day) در مبنای ۱۶ با طول ۵ کاراکتر
  const epochDays = Math.floor(invoiceDate.getTime() / (1000 * 60 * 60 * 24));
  const hexDate = epochDays.toString(16).toUpperCase().padStart(5, '0');
  
  // شماره سریال داخلی فاکتور در مبنای ۱۶ با طول ۱۰ کاراکتر
  const hexSerial = internalSerial.toString(16).toUpperCase().padStart(10, '0');
  
  const rawBase = `${memoryId.toUpperCase()}${hexDate}${hexSerial}`;
  
  // تبدیل حروف انگلیسی به مقادیر معادل عددی ASCII جهت محاسبه ورهوف طبق دستورالعمل مایتکس
  let numericRepresentation = '';
  for (let i = 0; i < rawBase.length; i++) {
    const code = rawBase.charCodeAt(i);
    numericRepresentation += code >= 65 ? (code - 55).toString() : rawBase[i];
  }

  const checkDigit = calculateVerhoeff(numericRepresentation);
  return `${rawBase}${checkDigit}`;
}
