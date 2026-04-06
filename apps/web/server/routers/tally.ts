import { z } from "zod";
import { router, featureGateProcedure, protectedProcedure } from "../trpc";
import {
  parseTallyXml,
  buildTallyExportXml,
  type TallyVoucher,
} from "@/lib/tally-parser";
import {
  rupeesToPaise,
  paiseToRupees,
} from "@invoiceos/gst-utils";

export const tallyRouter = router({
  importVouchers: featureGateProcedure("tallyIntegration")
    .input(
      z.object({
        xmlContent: z.string().min(1, "XML content is required"),
        importType: z.enum(["SALES", "PURCHASE"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const vouchers = parseTallyXml(input.xmlContent);

      if (vouchers.length === 0) {
        throw new Error("No valid vouchers found in the XML file");
      }

      const results = {
        total: vouchers.length,
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const voucher of vouchers) {
        try {
          if (input.importType === "PURCHASE") {
            await importPurchaseVoucher(ctx, voucher);
          } else {
            await importSalesVoucher(ctx, voucher);
          }
          results.imported++;
        } catch (err) {
          results.skipped++;
          results.errors.push(
            `${voucher.voucherNumber}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "TALLY_IMPORT",
          entityType: "tally_import",
          entityId: "batch",
          metadata: results,
        },
      });

      return results;
    }),

  exportInvoices: featureGateProcedure("tallyIntegration")
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoices = await ctx.db.invoice.findMany({
        where: {
          orgId: ctx.session.orgId,
          invoiceDate: {
            gte: new Date(input.fromDate),
            lte: new Date(input.toDate),
          },
          status: { not: "DRAFT" },
        },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { invoiceDate: "asc" },
      });

      const tallyVouchers: TallyVoucher[] = invoices.map((inv) => ({
        voucherType: "Sales",
        date: inv.invoiceDate.toISOString().split("T")[0]!,
        voucherNumber: inv.invoiceNumber,
        partyName: inv.customer.name,
        partyGstin: inv.customer.gstin ?? undefined,
        placeOfSupply: inv.placeOfSupply,
        items: inv.items.map((item) => ({
          itemName: item.description,
          hsnCode: item.hsnSacCode ?? undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: paiseToRupees(item.unitPrice),
          amount: paiseToRupees(item.taxableValue),
          gstRate: gstEnumToRateNum(item.gstRate),
        })),
        totalAmount: paiseToRupees(inv.subtotal),
        gstDetails: {
          cgst: paiseToRupees(inv.cgstAmount),
          sgst: paiseToRupees(inv.sgstAmount),
          igst: paiseToRupees(inv.igstAmount),
        },
      }));

      const xml = buildTallyExportXml(tallyVouchers);

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "TALLY_EXPORT",
          entityType: "tally_export",
          entityId: "batch",
          metadata: { count: invoices.length, fromDate: input.fromDate, toDate: input.toDate },
        },
      });

      return { xml, count: invoices.length };
    }),
});

async function importPurchaseVoucher(
  ctx: { db: (typeof import("@invoiceos/db"))["db"]; session: { orgId: string } },
  voucher: TallyVoucher
) {
  const cgst = voucher.gstDetails?.cgst ?? 0;
  const sgst = voucher.gstDetails?.sgst ?? 0;
  const igst = voucher.gstDetails?.igst ?? 0;
  const taxableValue = voucher.totalAmount;
  const total = taxableValue + cgst + sgst + igst;

  await ctx.db.purchaseInvoice.create({
    data: {
      orgId: ctx.session.orgId,
      supplierName: voucher.partyName,
      supplierGstin: voucher.partyGstin ?? "UNREGISTERED",
      invoiceNumber: voucher.voucherNumber,
      invoiceDate: new Date(voucher.date),
      taxableValue: BigInt(rupeesToPaise(taxableValue)),
      cgstAmount: BigInt(rupeesToPaise(cgst)),
      sgstAmount: BigInt(rupeesToPaise(sgst)),
      igstAmount: BigInt(rupeesToPaise(igst)),
      totalAmount: BigInt(rupeesToPaise(total)),
      source: "TALLY_IMPORT",
    },
  });
}

async function importSalesVoucher(
  ctx: { db: (typeof import("@invoiceos/db"))["db"]; session: { orgId: string } },
  _voucher: TallyVoucher
) {
  throw new Error("Sales import from Tally is not yet supported — use InvoiceOS to create invoices");
}

function gstEnumToRateNum(rate: string): number {
  const map: Record<string, number> = {
    GST_0: 0, GST_5: 5, GST_12: 12, GST_18: 18, GST_28: 28,
  };
  return map[rate] ?? 18;
}
