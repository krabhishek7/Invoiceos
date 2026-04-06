import { z } from "zod";
import { router, featureGateProcedure, protectedProcedure } from "../trpc";
import {
  authenticateWithIrp,
  buildEInvoicePayload,
  generateIrn,
  cancelIrn,
  IrpApiError,
} from "@/lib/irp-client";
import { paiseToRupees } from "@invoiceos/gst-utils";

export const einvoiceRouter = router({
  generate: featureGateProcedure("eInvoiceAccess")
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: "asc" } },
          org: true,
        },
      });

      if (!invoice) throw new Error("Invoice not found");
      if (invoice.irn) throw new Error("IRN already generated for this invoice");
      if (invoice.status === "CANCELLED") throw new Error("Cannot generate IRN for cancelled invoice");
      if (!invoice.customer.gstin) throw new Error("e-Invoice requires customer GSTIN (B2B only)");
      if (!invoice.org.gstin) throw new Error("Organization GSTIN is required");

      let authToken: string;
      if (invoice.org.gstnAuthToken && invoice.org.gstnTokenExpiry && invoice.org.gstnTokenExpiry > new Date()) {
        authToken = invoice.org.gstnAuthToken;
      } else {
        const auth = await authenticateWithIrp();
        authToken = auth.authToken;
        await ctx.db.organization.update({
          where: { id: ctx.session.orgId },
          data: { gstnAuthToken: auth.authToken, gstnTokenExpiry: auth.tokenExpiry },
        });
      }

      const payload = buildEInvoicePayload({
        supplierGstin: invoice.org.gstin,
        supplierName: invoice.org.name,
        supplierAddress: invoice.org.addressLine1 ?? "",
        supplierCity: invoice.org.city ?? "",
        supplierState: invoice.org.state ?? "",
        supplierStateCode: invoice.org.stateCode ?? "",
        supplierPincode: invoice.org.pincode ?? "",
        receiverGstin: invoice.customer.gstin,
        receiverName: invoice.customer.name,
        receiverAddress: invoice.customer.billingLine1 ?? "",
        receiverCity: invoice.customer.billingCity ?? "",
        receiverState: invoice.customer.billingState ?? "",
        receiverStateCode: invoice.customer.billingStateCode ?? invoice.placeOfSupply,
        receiverPincode: invoice.customer.billingPincode ?? "",
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: formatDateForIrp(invoice.invoiceDate),
        invoiceType: "INV",
        totalValue: paiseToRupees(invoice.totalAmount),
        totalTaxableValue: paiseToRupees(invoice.subtotal),
        totalCgst: paiseToRupees(invoice.cgstAmount),
        totalSgst: paiseToRupees(invoice.sgstAmount),
        totalIgst: paiseToRupees(invoice.igstAmount),
        items: invoice.items.map((item, idx) => ({
          slNo: idx + 1,
          productDescription: item.description,
          hsnCode: item.hsnSacCode ?? "0000",
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: paiseToRupees(item.unitPrice),
          totalAmount: paiseToRupees(item.taxableValue),
          taxableValue: paiseToRupees(item.taxableValue),
          gstRate: gstEnumToRateNum(item.gstRate),
          cgstAmount: paiseToRupees(item.cgstAmount),
          sgstAmount: paiseToRupees(item.sgstAmount),
          igstAmount: paiseToRupees(item.igstAmount),
        })),
        isReverseCharge: invoice.isReverseCharge,
      });

      try {
        const result = await generateIrn(authToken, payload);

        await ctx.db.invoice.update({
          where: { id: input.invoiceId },
          data: {
            irn: result.irn,
            ackNumber: result.ackNumber,
            ackDate: result.ackDate ? new Date(result.ackDate) : null,
            qrCodeData: result.signedQrCode,
            jsonPayload: JSON.parse(JSON.stringify(payload)),
            status: "IRN_GENERATED",
          },
        });

        await ctx.db.auditLog.create({
          data: {
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            action: "IRN_GENERATED",
            entityType: "invoice",
            entityId: input.invoiceId,
            metadata: { irn: result.irn, ackNumber: result.ackNumber },
          },
        });

        return {
          irn: result.irn,
          ackNumber: result.ackNumber,
          ackDate: result.ackDate,
          qrCode: result.signedQrCode,
        };
      } catch (error) {
        const errorData =
          error instanceof IrpApiError
            ? error.errors
            : [{ errorCode: "UNKNOWN", errorMessage: String(error) }];

        await ctx.db.invoice.update({
          where: { id: input.invoiceId },
          data: { irnError: JSON.parse(JSON.stringify(errorData)) },
        });

        throw error;
      }
    }),

  cancel: featureGateProcedure("eInvoiceAccess")
    .input(
      z.object({
        invoiceId: z.string(),
        reason: z.enum(["1", "2", "3", "4"]),
        remarks: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        include: { org: true },
      });

      if (!invoice) throw new Error("Invoice not found");
      if (!invoice.irn) throw new Error("No IRN to cancel");

      const timeSinceAck = invoice.ackDate
        ? Date.now() - invoice.ackDate.getTime()
        : Infinity;
      if (timeSinceAck > 24 * 60 * 60 * 1000) {
        throw new Error("IRN can only be cancelled within 24 hours of generation");
      }

      let authToken: string;
      if (invoice.org.gstnAuthToken && invoice.org.gstnTokenExpiry && invoice.org.gstnTokenExpiry > new Date()) {
        authToken = invoice.org.gstnAuthToken;
      } else {
        const auth = await authenticateWithIrp();
        authToken = auth.authToken;
      }

      await cancelIrn(authToken, invoice.irn, input.reason, input.remarks);

      await ctx.db.invoice.update({
        where: { id: input.invoiceId },
        data: {
          irn: null,
          ackNumber: null,
          ackDate: null,
          qrCodeData: null,
          status: "CANCELLED",
        },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "IRN_CANCELLED",
          entityType: "invoice",
          entityId: input.invoiceId,
          metadata: { reason: input.reason, remarks: input.remarks },
        },
      });

      return { success: true };
    }),

  getStatus: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        select: {
          irn: true,
          ackNumber: true,
          ackDate: true,
          qrCodeData: true,
          irnError: true,
          status: true,
        },
      });

      if (!invoice) throw new Error("Invoice not found");
      return invoice;
    }),
});

function formatDateForIrp(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function gstEnumToRateNum(rate: string): number {
  const map: Record<string, number> = {
    GST_0: 0,
    GST_5: 5,
    GST_12: 12,
    GST_18: 18,
    GST_28: 28,
  };
  return map[rate] ?? 18;
}
