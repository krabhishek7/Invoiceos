import { describe, it, expect } from "vitest";
import {
  getCurrentFinancialYear,
  generateInvoiceNumber,
  parseInvoiceNumber,
} from "../invoice-number.js";

describe("Invoice Number Generator", () => {
  describe("getCurrentFinancialYear", () => {
    it("should return correct FY for April (start of FY)", () => {
      const date = new Date(2025, 3, 1); // April 2025
      expect(getCurrentFinancialYear(date)).toBe("25-26");
    });

    it("should return correct FY for March (end of FY)", () => {
      const date = new Date(2025, 2, 31); // March 2025
      expect(getCurrentFinancialYear(date)).toBe("24-25");
    });

    it("should return correct FY for January", () => {
      const date = new Date(2025, 0, 15); // Jan 2025
      expect(getCurrentFinancialYear(date)).toBe("24-25");
    });

    it("should return correct FY for December", () => {
      const date = new Date(2024, 11, 25); // Dec 2024
      expect(getCurrentFinancialYear(date)).toBe("24-25");
    });
  });

  describe("generateInvoiceNumber", () => {
    it("should generate padded invoice number", () => {
      expect(generateInvoiceNumber("TRD", "24-25", 1)).toBe("TRD/24-25/001");
      expect(generateInvoiceNumber("INV", "24-25", 42)).toBe("INV/24-25/042");
      expect(generateInvoiceNumber("ABC", "25-26", 1000)).toBe("ABC/25-26/1000");
    });
  });

  describe("parseInvoiceNumber", () => {
    it("should parse a valid invoice number", () => {
      const result = parseInvoiceNumber("TRD/24-25/001");
      expect(result).toEqual({ prefix: "TRD", fy: "24-25", seq: 1 });
    });

    it("should return null for invalid format", () => {
      expect(parseInvoiceNumber("invalid")).toBeNull();
      expect(parseInvoiceNumber("TRD/24-25")).toBeNull();
      expect(parseInvoiceNumber("")).toBeNull();
    });
  });
});
