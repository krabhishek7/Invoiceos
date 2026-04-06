/**
 * GSTR-1 JSON builder.
 *
 * Generates the JSON payload for GSTR-1 filing per GSTN schema.
 * Sections: b2b, b2cl, b2cs, cdnr, cdnur, nil, hsn
 */

import type { GstRatePercent } from "./gst-calculator";

// ─── Input Types ─────────────────────────────────────────────

export interface Gstr1Invoice {
  invoiceNumber: string;
  invoiceDate: string; // DD-MM-YYYY (GSTN format)
  placeOfSupply: string; // 2-digit state code
  isReverseCharge: boolean;
  invoiceType: "R" | "SEWP" | "SEWOP" | "DE"; // Regular, SEZ with payment, SEZ without, Deemed export
  customerGstin?: string;
  customerName: string;
  invoiceValue: number; // In rupees (GSTN accepts rupees, not paise)
  items: Gstr1InvoiceItem[];
}

export interface Gstr1InvoiceItem {
  hsnCode: string;
  description: string;
  quantity: number;
  unit: string;
  taxableValue: number; // In rupees
  gstRate: GstRatePercent;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  cessAmount?: number;
}

// ─── GSTN Schema Types ──────────────────────────────────────

interface GstnB2bInvoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: "Y" | "N";
  inv_typ: string;
  itms: GstnItem[];
}

interface GstnB2bEntry {
  ctin: string;
  inv: GstnB2bInvoice[];
}

interface GstnB2clInvoice {
  inum: string;
  idt: string;
  val: number;
  itms: GstnItem[];
}

interface GstnB2clEntry {
  pos: string;
  inv: GstnB2clInvoice[];
}

interface GstnB2csEntry {
  pos: string;
  sply_ty: "INTRA" | "INTER";
  rt: number;
  typ: "OE" | "E"; // OE = outward, E = E-commerce
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

interface GstnItem {
  num: number;
  itm_det: {
    rt: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  };
}

interface GstnHsnEntry {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr1Payload {
  gstin: string;
  fp: string; // Filing period MMYYYY
  b2b?: GstnB2bEntry[];
  b2cl?: GstnB2clEntry[];
  b2cs?: GstnB2csEntry[];
  hsn?: { data: GstnHsnEntry[] };
}

// ─── Builder ─────────────────────────────────────────────────

export function buildGstr1(
  gstin: string,
  period: string, // YYYY-MM
  supplierStateCode: string,
  invoices: Gstr1Invoice[]
): Gstr1Payload {
  const [year, month] = period.split("-");
  const fp = `${month}${year}`; // Convert YYYY-MM to MMYYYY for GSTN

  const payload: Gstr1Payload = {
    gstin,
    fp,
  };

  // Separate invoices by type
  const b2bInvoices: Gstr1Invoice[] = [];
  const b2clInvoices: Gstr1Invoice[] = [];
  const b2csInvoices: Gstr1Invoice[] = [];

  for (const inv of invoices) {
    if (inv.customerGstin) {
      b2bInvoices.push(inv);
    } else if (inv.invoiceValue > 250000) {
      // B2C Large: inter-state sales > ₹2.5 lakh to unregistered
      if (supplierStateCode !== inv.placeOfSupply) {
        b2clInvoices.push(inv);
      } else {
        b2csInvoices.push(inv);
      }
    } else {
      b2csInvoices.push(inv);
    }
  }

  // Build B2B section
  if (b2bInvoices.length > 0) {
    payload.b2b = buildB2bSection(b2bInvoices);
  }

  // Build B2CL section
  if (b2clInvoices.length > 0) {
    payload.b2cl = buildB2clSection(b2clInvoices);
  }

  // Build B2CS section (state-wise, rate-wise summary)
  if (b2csInvoices.length > 0) {
    payload.b2cs = buildB2csSection(b2csInvoices, supplierStateCode);
  }

  // Build HSN summary
  const allItems = invoices.flatMap((inv) => inv.items);
  if (allItems.length > 0) {
    payload.hsn = { data: buildHsnSummary(allItems) };
  }

  return payload;
}

function buildB2bSection(invoices: Gstr1Invoice[]): GstnB2bEntry[] {
  const grouped = new Map<string, Gstr1Invoice[]>();

  for (const inv of invoices) {
    const gstin = inv.customerGstin!;
    if (!grouped.has(gstin)) grouped.set(gstin, []);
    grouped.get(gstin)!.push(inv);
  }

  return Array.from(grouped.entries()).map(([ctin, invs]) => ({
    ctin,
    inv: invs.map((inv) => ({
      inum: inv.invoiceNumber,
      idt: inv.invoiceDate,
      val: Math.round(inv.invoiceValue * 100) / 100,
      pos: inv.placeOfSupply,
      rchrg: inv.isReverseCharge ? ("Y" as const) : ("N" as const),
      inv_typ: inv.invoiceType,
      itms: inv.items.map((item, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: item.gstRate,
          txval: Math.round(item.taxableValue * 100) / 100,
          iamt: Math.round(item.igstAmount * 100) / 100,
          camt: Math.round(item.cgstAmount * 100) / 100,
          samt: Math.round(item.sgstAmount * 100) / 100,
          csamt: item.cessAmount ?? 0,
        },
      })),
    })),
  }));
}

function buildB2clSection(invoices: Gstr1Invoice[]): GstnB2clEntry[] {
  const grouped = new Map<string, Gstr1Invoice[]>();

  for (const inv of invoices) {
    if (!grouped.has(inv.placeOfSupply)) grouped.set(inv.placeOfSupply, []);
    grouped.get(inv.placeOfSupply)!.push(inv);
  }

  return Array.from(grouped.entries()).map(([pos, invs]) => ({
    pos,
    inv: invs.map((inv) => ({
      inum: inv.invoiceNumber,
      idt: inv.invoiceDate,
      val: Math.round(inv.invoiceValue * 100) / 100,
      itms: inv.items.map((item, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: item.gstRate,
          txval: Math.round(item.taxableValue * 100) / 100,
          iamt: Math.round(item.igstAmount * 100) / 100,
          camt: Math.round(item.cgstAmount * 100) / 100,
          samt: Math.round(item.sgstAmount * 100) / 100,
          csamt: item.cessAmount ?? 0,
        },
      })),
    })),
  }));
}

function buildB2csSection(
  invoices: Gstr1Invoice[],
  supplierStateCode: string
): GstnB2csEntry[] {
  // B2CS is a summary table: group by state + rate + supply type
  const summaryMap = new Map<
    string,
    { txval: number; iamt: number; camt: number; samt: number; pos: string; rt: number; splyType: "INTRA" | "INTER" }
  >();

  for (const inv of invoices) {
    const isInter = supplierStateCode !== inv.placeOfSupply;
    for (const item of inv.items) {
      const key = `${inv.placeOfSupply}_${item.gstRate}_${isInter ? "INTER" : "INTRA"}`;
      const existing = summaryMap.get(key);
      if (existing) {
        existing.txval += item.taxableValue;
        existing.iamt += item.igstAmount;
        existing.camt += item.cgstAmount;
        existing.samt += item.sgstAmount;
      } else {
        summaryMap.set(key, {
          pos: inv.placeOfSupply,
          rt: item.gstRate,
          splyType: isInter ? "INTER" : "INTRA",
          txval: item.taxableValue,
          iamt: item.igstAmount,
          camt: item.cgstAmount,
          samt: item.sgstAmount,
        });
      }
    }
  }

  return Array.from(summaryMap.values()).map((s) => ({
    pos: s.pos,
    sply_ty: s.splyType,
    rt: s.rt,
    typ: "OE" as const,
    txval: Math.round(s.txval * 100) / 100,
    iamt: Math.round(s.iamt * 100) / 100,
    camt: Math.round(s.camt * 100) / 100,
    samt: Math.round(s.samt * 100) / 100,
    csamt: 0,
  }));
}

function buildHsnSummary(items: Gstr1InvoiceItem[]): GstnHsnEntry[] {
  const hsnMap = new Map<
    string,
    { desc: string; uqc: string; qty: number; txval: number; iamt: number; camt: number; samt: number }
  >();

  for (const item of items) {
    const existing = hsnMap.get(item.hsnCode);
    if (existing) {
      existing.qty += item.quantity;
      existing.txval += item.taxableValue;
      existing.iamt += item.igstAmount;
      existing.camt += item.cgstAmount;
      existing.samt += item.sgstAmount;
    } else {
      hsnMap.set(item.hsnCode, {
        desc: item.description,
        uqc: mapUnitToGstn(item.unit),
        qty: item.quantity,
        txval: item.taxableValue,
        iamt: item.igstAmount,
        camt: item.cgstAmount,
        samt: item.sgstAmount,
      });
    }
  }

  return Array.from(hsnMap.entries()).map(([hsn, data], idx) => ({
    num: idx + 1,
    hsn_sc: hsn,
    desc: data.desc,
    uqc: data.uqc,
    qty: data.qty,
    txval: Math.round(data.txval * 100) / 100,
    iamt: Math.round(data.iamt * 100) / 100,
    camt: Math.round(data.camt * 100) / 100,
    samt: Math.round(data.samt * 100) / 100,
    csamt: 0,
  }));
}

function mapUnitToGstn(unit: string): string {
  const map: Record<string, string> = {
    NOS: "NOS-NUMBERS",
    KGS: "KGS-KILOGRAMS",
    MTR: "MTR-METERS",
    LTR: "LTR-LITRES",
    PCS: "PCS-PIECES",
    BOX: "BOX-BOX",
    BAG: "BAG-BAGS",
    SQM: "SQM-SQUARE METERS",
    SET: "SET-SETS",
    PAC: "PAC-PACKS",
    OTH: "OTH-OTHERS",
  };
  return map[unit.toUpperCase()] ?? "OTH-OTHERS";
}
