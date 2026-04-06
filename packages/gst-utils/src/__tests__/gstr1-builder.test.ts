import { describe, it, expect } from "vitest";
import { buildGstr1, type Gstr1Invoice } from "../gstr1-builder.js";

describe("GSTR-1 Builder", () => {
  const supplierState = "27"; // Maharashtra

  function makeInvoice(overrides: Partial<Gstr1Invoice> = {}): Gstr1Invoice {
    return {
      invoiceNumber: "INV/24-25/001",
      invoiceDate: "15-01-2025",
      placeOfSupply: "27",
      isReverseCharge: false,
      invoiceType: "R",
      customerGstin: "29AABCT1332L1ZA",
      customerName: "Test Customer",
      invoiceValue: 11800,
      items: [
        {
          hsnCode: "8517",
          description: "Smartphones",
          quantity: 10,
          unit: "NOS",
          taxableValue: 10000,
          gstRate: 18,
          igstAmount: 0,
          cgstAmount: 900,
          sgstAmount: 900,
        },
      ],
      ...overrides,
    };
  }

  it("should generate a valid GSTR-1 payload", () => {
    const invoices = [makeInvoice()];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.gstin).toBe("27AAPFU0939F1ZV");
    expect(result.fp).toBe("012025");
  });

  it("should create b2b section for invoices with GSTIN", () => {
    const invoices = [makeInvoice({ customerGstin: "29AABCT1332L1ZA" })];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.b2b).toBeDefined();
    expect(result.b2b!.length).toBe(1);
    expect(result.b2b![0]!.ctin).toBe("29AABCT1332L1ZA");
    expect(result.b2b![0]!.inv.length).toBe(1);
    expect(result.b2b![0]!.inv[0]!.inum).toBe("INV/24-25/001");
  });

  it("should create b2cs section for B2C invoices under 2.5L", () => {
    const invoices = [
      makeInvoice({
        customerGstin: undefined,
        invoiceValue: 50000,
        placeOfSupply: "27",
      }),
    ];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.b2b).toBeUndefined();
    expect(result.b2cs).toBeDefined();
    expect(result.b2cs!.length).toBeGreaterThan(0);
    expect(result.b2cs![0]!.sply_ty).toBe("INTRA");
  });

  it("should create b2cl section for B2C inter-state invoices > 2.5L", () => {
    const invoices = [
      makeInvoice({
        customerGstin: undefined,
        invoiceValue: 300000,
        placeOfSupply: "29",
        items: [
          {
            hsnCode: "8517",
            description: "Smartphones",
            quantity: 100,
            unit: "NOS",
            taxableValue: 254237,
            gstRate: 18,
            igstAmount: 45763,
            cgstAmount: 0,
            sgstAmount: 0,
          },
        ],
      }),
    ];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.b2cl).toBeDefined();
    expect(result.b2cl!.length).toBe(1);
    expect(result.b2cl![0]!.pos).toBe("29");
  });

  it("should group B2B invoices by GSTIN", () => {
    const invoices = [
      makeInvoice({ invoiceNumber: "INV/24-25/001", customerGstin: "29AABCT1332L1ZA" }),
      makeInvoice({ invoiceNumber: "INV/24-25/002", customerGstin: "29AABCT1332L1ZA" }),
      makeInvoice({
        invoiceNumber: "INV/24-25/003",
        customerGstin: "07AABCU9603R1ZP",
        customerName: "Delhi Customer",
      }),
    ];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.b2b!.length).toBe(2);
    const karnatakaEntry = result.b2b!.find((e) => e.ctin === "29AABCT1332L1ZA");
    expect(karnatakaEntry!.inv.length).toBe(2);
  });

  it("should build HSN summary", () => {
    const invoices = [makeInvoice()];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.hsn).toBeDefined();
    expect(result.hsn!.data.length).toBeGreaterThan(0);
    expect(result.hsn!.data[0]!.hsn_sc).toBe("8517");
    expect(result.hsn!.data[0]!.qty).toBe(10);
  });

  it("should handle reverse charge flag", () => {
    const invoices = [makeInvoice({ isReverseCharge: true })];
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, invoices);

    expect(result.b2b![0]!.inv[0]!.rchrg).toBe("Y");
  });

  it("should convert period format from YYYY-MM to MMYYYY", () => {
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-03", supplierState, [
      makeInvoice(),
    ]);
    expect(result.fp).toBe("032025");
  });

  it("should handle empty invoice array by returning minimal payload", () => {
    const result = buildGstr1("27AAPFU0939F1ZV", "2025-01", supplierState, []);

    expect(result.gstin).toBe("27AAPFU0939F1ZV");
    expect(result.b2b).toBeUndefined();
    expect(result.b2cl).toBeUndefined();
    expect(result.b2cs).toBeUndefined();
  });
});
