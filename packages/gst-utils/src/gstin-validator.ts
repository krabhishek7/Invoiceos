import { z } from "zod";

/**
 * Indian State Codes as per GST registration.
 * The first 2 digits of GSTIN represent the state code.
 */
export const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
  "97": "Other Territory",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const GSTIN_CHAR_MAP: Record<string, number> = {};
"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((char, idx) => {
  GSTIN_CHAR_MAP[char] = idx;
});

/**
 * Validates the GSTIN checksum using the government-specified algorithm.
 * Steps for each of the first 14 characters:
 *   1. Map char to its value (0-9 → 0-9, A-Z → 10-35)
 *   2. Multiply by factor: position is 1-indexed, factor = 1 for odd, 2 for even
 *   3. Compute: quotient(value / 36) + remainder(value % 36)
 *   4. Sum all
 *   5. Checksum = (36 - (sum % 36)) % 36
 */
function validateGstinChecksum(gstin: string): boolean {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const charValue = GSTIN_CHAR_MAP[gstin[i]!]!;
    // Factor: odd positions (0-indexed even) → 1, even positions (0-indexed odd) → 2
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = charValue * factor;
    total += Math.floor(product / 36) + (product % 36);
  }
  const remainder = total % 36;
  const checkDigit = (36 - remainder) % 36;
  return gstin[14] === chars[checkDigit];
}

/**
 * Full GSTIN validation:
 * 1. Format check (regex)
 * 2. State code validity
 * 3. Checksum verification
 */
export function validateGstin(gstin: string): {
  valid: boolean;
  errors: string[];
  stateCode?: string;
  stateName?: string;
  pan?: string;
} {
  const errors: string[] = [];

  if (!gstin || gstin.length !== 15) {
    return { valid: false, errors: ["GSTIN must be exactly 15 characters"] };
  }

  const upper = gstin.toUpperCase();

  if (!GSTIN_REGEX.test(upper)) {
    errors.push(
      "Invalid GSTIN format. Expected: 2-digit state code + 10-char PAN + 1 entity + Z + 1 checksum"
    );
  }

  const stateCode = upper.substring(0, 2);
  if (!STATE_CODES[stateCode]) {
    errors.push(`Invalid state code: ${stateCode}`);
  }

  if (errors.length === 0 && !validateGstinChecksum(upper)) {
    errors.push("GSTIN checksum validation failed");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    stateCode,
    stateName: STATE_CODES[stateCode],
    pan: upper.substring(2, 12),
  };
}

/**
 * Extract PAN from GSTIN. Characters 3-12 of GSTIN form the PAN.
 */
export function extractPanFromGstin(gstin: string): string | null {
  if (gstin.length !== 15) return null;
  return gstin.substring(2, 12);
}

/**
 * Extract state code from GSTIN (first 2 digits).
 */
export function extractStateCodeFromGstin(gstin: string): string | null {
  if (gstin.length !== 15) return null;
  return gstin.substring(0, 2);
}

/**
 * Get state name from state code.
 */
export function getStateName(stateCode: string): string | null {
  return STATE_CODES[stateCode] ?? null;
}

export const gstinSchema = z.string().refine(
  (val) => validateGstin(val).valid,
  (val) => ({ message: validateGstin(val).errors.join(", ") })
);
