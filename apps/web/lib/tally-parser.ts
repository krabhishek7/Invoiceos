import { XMLParser, XMLBuilder } from "fast-xml-parser";

export interface TallyVoucher {
  voucherType: string;
  date: string;
  voucherNumber: string;
  partyName: string;
  partyGstin?: string;
  placeOfSupply?: string;
  items: TallyVoucherItem[];
  totalAmount: number;
  gstDetails?: {
    cgst: number;
    sgst: number;
    igst: number;
  };
}

export interface TallyVoucherItem {
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate?: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (tagName) => {
    const arrayTags = [
      "VOUCHER",
      "ALLLEDGERENTRIES.LIST",
      "INVENTORYENTRIES.LIST",
      "LEDGERENTRIES.LIST",
      "ALLINVENTORYENTRIES.LIST",
      "BILLALLOCATIONS.LIST",
      "BATCHALLOCATIONS.LIST",
    ];
    return arrayTags.includes(tagName);
  },
});

export function parseTallyXml(xmlContent: string): TallyVoucher[] {
  const parsed = parser.parse(xmlContent);

  const envelope =
    parsed.ENVELOPE ?? parsed.envelope ?? parsed;
  const body = envelope.BODY ?? envelope.body ?? envelope;
  const data = body.DATA ?? body.data ?? body;
  const tallyMessage =
    data.TALLYMESSAGE ?? data.tallymessage ?? data;

  let vouchers: unknown[] = [];

  if (Array.isArray(tallyMessage)) {
    for (const msg of tallyMessage) {
      const v = msg.VOUCHER ?? msg.voucher;
      if (v) {
        vouchers = vouchers.concat(Array.isArray(v) ? v : [v]);
      }
    }
  } else if (tallyMessage?.VOUCHER) {
    const v = tallyMessage.VOUCHER;
    vouchers = Array.isArray(v) ? v : [v];
  }

  return vouchers
    .map(parseVoucher)
    .filter((v): v is TallyVoucher => v !== null);
}

function parseVoucher(raw: unknown): TallyVoucher | null {
  const v = raw as Record<string, unknown>;

  const voucherType = String(
    v["@_VCHTYPE"] ?? v.VOUCHERTYPENAME ?? v.vouchertypename ?? ""
  );

  if (!isSalesOrPurchaseVoucher(voucherType)) return null;

  const date = parseDate(String(v.DATE ?? v["@_DATE"] ?? ""));
  const voucherNumber = String(
    v.VOUCHERNUMBER ?? v.vouchernumber ?? v["@_NUMBER"] ?? ""
  );
  const partyName = String(v.PARTYLEDGERNAME ?? v.partyledgername ?? "");

  const gstRegistration = v.GSTREGISTRATION ?? {};
  const partyGstin = String(
    (gstRegistration as Record<string, unknown>).GSTIN ??
      v.PARTYGSTIN ??
      ""
  );

  const ledgerEntries = extractArray(
    v,
    "ALLLEDGERENTRIES.LIST",
    "LEDGERENTRIES.LIST"
  );
  const inventoryEntries = extractArray(
    v,
    "ALLINVENTORYENTRIES.LIST",
    "INVENTORYENTRIES.LIST"
  );

  const items: TallyVoucherItem[] = inventoryEntries.map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      itemName: String(e.STOCKITEMNAME ?? e.stockitemname ?? ""),
      hsnCode: String(e.HSNCODE ?? e.hsncode ?? ""),
      quantity: parseFloat(String(e.ACTUALQTY ?? e.actualqty ?? "0")) || 0,
      unit: String(e.UNITNAME ?? e.unitname ?? "NOS"),
      rate: Math.abs(parseFloat(String(e.RATE ?? e.rate ?? "0"))) || 0,
      amount: Math.abs(parseFloat(String(e.AMOUNT ?? e.amount ?? "0"))) || 0,
      gstRate: parseFloat(String(e.GSTRATE ?? e.gstrate ?? "0")) || undefined,
    };
  });

  let totalAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const entry of ledgerEntries) {
    const e = entry as Record<string, unknown>;
    const ledgerName = String(
      e.LEDGERNAME ?? e.ledgername ?? ""
    ).toUpperCase();
    const amount =
      Math.abs(parseFloat(String(e.AMOUNT ?? e.amount ?? "0"))) || 0;

    if (
      ledgerName.includes("CGST") ||
      ledgerName.includes("CENTRAL TAX")
    ) {
      cgst += amount;
    } else if (
      ledgerName.includes("SGST") ||
      ledgerName.includes("STATE TAX") ||
      ledgerName.includes("UTGST")
    ) {
      sgst += amount;
    } else if (
      ledgerName.includes("IGST") ||
      ledgerName.includes("INTEGRATED TAX")
    ) {
      igst += amount;
    } else if (!ledgerName.includes("TAX") && !ledgerName.includes("CESS")) {
      totalAmount += amount;
    }
  }

  if (totalAmount === 0) {
    totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  }

  return {
    voucherType,
    date,
    voucherNumber,
    partyName,
    partyGstin: partyGstin || undefined,
    items,
    totalAmount,
    gstDetails:
      cgst || sgst || igst ? { cgst, sgst, igst } : undefined,
  };
}

function isSalesOrPurchaseVoucher(type: string): boolean {
  const normalizedType = type.toUpperCase();
  return (
    normalizedType.includes("SALES") ||
    normalizedType.includes("PURCHASE") ||
    normalizedType === "INVOICE" ||
    normalizedType === "CREDIT NOTE" ||
    normalizedType === "DEBIT NOTE"
  );
}

function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  return `${y}-${m}-${d}`;
}

function extractArray(
  obj: Record<string, unknown>,
  ...keys: string[]
): unknown[] {
  for (const key of keys) {
    const value = obj[key] ?? obj[key.toLowerCase()];
    if (value) return Array.isArray(value) ? value : [value];
  }
  return [];
}

export function buildTallyExportXml(invoices: TallyVoucher[]): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    suppressBooleanAttributes: false,
  });

  const tallyVouchers = invoices.map((inv) => ({
    "@_VCHTYPE": inv.voucherType,
    DATE: inv.date.replace(/-/g, ""),
    VOUCHERTYPENAME: inv.voucherType,
    VOUCHERNUMBER: inv.voucherNumber,
    PARTYLEDGERNAME: inv.partyName,
    PARTYGSTIN: inv.partyGstin ?? "",
    "ALLINVENTORYENTRIES.LIST": inv.items.map((item) => ({
      STOCKITEMNAME: item.itemName,
      HSNCODE: item.hsnCode ?? "",
      ACTUALQTY: item.quantity,
      RATE: item.rate,
      AMOUNT: -item.amount,
    })),
    "ALLLEDGERENTRIES.LIST": [
      {
        LEDGERNAME: inv.partyName,
        AMOUNT: inv.totalAmount + (inv.gstDetails?.cgst ?? 0) + (inv.gstDetails?.sgst ?? 0) + (inv.gstDetails?.igst ?? 0),
      },
      ...(inv.gstDetails?.cgst
        ? [{ LEDGERNAME: "CGST", AMOUNT: -inv.gstDetails.cgst }]
        : []),
      ...(inv.gstDetails?.sgst
        ? [{ LEDGERNAME: "SGST", AMOUNT: -inv.gstDetails.sgst }]
        : []),
      ...(inv.gstDetails?.igst
        ? [{ LEDGERNAME: "IGST", AMOUNT: -inv.gstDetails.igst }]
        : []),
    ],
  }));

  const xml = builder.build({
    ENVELOPE: {
      HEADER: {
        TALLYREQUEST: "Import Data",
      },
      BODY: {
        IMPORTDATA: {
          REQUESTDESC: {
            REPORTNAME: "Vouchers",
          },
          REQUESTDATA: {
            TALLYMESSAGE: tallyVouchers.map((v) => ({ VOUCHER: v })),
          },
        },
      },
    },
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}
