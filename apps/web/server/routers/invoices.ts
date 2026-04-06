import { z } from "zod";
import { router, protectedProcedure, invoiceLimitProcedure } from "../trpc";
import {
  calculateLineItemGst,
  calculateInvoiceTotals,
  rupeesToPaise,
  formatPaiseToInr,
  generateInvoiceNumber,
  getCurrentFinancialYear,
  type GstRatePercent,
} from "@invoiceos/gst-utils";
import {
  sendEmail,
  invoiceSentEmailHtml,
  paymentReceivedEmailHtml,
} from "@/lib/email";
import { sendInvoiceWhatsApp } from "@/lib/whatsapp";

const gstRateSchema = z.enum(["GST_0", "GST_5", "GST_12", "GST_18", "GST_28"]);

function gstRateEnumToPercent(rate: string): GstRatePercent {
  const map: Record<string, GstRatePercent> = {
    GST_0: 0,
    GST_5: 5,
    GST_12: 12,
    GST_18: 18,
    GST_28: 28,
  };
  return map[rate] ?? 18;
}

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnSacCode: z.string().optional(),
  quantity: z.number().int().min(1),
  unit: z.string().default("NOS"),
  unitPrice: z.number().min(0), // In rupees
  discountPercent: z.number().min(0).max(100).default(0),
  gstRate: gstRateSchema.default("GST_18"),
});

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  placeOfSupply: z.string().min(2).max(2),
  isReverseCharge: z.boolean().default(false),
  isExport: z.boolean().default(false),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
});

export const invoiceRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        orgId: ctx.session.orgId,
        ...(input.status ? { status: input.status as never } : {}),
      };

      const [invoices, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          include: { customer: { select: { id: true, name: true, gstin: true } } },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.invoice.count({ where }),
      ]);

      return {
        items: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate.toISOString(),
          customerName: inv.customer.name,
          customerGstin: inv.customer.gstin,
          totalAmount: inv.totalAmount.toString(),
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
        include: {
          customer: { select: { id: true, name: true, gstin: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!invoice) throw new Error("Invoice not found");

      return {
        ...invoice,
        totalAmount: invoice.totalAmount.toString(),
        subtotal: invoice.subtotal.toString(),
        cgstAmount: invoice.cgstAmount.toString(),
        sgstAmount: invoice.sgstAmount.toString(),
        igstAmount: invoice.igstAmount.toString(),
        items: invoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice.toString(),
          taxableValue: item.taxableValue.toString(),
          gstRate: item.gstRate,
          cgstAmount: item.cgstAmount.toString(),
          sgstAmount: item.sgstAmount.toString(),
          igstAmount: item.igstAmount.toString(),
          total: item.total.toString(),
        })),
      };
    }),

  create: invoiceLimitProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      });
      if (!org) throw new Error("Organization not found");

      const fy = getCurrentFinancialYear(new Date(input.invoiceDate));
      const prefix = org.invoicePrefix ?? "INV";
      const seq = org.nextInvoiceSeq;
      const invoiceNumber = generateInvoiceNumber(prefix, fy, seq);

      const supplierStateCode = org.stateCode ?? "27";

      // Calculate GST for each line item
      const calculatedItems = input.items.map((item, idx) => {
        const gstPercent = gstRateEnumToPercent(item.gstRate);
        const calc = calculateLineItemGst({
          unitPricePaise: rupeesToPaise(item.unitPrice),
          quantity: item.quantity,
          discountPercent: item.discountPercent,
          gstRatePercent: gstPercent,
          supplierStateCode,
          placeOfSupply: input.placeOfSupply,
        });

        return {
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: rupeesToPaise(item.unitPrice),
          discountPercent: Math.round(item.discountPercent * 100),
          taxableValue: calc.taxableValuePaise,
          gstRate: item.gstRate,
          cgstRate: calc.cgstRateBps,
          sgstRate: calc.sgstRateBps,
          igstRate: calc.igstRateBps,
          cgstAmount: calc.cgstAmountPaise,
          sgstAmount: calc.sgstAmountPaise,
          igstAmount: calc.igstAmountPaise,
          total: calc.totalPaise,
          sortOrder: idx,
        };
      });

      const gstResults = input.items.map((item) => {
        const gstPercent = gstRateEnumToPercent(item.gstRate);
        return calculateLineItemGst({
          unitPricePaise: rupeesToPaise(item.unitPrice),
          quantity: item.quantity,
          discountPercent: item.discountPercent,
          gstRatePercent: gstPercent,
          supplierStateCode,
          placeOfSupply: input.placeOfSupply,
        });
      });

      const totals = calculateInvoiceTotals(gstResults);

      const invoice = await ctx.db.invoice.create({
        data: {
          orgId: ctx.session.orgId,
          invoiceNumber,
          invoiceDate: new Date(input.invoiceDate),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          customerId: input.customerId,
          placeOfSupply: input.placeOfSupply,
          subtotal: totals.subtotalPaise,
          cgstAmount: totals.cgstTotalPaise,
          sgstAmount: totals.sgstTotalPaise,
          igstAmount: totals.igstTotalPaise,
          totalAmount: totals.grandTotalPaise,
          isReverseCharge: input.isReverseCharge,
          isExport: input.isExport,
          financialYear: fy,
          items: {
            create: calculatedItems,
          },
        },
      });

      // Increment invoice sequence
      await ctx.db.organization.update({
        where: { id: ctx.session.orgId },
        data: { nextInvoiceSeq: seq + 1, currentFy: fy },
      });

      // Audit log
      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "INVOICE_CREATED",
          entityType: "invoice",
          entityId: invoice.id,
          metadata: { invoiceNumber, totalAmount: totals.grandTotalPaise.toString() },
        },
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount.toString(),
        status: invoice.status,
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
      });
      if (!invoice) throw new Error("Invoice not found");

      const updated = await ctx.db.invoice.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "PAID"
            ? { paymentCollectedAt: new Date() }
            : {}),
        },
      });

      const actionMap: Record<string, string> = {
        SENT: "INVOICE_SENT",
        PAID: "INVOICE_PAID",
        CANCELLED: "INVOICE_CANCELLED",
      };

      if (actionMap[input.status]) {
        await ctx.db.auditLog.create({
          data: {
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            action: actionMap[input.status] as never,
            entityType: "invoice",
            entityId: invoice.id,
          },
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId, status: "DRAFT" },
      });
      if (!invoice) throw new Error("Only draft invoices can be deleted");

      await ctx.db.invoice.delete({ where: { id: input.id } });
      return { success: true };
    }),

  sendEmail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
        include: { customer: true, org: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (!invoice.customer.email) throw new Error("Customer has no email address");

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const totalFormatted = formatPaiseToInr(invoice.totalAmount);

      const success = await sendEmail({
        to: invoice.customer.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.org.name}`,
        html: invoiceSentEmailHtml({
          customerName: invoice.customer.name,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: totalFormatted,
          dueDate: invoice.dueDate
            ? invoice.dueDate.toLocaleDateString("en-IN")
            : null,
          orgName: invoice.org.name,
          viewUrl: `${appUrl}/api/invoices/${invoice.id}/pdf`,
        }),
      });

      if (success) {
        await ctx.db.invoice.update({
          where: { id: input.id },
          data: { emailSentAt: new Date() },
        });

        await ctx.db.auditLog.create({
          data: {
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            action: "EMAIL_SENT",
            entityType: "invoice",
            entityId: input.id,
            metadata: { to: invoice.customer.email },
          },
        });
      }

      return { success };
    }),

  sendWhatsApp: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
        include: { customer: true, org: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (!invoice.customer.phone) throw new Error("Customer has no phone number");

      const totalFormatted = formatPaiseToInr(invoice.totalAmount);
      const result = await sendInvoiceWhatsApp({
        phone: invoice.customer.phone,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: totalFormatted,
        orgName: invoice.org.name,
        pdfUrl: invoice.pdfUrl ?? undefined,
        paymentLink: invoice.upiPaymentLink ?? undefined,
      });

      if (result.success) {
        await ctx.db.invoice.update({
          where: { id: input.id },
          data: { whatsappSentAt: new Date() },
        });

        await ctx.db.auditLog.create({
          data: {
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            action: "WHATSAPP_SENT",
            entityType: "invoice",
            entityId: input.id,
            metadata: { to: invoice.customer.phone, messageId: result.messageId },
          },
        });
      }

      return { success: result.success };
    }),
});
