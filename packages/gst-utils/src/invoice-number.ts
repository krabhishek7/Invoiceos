/**
 * Invoice number generation.
 *
 * Format: PREFIX/FY/SEQ
 * Example: TRD/24-25/001
 *
 * Financial year in India: April 1 to March 31
 */

/**
 * Get current Indian financial year string (e.g. "24-25" for Apr 2024 - Mar 2025).
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed (0 = Jan)
  const year = date.getFullYear();

  // FY starts April (month index 3)
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;

  const startStr = fyStart.toString().slice(-2);
  const endStr = fyEnd.toString().slice(-2);

  return `${startStr}-${endStr}`;
}

/**
 * Generate next invoice number.
 */
export function generateInvoiceNumber(
  prefix: string,
  financialYear: string,
  sequenceNumber: number
): string {
  const seq = sequenceNumber.toString().padStart(3, "0");
  return `${prefix}/${financialYear}/${seq}`;
}

/**
 * Parse an invoice number back into its components.
 */
export function parseInvoiceNumber(
  invoiceNumber: string
): { prefix: string; fy: string; seq: number } | null {
  const parts = invoiceNumber.split("/");
  if (parts.length !== 3) return null;

  const [prefix, fy, seqStr] = parts;
  const seq = parseInt(seqStr!, 10);

  if (!prefix || !fy || isNaN(seq)) return null;

  return { prefix, fy, seq };
}
