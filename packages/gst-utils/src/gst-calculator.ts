/**
 * GST Calculator — all amounts in paise (1 INR = 100 paise).
 *
 * Rules implemented:
 * - IGST applies when supplier state ≠ place of supply
 * - CGST + SGST apply when supplier state = place of supply (intra-state)
 * - CGST = SGST = GST rate / 2
 * - Rounding: ROUND HALF UP as per GST rules
 */

export type GstRatePercent = 0 | 5 | 12 | 18 | 28;

export interface GstCalcInput {
  unitPricePaise: bigint;
  quantity: number;
  discountPercent: number; // e.g. 10.5 = 10.5% discount
  gstRatePercent: GstRatePercent;
  supplierStateCode: string;
  placeOfSupply: string;
  isReverseCharge?: boolean;
}

export interface GstCalcResult {
  taxableValuePaise: bigint;
  isInterState: boolean;
  cgstRateBps: number; // Basis points (900 = 9%)
  sgstRateBps: number;
  igstRateBps: number;
  cgstAmountPaise: bigint;
  sgstAmountPaise: bigint;
  igstAmountPaise: bigint;
  totalTaxPaise: bigint;
  totalPaise: bigint;
}

/**
 * Round half up for BigInt division — as per GST rules.
 * roundHalfUp(numerator, denominator) = floor((numerator * 2 + denominator) / (denominator * 2))
 */
function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n;
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/**
 * Calculate GST for a single line item.
 */
export function calculateLineItemGst(input: GstCalcInput): GstCalcResult {
  const lineTotal = input.unitPricePaise * BigInt(input.quantity);

  // Apply discount: taxable = lineTotal * (100 - discount%) / 100
  // Using paise precision: multiply by 10000 to handle 2-decimal discount
  const discountBps = Math.round(input.discountPercent * 100); // 10.50% → 1050 bps
  const taxableValuePaise = roundHalfUp(
    lineTotal * BigInt(10000 - discountBps),
    10000n
  );

  const isInterState = input.supplierStateCode !== input.placeOfSupply;

  let cgstRateBps = 0;
  let sgstRateBps = 0;
  let igstRateBps = 0;
  let cgstAmountPaise = 0n;
  let sgstAmountPaise = 0n;
  let igstAmountPaise = 0n;

  if (isInterState) {
    igstRateBps = input.gstRatePercent * 100; // 18% → 1800 bps
    igstAmountPaise = roundHalfUp(
      taxableValuePaise * BigInt(igstRateBps),
      10000n
    );
  } else {
    // Intra-state: split equally into CGST + SGST
    const halfRate = input.gstRatePercent * 100;
    cgstRateBps = halfRate / 2; // 18% → CGST 9% = 900 bps
    sgstRateBps = halfRate / 2;

    cgstAmountPaise = roundHalfUp(
      taxableValuePaise * BigInt(cgstRateBps),
      10000n
    );
    sgstAmountPaise = roundHalfUp(
      taxableValuePaise * BigInt(sgstRateBps),
      10000n
    );
  }

  const totalTaxPaise = cgstAmountPaise + sgstAmountPaise + igstAmountPaise;
  const totalPaise = taxableValuePaise + totalTaxPaise;

  return {
    taxableValuePaise,
    isInterState,
    cgstRateBps,
    sgstRateBps,
    igstRateBps,
    cgstAmountPaise,
    sgstAmountPaise,
    igstAmountPaise,
    totalTaxPaise,
    totalPaise,
  };
}

/**
 * Calculate totals for an entire invoice from line items.
 */
export function calculateInvoiceTotals(
  lineItems: GstCalcResult[]
): {
  subtotalPaise: bigint;
  cgstTotalPaise: bigint;
  sgstTotalPaise: bigint;
  igstTotalPaise: bigint;
  totalTaxPaise: bigint;
  grandTotalPaise: bigint;
} {
  let subtotal = 0n;
  let cgstTotal = 0n;
  let sgstTotal = 0n;
  let igstTotal = 0n;

  for (const item of lineItems) {
    subtotal += item.taxableValuePaise;
    cgstTotal += item.cgstAmountPaise;
    sgstTotal += item.sgstAmountPaise;
    igstTotal += item.igstAmountPaise;
  }

  return {
    subtotalPaise: subtotal,
    cgstTotalPaise: cgstTotal,
    sgstTotalPaise: sgstTotal,
    igstTotalPaise: igstTotal,
    totalTaxPaise: cgstTotal + sgstTotal + igstTotal,
    grandTotalPaise: subtotal + cgstTotal + sgstTotal + igstTotal,
  };
}

/**
 * Format paise to INR string (e.g., 1234567 → "₹12,345.67").
 */
export function formatPaiseToInr(paise: bigint): string {
  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;
  const rupees = Number(absPaise / 100n);
  const paisePart = Number(absPaise % 100n);

  // Indian numbering system: last 3 digits, then groups of 2
  const rupeesStr = rupees.toLocaleString("en-IN");
  const paiseStr = paisePart.toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";

  return `${sign}₹${rupeesStr}.${paiseStr}`;
}

/**
 * Convert a rupee amount (number) to paise (bigint).
 */
export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

/**
 * Convert paise (bigint) to rupees (number).
 */
export function paiseToRupees(paise: bigint): number {
  return Number(paise) / 100;
}
