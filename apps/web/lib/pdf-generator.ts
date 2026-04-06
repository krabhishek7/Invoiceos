import { db } from "@invoiceos/db";
import { formatPaiseToInr, paiseToRupees } from "@invoiceos/gst-utils";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  placeOfSupply: string;
  isReverseCharge: boolean;
  isExport: boolean;
  irn: string | null;
  qrCodeData: string | null;
  subtotal: bigint;
  cgstAmount: bigint;
  sgstAmount: bigint;
  igstAmount: bigint;
  totalAmount: bigint;
  customer: {
    name: string;
    gstin: string | null;
    billingLine1: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingPincode: string | null;
    phone: string | null;
    email: string | null;
  };
  org: {
    name: string;
    gstin: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
    email: string | null;
  };
  items: {
    description: string;
    hsnSacCode: string | null;
    quantity: number;
    unit: string;
    unitPrice: bigint;
    taxableValue: bigint;
    gstRate: string;
    cgstAmount: bigint;
    sgstAmount: bigint;
    igstAmount: bigint;
    total: bigint;
  }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convert(n: number): string {
    if (n < 20) return ones[n]!;
    if (n < 100) return tens[Math.floor(n / 10)]! + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)]! +
        " Hundred" +
        (n % 100 ? " and " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = "Rupees " + convert(rupees);
  if (paise > 0) {
    result += " and " + convert(paise) + " Paise";
  }
  result += " Only";
  return result;
}

export function generateInvoiceHtml(data: InvoiceData): string {
  const isInterState = Number(data.igstAmount) > 0;
  const totalInRupees = paiseToRupees(data.totalAmount);
  const amountInWords = numberToWords(totalInRupees);

  const itemRows = data.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;">${idx + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">
          ${item.description}
          ${item.hsnSacCode ? `<br/><span style="color:#6b7280;font-size:11px;">HSN: ${item.hsnSacCode}</span>` : ""}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;">${item.quantity} ${item.unit}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;">${formatPaiseToInr(item.unitPrice)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;">${formatPaiseToInr(item.taxableValue)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;">${item.gstRate.replace("GST_", "")}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;">${formatPaiseToInr(item.cgstAmount + item.sgstAmount + item.igstAmount)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:600;">${formatPaiseToInr(item.total)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:32px;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
      <div>
        <h1 style="font-size:24px;font-weight:700;color:#111827;">${data.org.name}</h1>
        ${data.org.gstin ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">GSTIN: <strong>${data.org.gstin}</strong></p>` : ""}
        ${data.org.addressLine1 ? `<p style="font-size:12px;color:#6b7280;">${data.org.addressLine1}</p>` : ""}
        <p style="font-size:12px;color:#6b7280;">
          ${[data.org.city, data.org.state, data.org.pincode].filter(Boolean).join(", ")}
        </p>
        ${data.org.phone ? `<p style="font-size:12px;color:#6b7280;">Phone: ${data.org.phone}</p>` : ""}
        ${data.org.email ? `<p style="font-size:12px;color:#6b7280;">Email: ${data.org.email}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <h2 style="font-size:20px;font-weight:700;color:#2563eb;">TAX INVOICE</h2>
        <p style="font-size:14px;font-weight:600;margin-top:8px;">${data.invoiceNumber}</p>
        <p style="font-size:12px;color:#6b7280;">Date: ${formatDate(data.invoiceDate)}</p>
        ${data.dueDate ? `<p style="font-size:12px;color:#6b7280;">Due: ${formatDate(data.dueDate)}</p>` : ""}
        ${data.isReverseCharge ? `<p style="font-size:11px;color:#dc2626;margin-top:4px;">Reverse Charge Applicable</p>` : ""}
      </div>
    </div>

    <!-- Bill To -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Bill To</p>
      <p style="font-size:14px;font-weight:600;">${data.customer.name}</p>
      ${data.customer.gstin ? `<p style="font-size:12px;color:#6b7280;">GSTIN: ${data.customer.gstin}</p>` : ""}
      ${data.customer.billingLine1 ? `<p style="font-size:12px;color:#6b7280;">${data.customer.billingLine1}</p>` : ""}
      <p style="font-size:12px;color:#6b7280;">
        ${[data.customer.billingCity, data.customer.billingState, data.customer.billingPincode].filter(Boolean).join(", ")}
      </p>
      <p style="font-size:12px;color:#6b7280;">Place of Supply: ${data.placeOfSupply}</p>
    </div>

    ${data.irn ? `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;margin-bottom:24px;">
      <p style="font-size:11px;color:#065f46;font-weight:600;">e-Invoice IRN: ${data.irn}</p>
    </div>
    ` : ""}

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;text-align:center;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">#</th>
          <th style="padding:8px;text-align:left;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Description</th>
          <th style="padding:8px;text-align:center;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Qty</th>
          <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Rate</th>
          <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Taxable</th>
          <th style="padding:8px;text-align:center;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">GST</th>
          <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Tax Amt</th>
          <th style="padding:8px;text-align:right;font-size:11px;font-weight:600;border-bottom:2px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div style="width:280px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
          <span style="color:#6b7280;">Subtotal</span>
          <span>${formatPaiseToInr(data.subtotal)}</span>
        </div>
        ${
          isInterState
            ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                <span style="color:#6b7280;">IGST</span>
                <span>${formatPaiseToInr(data.igstAmount)}</span>
              </div>`
            : `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                <span style="color:#6b7280;">CGST</span>
                <span>${formatPaiseToInr(data.cgstAmount)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
                <span style="color:#6b7280;">SGST</span>
                <span>${formatPaiseToInr(data.sgstAmount)}</span>
              </div>`
        }
        <div style="border-top:2px solid #111827;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;">
          <span>Total</span>
          <span>${formatPaiseToInr(data.totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Amount in Words -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:24px;">
      <p style="font-size:11px;color:#6b7280;margin-bottom:2px;">Amount in Words</p>
      <p style="font-size:13px;font-weight:500;">${amountInWords}</p>
    </div>

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;">
      <div>
        <p style="font-size:11px;color:#6b7280;">Generated by InvoiceOS</p>
        <p style="font-size:11px;color:#6b7280;">This is a computer-generated invoice.</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:12px;font-weight:600;">For ${data.org.name}</p>
        <p style="font-size:11px;color:#6b7280;margin-top:32px;">Authorised Signatory</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function getInvoiceDataForPdf(
  invoiceId: string,
  orgId: string
): Promise<InvoiceData | null> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, orgId },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
      org: true,
    },
  });

  if (!invoice) return null;

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    placeOfSupply: invoice.placeOfSupply,
    isReverseCharge: invoice.isReverseCharge,
    isExport: invoice.isExport,
    irn: invoice.irn,
    qrCodeData: invoice.qrCodeData,
    subtotal: invoice.subtotal,
    cgstAmount: invoice.cgstAmount,
    sgstAmount: invoice.sgstAmount,
    igstAmount: invoice.igstAmount,
    totalAmount: invoice.totalAmount,
    customer: {
      name: invoice.customer.name,
      gstin: invoice.customer.gstin,
      billingLine1: invoice.customer.billingLine1,
      billingCity: invoice.customer.billingCity,
      billingState: invoice.customer.billingState,
      billingPincode: invoice.customer.billingPincode,
      phone: invoice.customer.phone,
      email: invoice.customer.email,
    },
    org: {
      name: invoice.org.name,
      gstin: invoice.org.gstin,
      addressLine1: invoice.org.addressLine1,
      city: invoice.org.city,
      state: invoice.org.state,
      pincode: invoice.org.pincode,
      phone: invoice.org.phone,
      email: invoice.org.email,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxableValue: item.taxableValue,
      gstRate: item.gstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      total: item.total,
    })),
  };
}
