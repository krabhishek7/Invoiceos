import { paiseToRupees } from "@invoiceos/gst-utils";

const IRP_BASE_URL =
  process.env.IRP_BASE_URL ?? "https://einv-apisandbox.nic.in";

interface IrpAuthResult {
  authToken: string;
  tokenExpiry: Date;
}

interface IrpGenerateResult {
  irn: string;
  ackNumber: string;
  ackDate: string;
  signedQrCode: string;
  signedInvoice: string;
}

interface IrpError {
  errorCode: string;
  errorMessage: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok || attempt === retries) return response;

    if (response.status === 429 || response.status >= 500) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      await new Promise((r) => setTimeout(r, delay + jitter));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

export async function authenticateWithIrp(): Promise<IrpAuthResult> {
  const clientId = process.env.IRP_CLIENT_ID;
  const clientSecret = process.env.IRP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("IRP credentials not configured");
  }

  const response = await fetchWithRetry(`${IRP_BASE_URL}/eivital/v1.04/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: clientId,
      client_secret: clientSecret,
    },
    body: JSON.stringify({
      UserName: process.env.GSP_USERNAME ?? "",
      Password: process.env.GSP_PASSWORD ?? "",
      ForceRefreshAccessToken: "true",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`IRP auth failed: ${err}`);
  }

  const data = await response.json();
  return {
    authToken: data.Data?.AuthToken ?? data.AuthToken,
    tokenExpiry: new Date(
      Date.now() + (data.Data?.TokenExpiry ?? 3600) * 1000
    ),
  };
}

export function buildEInvoicePayload(params: {
  supplierGstin: string;
  supplierName: string;
  supplierAddress: string;
  supplierCity: string;
  supplierState: string;
  supplierStateCode: string;
  supplierPincode: string;
  receiverGstin: string;
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  receiverStateCode: string;
  receiverPincode: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: string;
  totalValue: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  items: {
    slNo: number;
    productDescription: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
    taxableValue: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  }[];
  isReverseCharge: boolean;
}): Record<string, unknown> {
  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: params.isReverseCharge ? "Y" : "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: params.invoiceType === "CREDIT_NOTE" ? "CRN" : "INV",
      No: params.invoiceNumber,
      Dt: params.invoiceDate,
    },
    SellerDtls: {
      Gstin: params.supplierGstin,
      LglNm: params.supplierName,
      Addr1: params.supplierAddress,
      Loc: params.supplierCity,
      Pin: parseInt(params.supplierPincode) || 0,
      Stcd: params.supplierStateCode,
    },
    BuyerDtls: {
      Gstin: params.receiverGstin,
      LglNm: params.receiverName,
      Addr1: params.receiverAddress,
      Loc: params.receiverCity,
      Pin: parseInt(params.receiverPincode) || 0,
      Stcd: params.receiverStateCode,
      Pos: params.receiverStateCode,
    },
    ItemList: params.items.map((item) => ({
      SlNo: String(item.slNo),
      PrdDesc: item.productDescription,
      IsServc: item.hsnCode.startsWith("99") ? "Y" : "N",
      HsnCd: item.hsnCode,
      Qty: item.quantity,
      Unit: item.unit,
      UnitPrice: item.unitPrice,
      TotAmt: item.totalAmount,
      Discount: 0,
      AssAmt: item.taxableValue,
      GstRt: item.gstRate,
      CgstAmt: item.cgstAmount,
      SgstAmt: item.sgstAmount,
      IgstAmt: item.igstAmount,
      CesRt: 0,
      CesAmt: 0,
      TotItemVal:
        item.taxableValue +
        item.cgstAmount +
        item.sgstAmount +
        item.igstAmount,
    })),
    ValDtls: {
      AssVal: params.totalTaxableValue,
      CgstVal: params.totalCgst,
      SgstVal: params.totalSgst,
      IgstVal: params.totalIgst,
      CesVal: 0,
      Discount: 0,
      OthChrg: 0,
      TotInvVal: params.totalValue,
    },
  };
}

export async function generateIrn(
  authToken: string,
  payload: Record<string, unknown>
): Promise<IrpGenerateResult> {
  const response = await fetchWithRetry(
    `${IRP_BASE_URL}/eivital/v1.04/Invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        client_id: process.env.IRP_CLIENT_ID ?? "",
        Gstin: (payload.SellerDtls as Record<string, string>).Gstin ?? "",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok || data.Status === 0) {
    const errors: IrpError[] = data.ErrorDetails ?? [
      { errorCode: "UNKNOWN", errorMessage: data.ErrorMessage ?? "Unknown IRP error" },
    ];
    throw new IrpApiError(errors);
  }

  return {
    irn: data.Data?.Irn ?? data.Irn,
    ackNumber: String(data.Data?.AckNo ?? data.AckNo ?? ""),
    ackDate: data.Data?.AckDt ?? data.AckDt ?? "",
    signedQrCode: data.Data?.SignedQRCode ?? data.SignedQRCode ?? "",
    signedInvoice: data.Data?.SignedInvoice ?? data.SignedInvoice ?? "",
  };
}

export async function cancelIrn(
  authToken: string,
  irn: string,
  reason: string,
  cancelRemarks: string
): Promise<void> {
  const response = await fetchWithRetry(
    `${IRP_BASE_URL}/eivital/v1.04/Invoice/Cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        client_id: process.env.IRP_CLIENT_ID ?? "",
      },
      body: JSON.stringify({
        Irn: irn,
        CnlRsn: reason,
        CnlRem: cancelRemarks,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`IRN cancellation failed: ${err}`);
  }
}

export class IrpApiError extends Error {
  errors: IrpError[];

  constructor(errors: IrpError[]) {
    super(errors.map((e) => `${e.errorCode}: ${e.errorMessage}`).join("; "));
    this.name = "IrpApiError";
    this.errors = errors;
  }
}
