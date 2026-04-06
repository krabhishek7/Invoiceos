import { describe, it, expect } from "vitest";
import {
  calculateLineItemGst,
  calculateInvoiceTotals,
  formatPaiseToInr,
  rupeesToPaise,
  paiseToRupees,
} from "../gst-calculator.js";

describe("GST Calculator", () => {
  describe("calculateLineItemGst", () => {
    it("should calculate intra-state GST (CGST + SGST)", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 100000n, // ₹1000.00
        quantity: 1,
        discountPercent: 0,
        gstRatePercent: 18,
        supplierStateCode: "27", // Maharashtra
        placeOfSupply: "27", // Maharashtra — same state
      });

      expect(result.isInterState).toBe(false);
      expect(result.taxableValuePaise).toBe(100000n);
      expect(result.cgstRateBps).toBe(900); // 9%
      expect(result.sgstRateBps).toBe(900); // 9%
      expect(result.igstRateBps).toBe(0);
      expect(result.cgstAmountPaise).toBe(9000n); // ₹90
      expect(result.sgstAmountPaise).toBe(9000n); // ₹90
      expect(result.igstAmountPaise).toBe(0n);
      expect(result.totalPaise).toBe(118000n); // ₹1180
    });

    it("should calculate inter-state GST (IGST)", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 100000n,
        quantity: 1,
        discountPercent: 0,
        gstRatePercent: 18,
        supplierStateCode: "27", // Maharashtra
        placeOfSupply: "29", // Karnataka — different state
      });

      expect(result.isInterState).toBe(true);
      expect(result.cgstAmountPaise).toBe(0n);
      expect(result.sgstAmountPaise).toBe(0n);
      expect(result.igstAmountPaise).toBe(18000n); // ₹180
      expect(result.totalPaise).toBe(118000n);
    });

    it("should apply discount correctly", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 100000n, // ₹1000
        quantity: 2,
        discountPercent: 10, // 10% off
        gstRatePercent: 18,
        supplierStateCode: "27",
        placeOfSupply: "27",
      });

      // Line total = 1000 * 2 = 2000
      // After 10% discount = 1800
      expect(result.taxableValuePaise).toBe(180000n);
      expect(result.totalPaise).toBe(212400n); // 1800 + 324 = 2124
    });

    it("should handle 0% GST rate", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 50000n,
        quantity: 1,
        discountPercent: 0,
        gstRatePercent: 0,
        supplierStateCode: "27",
        placeOfSupply: "27",
      });

      expect(result.cgstAmountPaise).toBe(0n);
      expect(result.sgstAmountPaise).toBe(0n);
      expect(result.igstAmountPaise).toBe(0n);
      expect(result.totalPaise).toBe(50000n);
    });

    it("should handle 28% GST rate", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 100000n,
        quantity: 1,
        discountPercent: 0,
        gstRatePercent: 28,
        supplierStateCode: "27",
        placeOfSupply: "27",
      });

      expect(result.cgstRateBps).toBe(1400); // 14%
      expect(result.sgstRateBps).toBe(1400);
      expect(result.cgstAmountPaise).toBe(14000n);
      expect(result.sgstAmountPaise).toBe(14000n);
      expect(result.totalPaise).toBe(128000n);
    });

    it("should handle multiple quantities", () => {
      const result = calculateLineItemGst({
        unitPricePaise: 25000n, // ₹250
        quantity: 4,
        discountPercent: 0,
        gstRatePercent: 12,
        supplierStateCode: "07", // Delhi
        placeOfSupply: "07", // Delhi
      });

      expect(result.taxableValuePaise).toBe(100000n); // 250 * 4
      expect(result.cgstRateBps).toBe(600); // 6%
      expect(result.sgstRateBps).toBe(600);
      expect(result.cgstAmountPaise).toBe(6000n);
      expect(result.sgstAmountPaise).toBe(6000n);
      expect(result.totalPaise).toBe(112000n);
    });
  });

  describe("calculateInvoiceTotals", () => {
    it("should aggregate multiple line items", () => {
      const item1 = calculateLineItemGst({
        unitPricePaise: 100000n,
        quantity: 1,
        discountPercent: 0,
        gstRatePercent: 18,
        supplierStateCode: "27",
        placeOfSupply: "27",
      });
      const item2 = calculateLineItemGst({
        unitPricePaise: 50000n,
        quantity: 2,
        discountPercent: 0,
        gstRatePercent: 5,
        supplierStateCode: "27",
        placeOfSupply: "27",
      });

      const totals = calculateInvoiceTotals([item1, item2]);
      expect(totals.subtotalPaise).toBe(200000n); // 1000 + 500*2
      expect(totals.cgstTotalPaise).toBe(9000n + 2500n);
      expect(totals.sgstTotalPaise).toBe(9000n + 2500n);
      expect(totals.igstTotalPaise).toBe(0n);
    });
  });

  describe("formatPaiseToInr", () => {
    it("should format paise to INR with Indian numbering", () => {
      expect(formatPaiseToInr(123456789n)).toBe("₹12,34,567.89");
    });

    it("should handle small amounts", () => {
      expect(formatPaiseToInr(100n)).toBe("₹1.00");
      expect(formatPaiseToInr(50n)).toBe("₹0.50");
    });

    it("should handle zero", () => {
      expect(formatPaiseToInr(0n)).toBe("₹0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatPaiseToInr(-100000n)).toBe("-₹1,000.00");
    });
  });

  describe("rupeesToPaise / paiseToRupees", () => {
    it("should convert rupees to paise", () => {
      expect(rupeesToPaise(1000)).toBe(100000n);
      expect(rupeesToPaise(10.50)).toBe(1050n);
    });

    it("should convert paise to rupees", () => {
      expect(paiseToRupees(100000n)).toBe(1000);
      expect(paiseToRupees(1050n)).toBe(10.50);
    });
  });
});
