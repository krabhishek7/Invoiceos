import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  calculateLineItemGst,
  calculateInvoiceTotals,
  rupeesToPaise,
  type GstRatePercent,
} from "@invoiceos/gst-utils";

const gstRateSchema = z.enum(["GST_0", "GST_5", "GST_12", "GST_18", "GST_28"]);

function gstRateEnumToPercent(rate: string): GstRatePercent {
  const map: Record<string, GstRatePercent> = {
    GST_0: 0, GST_5: 5, GST_12: 12, GST_18: 18, GST_28: 28,
  };
  return map[rate] ?? 18;
}

const creditNoteItemSchema = z.object({
  description: z.string().min(1),
  hsnSacCode: z.string().optional(),
  quantity: z.number().int().min(1),
  unit: z.string().default("NOS"),
  unitPrice: z.number().min(0),
  gstRate: gstRateSchema.default("GST_18"),
});

export const creditNoteRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        ctx.db.creditNote.findMany({
          where: { orgId: ctx.session.orgId },
          include: {
            customer: { select: { name: true, gstin: true } },
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.creditNote.count({ where: { orgId: ctx.session.orgId } }),
      ]);

      return {
        items: items.map((cn) => ({
          id: cn.id,
          creditNoteNumber: cn.creditNoteNumber,
          creditNoteDate: cn.creditNoteDate.toISOString(),
          reason: cn.reason,
          customerName: cn.customer.name,
          invoiceNumber: cn.invoice.invoiceNumber,
          totalAmount: cn.totalAmount.toString(),
          status: cn.status,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        reason: z.enum([
          "SALES_RETURN",
          "POST_SALE_DISCOUNT",
          "DEFICIENCY_IN_SERVICE",
          "CORRECTION_IN_INVOICE",
          "CHANGE_IN_POS",
          "FINALIZATION_OF_PROVISIONAL_ASSESSMENT",
          "OTHERS",
        ]),
        items: z.array(creditNoteItemSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        include: { customer: true, org: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "DRAFT") throw new Error("Cannot create credit note for draft invoice");

      const org = invoice.org;
      const supplierStateCode = org.stateCode ?? "27";

      const seq = org.nextInvoiceSeq;
      const prefix = org.invoicePrefix ?? "INV";
      const fy = org.currentFy ?? "25-26";
      const creditNoteNumber = `CN/${prefix}/${fy}/${String(seq).padStart(3, "0")}`;

      const gstResults = input.items.map((item) => {
        const gstPercent = gstRateEnumToPercent(item.gstRate);
        return calculateLineItemGst({
          unitPricePaise: rupeesToPaise(item.unitPrice),
          quantity: item.quantity,
          discountPercent: 0,
          gstRatePercent: gstPercent,
          supplierStateCode,
          placeOfSupply: invoice.placeOfSupply,
        });
      });

      const totals = calculateInvoiceTotals(gstResults);

      const creditNote = await ctx.db.creditNote.create({
        data: {
          orgId: ctx.session.orgId,
          creditNoteNumber,
          creditNoteDate: new Date(),
          reason: input.reason,
          invoiceId: input.invoiceId,
          customerId: invoice.customerId,
          subtotal: totals.subtotalPaise,
          cgstAmount: totals.cgstTotalPaise,
          sgstAmount: totals.sgstTotalPaise,
          igstAmount: totals.igstTotalPaise,
          totalAmount: totals.grandTotalPaise,
          items: {
            create: input.items.map((item, idx) => {
              const calc = gstResults[idx]!;
              return {
                description: item.description,
                hsnSacCode: item.hsnSacCode,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: rupeesToPaise(item.unitPrice),
                taxableValue: calc.taxableValuePaise,
                gstRate: item.gstRate,
                cgstAmount: calc.cgstAmountPaise,
                sgstAmount: calc.sgstAmountPaise,
                igstAmount: calc.igstAmountPaise,
                total: calc.totalPaise,
              };
            }),
          },
        },
      });

      await ctx.db.organization.update({
        where: { id: ctx.session.orgId },
        data: { nextInvoiceSeq: seq + 1 },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "CREDIT_NOTE_CREATED",
          entityType: "credit_note",
          entityId: creditNote.id,
          metadata: {
            creditNoteNumber,
            invoiceId: input.invoiceId,
            reason: input.reason,
            totalAmount: totals.grandTotalPaise.toString(),
          },
        },
      });

      return {
        id: creditNote.id,
        creditNoteNumber,
        totalAmount: totals.grandTotalPaise.toString(),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cn = await ctx.db.creditNote.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
        include: {
          customer: true,
          invoice: { select: { invoiceNumber: true, invoiceDate: true } },
          items: true,
        },
      });
      if (!cn) throw new Error("Credit note not found");

      return {
        ...cn,
        subtotal: cn.subtotal.toString(),
        cgstAmount: cn.cgstAmount.toString(),
        sgstAmount: cn.sgstAmount.toString(),
        igstAmount: cn.igstAmount.toString(),
        totalAmount: cn.totalAmount.toString(),
        items: cn.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          taxableValue: item.taxableValue.toString(),
          cgstAmount: item.cgstAmount.toString(),
          sgstAmount: item.sgstAmount.toString(),
          igstAmount: item.igstAmount.toString(),
          total: item.total.toString(),
        })),
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cn = await ctx.db.creditNote.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId, status: "ACTIVE" },
      });
      if (!cn) throw new Error("Active credit note not found");

      await ctx.db.creditNote.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "CREDIT_NOTE_CANCELLED",
          entityType: "credit_note",
          entityId: input.id,
        },
      });

      return { success: true };
    }),
});
