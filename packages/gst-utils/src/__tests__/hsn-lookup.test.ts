import { describe, it, expect } from "vitest";
import {
  searchHsn,
  getGstRateForHsn,
  getHsnEntry,
  validateHsnCode,
} from "../hsn-lookup.js";

describe("HSN Lookup", () => {
  describe("searchHsn", () => {
    it("should find HSN by exact code", () => {
      const results = searchHsn("8517");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.code).toBe("8517");
      expect(results[0]!.description).toContain("smartphone");
    });

    it("should find HSN by code prefix", () => {
      const results = searchHsn("85");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.code.startsWith("85"))).toBe(true);
    });

    it("should find HSN by description keyword", () => {
      const results = searchHsn("soap");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.description.toLowerCase().includes("soap"))
      ).toBe(true);
    });

    it("should return empty for unknown query", () => {
      const results = searchHsn("xyznonexistent");
      expect(results).toHaveLength(0);
    });

    it("should find SAC codes for services", () => {
      const results = searchHsn("9984");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.isService).toBe(true);
    });

    it("should respect limit", () => {
      const results = searchHsn("99", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getGstRateForHsn", () => {
    it("should return correct GST rate", () => {
      expect(getGstRateForHsn("8517")).toBe(18);
      expect(getGstRateForHsn("2202")).toBe(28);
      expect(getGstRateForHsn("0401")).toBe(0);
      expect(getGstRateForHsn("1006")).toBe(5);
    });

    it("should return null for unknown code", () => {
      expect(getGstRateForHsn("0000")).toBeNull();
    });
  });

  describe("getHsnEntry", () => {
    it("should return full entry for known code", () => {
      const entry = getHsnEntry("3004");
      expect(entry).not.toBeNull();
      expect(entry!.gstRate).toBe(12);
      expect(entry!.description).toContain("Medicament");
    });
  });

  describe("validateHsnCode", () => {
    it("should accept valid 4-digit code", () => {
      expect(validateHsnCode("8517").valid).toBe(true);
    });

    it("should accept valid 6-digit code", () => {
      expect(validateHsnCode("851712").valid).toBe(true);
    });

    it("should reject code shorter than 4 digits", () => {
      expect(validateHsnCode("85").valid).toBe(false);
    });

    it("should reject code with letters", () => {
      expect(validateHsnCode("85AB").valid).toBe(false);
    });

    it("should require 6 digits for turnover > 5Cr", () => {
      const fiveCrorePlusPaise = 5_00_00_001_00n;
      expect(validateHsnCode("8517", fiveCrorePlusPaise).valid).toBe(false);
      expect(validateHsnCode("851712", fiveCrorePlusPaise).valid).toBe(true);
    });
  });
});
