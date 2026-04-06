import { describe, it, expect } from "vitest";
import {
  validateGstin,
  extractPanFromGstin,
  extractStateCodeFromGstin,
} from "../gstin-validator.js";

describe("GSTIN Validator", () => {
  it("should validate a correct GSTIN", () => {
    const result = validateGstin("27AAPFU0939F1ZV");
    expect(result.valid).toBe(true);
    expect(result.stateCode).toBe("27");
    expect(result.stateName).toBe("Maharashtra");
    expect(result.pan).toBe("AAPFU0939F");
  });

  it("should validate Karnataka GSTIN", () => {
    const result = validateGstin("29AABCT1332L1ZA");
    expect(result.valid).toBe(true);
    expect(result.stateCode).toBe("29");
    expect(result.stateName).toBe("Karnataka");
  });

  it("should reject GSTIN with wrong length", () => {
    const result = validateGstin("27AAPFU0939F1Z");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject empty GSTIN", () => {
    const result = validateGstin("");
    expect(result.valid).toBe(false);
  });

  it("should reject GSTIN with invalid state code", () => {
    const result = validateGstin("99AAPFU0939F1ZX");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("state code"))).toBe(true);
  });

  it("should accept lowercase GSTIN (auto-uppercased)", () => {
    const result = validateGstin("27aapfu0939f1zv");
    expect(result.valid).toBe(true);
  });

  it("should reject GSTIN with bad checksum", () => {
    const result = validateGstin("27AAPFU0939F1ZX");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("checksum"))).toBe(true);
  });

  it("should extract PAN from GSTIN", () => {
    expect(extractPanFromGstin("27AAPFU0939F1ZV")).toBe("AAPFU0939F");
  });

  it("should extract state code from GSTIN", () => {
    expect(extractStateCodeFromGstin("07AABCU9603R1ZP")).toBe("07");
  });

  it("should return null for invalid length PAN extraction", () => {
    expect(extractPanFromGstin("invalid")).toBeNull();
  });
});
