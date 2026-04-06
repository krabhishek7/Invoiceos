import type { GstRatePercent } from "./gst-calculator";

/**
 * HSN (Harmonized System of Nomenclature) code lookup.
 *
 * In production, this would be backed by a database table with ~20,000 codes.
 * For now, we include the most common HSN codes used by Indian MSMEs
 * with their default GST rates.
 *
 * Rules:
 * - Turnover > ₹5Cr: 6-digit HSN mandatory
 * - Turnover ≤ ₹5Cr: 4-digit HSN sufficient
 * - SAC codes (services) start with 99
 */

export interface HsnEntry {
  code: string;
  description: string;
  gstRate: GstRatePercent;
  isService: boolean; // SAC codes for services
  chapter: string;
}

const HSN_DATABASE: HsnEntry[] = [
  // ─── Food & Beverages (Chapter 01-24) ─────────
  { code: "0401", description: "Milk and cream, not concentrated", gstRate: 0, isService: false, chapter: "04" },
  { code: "0402", description: "Milk and cream, concentrated or sweetened", gstRate: 5, isService: false, chapter: "04" },
  { code: "0901", description: "Coffee (not roasted)", gstRate: 5, isService: false, chapter: "09" },
  { code: "0902", description: "Tea", gstRate: 5, isService: false, chapter: "09" },
  { code: "1001", description: "Wheat and meslin", gstRate: 0, isService: false, chapter: "10" },
  { code: "1006", description: "Rice", gstRate: 5, isService: false, chapter: "10" },
  { code: "1101", description: "Wheat or meslin flour (atta)", gstRate: 0, isService: false, chapter: "11" },
  { code: "1701", description: "Cane or beet sugar", gstRate: 5, isService: false, chapter: "17" },
  { code: "1905", description: "Bread, pastry, biscuits", gstRate: 18, isService: false, chapter: "19" },
  { code: "2106", description: "Food preparations (supplements)", gstRate: 18, isService: false, chapter: "21" },
  { code: "2201", description: "Mineral water", gstRate: 18, isService: false, chapter: "22" },
  { code: "2202", description: "Aerated beverages", gstRate: 28, isService: false, chapter: "22" },

  // ─── Textiles (Chapter 50-63) ─────────
  { code: "5208", description: "Woven cotton fabrics", gstRate: 5, isService: false, chapter: "52" },
  { code: "6109", description: "T-shirts, vests (knitted)", gstRate: 5, isService: false, chapter: "61" },
  { code: "6203", description: "Men's suits, trousers", gstRate: 12, isService: false, chapter: "62" },
  { code: "6204", description: "Women's suits, dresses", gstRate: 12, isService: false, chapter: "62" },

  // ─── Metals & Hardware (Chapter 72-83) ─────────
  { code: "7210", description: "Flat-rolled iron/steel, plated", gstRate: 18, isService: false, chapter: "72" },
  { code: "7308", description: "Iron/steel structures", gstRate: 18, isService: false, chapter: "73" },
  { code: "7318", description: "Screws, bolts, nuts", gstRate: 18, isService: false, chapter: "73" },
  { code: "7615", description: "Aluminium utensils", gstRate: 12, isService: false, chapter: "76" },

  // ─── Electronics (Chapter 84-85) ─────────
  { code: "8471", description: "Computers and peripherals", gstRate: 18, isService: false, chapter: "84" },
  { code: "8504", description: "Transformers, power supplies", gstRate: 18, isService: false, chapter: "85" },
  { code: "8507", description: "Electric accumulators (batteries)", gstRate: 28, isService: false, chapter: "85" },
  { code: "8517", description: "Telephones, smartphones", gstRate: 18, isService: false, chapter: "85" },
  { code: "8523", description: "Discs, tapes, storage devices", gstRate: 18, isService: false, chapter: "85" },
  { code: "8528", description: "Monitors and TVs", gstRate: 28, isService: false, chapter: "85" },

  // ─── Vehicles (Chapter 87) ─────────
  { code: "8703", description: "Motor cars, vehicles", gstRate: 28, isService: false, chapter: "87" },
  { code: "8711", description: "Motorcycles, scooters", gstRate: 28, isService: false, chapter: "87" },

  // ─── Furniture (Chapter 94) ─────────
  { code: "9401", description: "Seats and chairs", gstRate: 18, isService: false, chapter: "94" },
  { code: "9403", description: "Other furniture", gstRate: 18, isService: false, chapter: "94" },

  // ─── Pharma (Chapter 30) ─────────
  { code: "3004", description: "Medicaments (packaged)", gstRate: 12, isService: false, chapter: "30" },
  { code: "3006", description: "Pharmaceutical goods", gstRate: 12, isService: false, chapter: "30" },

  // ─── Cosmetics (Chapter 33) ─────────
  { code: "3304", description: "Beauty/make-up preparations", gstRate: 28, isService: false, chapter: "33" },
  { code: "3305", description: "Hair preparations (shampoo)", gstRate: 18, isService: false, chapter: "33" },
  { code: "3401", description: "Soap", gstRate: 18, isService: false, chapter: "34" },

  // ─── Stationery & Printing (Chapter 48-49) ─────────
  { code: "4802", description: "Paper and paperboard", gstRate: 12, isService: false, chapter: "48" },
  { code: "4820", description: "Registers, notebooks", gstRate: 12, isService: false, chapter: "48" },
  { code: "4901", description: "Printed books", gstRate: 0, isService: false, chapter: "49" },

  // ─── SAC Codes (Services) ─────────
  { code: "9954", description: "Construction services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9961", description: "Financial and insurance services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9962", description: "Real estate services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9964", description: "Passenger transportation", gstRate: 5, isService: true, chapter: "99" },
  { code: "9965", description: "Goods transport services", gstRate: 5, isService: true, chapter: "99" },
  { code: "9966", description: "Rental services for transport", gstRate: 18, isService: true, chapter: "99" },
  { code: "9971", description: "Financial services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9972", description: "Real estate services (rental)", gstRate: 18, isService: true, chapter: "99" },
  { code: "9973", description: "Leasing services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9981", description: "Research and development", gstRate: 18, isService: true, chapter: "99" },
  { code: "9982", description: "Legal and accounting", gstRate: 18, isService: true, chapter: "99" },
  { code: "9983", description: "Other professional services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9984", description: "Telecom, broadcasting, IT", gstRate: 18, isService: true, chapter: "99" },
  { code: "9985", description: "Support services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9986", description: "Government services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9987", description: "Maintenance and repair", gstRate: 18, isService: true, chapter: "99" },
  { code: "9988", description: "Manufacturing services", gstRate: 18, isService: true, chapter: "99" },
  { code: "9991", description: "Public administration", gstRate: 0, isService: true, chapter: "99" },
  { code: "9992", description: "Education services", gstRate: 0, isService: true, chapter: "99" },
  { code: "9993", description: "Health and social services", gstRate: 0, isService: true, chapter: "99" },
  { code: "9995", description: "Recreational and sporting", gstRate: 18, isService: true, chapter: "99" },
  { code: "9996", description: "Personal services (salon, spa)", gstRate: 18, isService: true, chapter: "99" },
  { code: "9997", description: "Other services", gstRate: 18, isService: true, chapter: "99" },

  // ─── Common MSME items ─────────
  { code: "3923", description: "Plastic containers, packaging", gstRate: 18, isService: false, chapter: "39" },
  { code: "6305", description: "Sacks and bags (textile)", gstRate: 5, isService: false, chapter: "63" },
  { code: "2523", description: "Cement", gstRate: 28, isService: false, chapter: "25" },
  { code: "7013", description: "Glassware", gstRate: 18, isService: false, chapter: "70" },
];

/**
 * Search HSN/SAC codes by code prefix or description keyword.
 */
export function searchHsn(
  query: string,
  limit: number = 20
): HsnEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: HsnEntry[] = [];

  // Exact code match first
  const exactMatch = HSN_DATABASE.find(
    (entry) => entry.code === q || entry.code === q.replace(/\s/g, "")
  );
  if (exactMatch) {
    results.push(exactMatch);
  }

  // Code prefix match
  for (const entry of HSN_DATABASE) {
    if (entry.code.startsWith(q) && !results.includes(entry)) {
      results.push(entry);
    }
    if (results.length >= limit) return results;
  }

  // Description search
  for (const entry of HSN_DATABASE) {
    if (entry.description.toLowerCase().includes(q) && !results.includes(entry)) {
      results.push(entry);
    }
    if (results.length >= limit) return results;
  }

  return results;
}

/**
 * Get the default GST rate for a given HSN/SAC code.
 */
export function getGstRateForHsn(code: string): GstRatePercent | null {
  const entry = HSN_DATABASE.find(
    (e) => e.code === code || code.startsWith(e.code)
  );
  return entry?.gstRate ?? null;
}

/**
 * Look up a specific HSN code.
 */
export function getHsnEntry(code: string): HsnEntry | null {
  return HSN_DATABASE.find((e) => e.code === code) ?? null;
}

/**
 * Validate HSN code format and required digit count based on turnover.
 */
export function validateHsnCode(
  code: string,
  annualTurnoverPaise?: bigint
): { valid: boolean; error?: string } {
  if (!code || code.length < 4) {
    return { valid: false, error: "HSN code must be at least 4 digits" };
  }

  if (!/^\d{4,8}$/.test(code)) {
    return { valid: false, error: "HSN code must contain only digits (4-8 digits)" };
  }

  // ₹5 Crore = 5,00,00,000 INR = 50,000,000,00 paise
  const FIVE_CRORE_PAISE = 5_00_00_000_00n;

  if (annualTurnoverPaise && annualTurnoverPaise > FIVE_CRORE_PAISE && code.length < 6) {
    return {
      valid: false,
      error: "6-digit HSN code is mandatory for annual turnover above ₹5 Crore",
    };
  }

  return { valid: true };
}

export const HSN_DATA = HSN_DATABASE;
