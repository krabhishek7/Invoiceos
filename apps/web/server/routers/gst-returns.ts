import { z } from "zod";
import { router, protectedProcedure, featureGateProcedure } from "../trpc";
import {
  buildGstr1,
  paiseToRupees,
  type Gstr1Invoice,
  type Gstr1InvoiceItem,
} from "@invoiceos/gst-utils";

export const gstReturnRouter = router({
  listByPeriod: protectedProcedure
    .input(
      z.object({
        returnType: z.enum(["GSTR1", "GSTR3B", "GSTR2A"]).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        orgId: ctx.session.orgId,
        ...(input.returnType ? { returnType: input.returnType } : {}),
      };

      const [returns, total] = await Promise.all([
        ctx.db.gstReturn.findMany({
          where,
          orderBy: { period: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.gstReturn.count({ where }),
      ]);

      return {
        items: returns.map((r) => ({
          id: r.id,
          returnType: r.returnType,
          period: r.period,
          status: r.status,
          filedAt: r.filedAt?.toISOString() ?? null,
          arn: r.arn,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  generateGstr1: featureGateProcedure("gstFilingAccess")
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      });
      if (!org) throw new Error("Organization not found");
      if (!org.gstin) throw new Error("Organization GSTIN is required to generate GSTR-1");

      const [year, month] = input.period.split("-").map(Number);
      const periodStart = new Date(year!, month! - 1, 1);
      const periodEnd = new Date(year!, month!, 0, 23, 59, 59, 999);

      const invoices = await ctx.db.invoice.findMany({
        where: {
          orgId: ctx.session.orgId,
          invoiceDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: { not: "CANCELLED" },
        },
        include: {
          customer: true,
          items: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (invoices.length === 0) {
        throw new Error("No invoices found for this period");
      }

      const supplierStateCode = org.stateCode ?? "27";

      const gstr1Invoices: Gstr1Invoice[] = invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: formatDateForGstn(inv.invoiceDate),
        placeOfSupply: inv.placeOfSupply,
        isReverseCharge: inv.isReverseCharge,
        invoiceType: inv.isExport ? "SEWP" : "R",
        customerGstin: inv.customer.gstin ?? undefined,
        customerName: inv.customer.name,
        invoiceValue: paiseToRupees(inv.totalAmount),
        items: inv.items.map(
          (item): Gstr1InvoiceItem => ({
            hsnCode: item.hsnSacCode ?? "9997",
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            taxableValue: paiseToRupees(item.taxableValue),
            gstRate: gstEnumToRate(item.gstRate),
            igstAmount: paiseToRupees(item.igstAmount),
            cgstAmount: paiseToRupees(item.cgstAmount),
            sgstAmount: paiseToRupees(item.sgstAmount),
          })
        ),
      }));

      const payload = buildGstr1(
        org.gstin,
        input.period,
        supplierStateCode,
        gstr1Invoices
      );

      const existing = await ctx.db.gstReturn.findFirst({
        where: {
          orgId: ctx.session.orgId,
          returnType: "GSTR1",
          period: input.period,
        },
      });

      let gstReturn;
      if (existing) {
        gstReturn = await ctx.db.gstReturn.update({
          where: { id: existing.id },
          data: {
            jsonPayload: JSON.parse(JSON.stringify(payload)),
            status: "DRAFT",
          },
        });
      } else {
        gstReturn = await ctx.db.gstReturn.create({
          data: {
            orgId: ctx.session.orgId,
            returnType: "GSTR1",
            period: input.period,
            status: "DRAFT",
            jsonPayload: JSON.parse(JSON.stringify(payload)),
          },
        });
      }

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "GSTR1_GENERATED",
          entityType: "gst_return",
          entityId: gstReturn.id,
          metadata: {
            period: input.period,
            invoiceCount: invoices.length,
          },
        },
      });

      return {
        id: gstReturn.id,
        period: gstReturn.period,
        status: gstReturn.status,
        invoiceCount: invoices.length,
        payload,
      };
    }),

  generateGstr3b: featureGateProcedure("gstFilingAccess")
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      });
      if (!org) throw new Error("Organization not found");
      if (!org.gstin) throw new Error("Organization GSTIN is required");

      const [year, month] = input.period.split("-").map(Number);
      const periodStart = new Date(year!, month! - 1, 1);
      const periodEnd = new Date(year!, month!, 0, 23, 59, 59, 999);

      const invoices = await ctx.db.invoice.findMany({
        where: {
          orgId: ctx.session.orgId,
          invoiceDate: { gte: periodStart, lte: periodEnd },
          status: { not: "CANCELLED" },
        },
        include: { items: true, customer: true },
      });

      const supplierStateCode = org.stateCode ?? "27";
      let totalTaxableValue = 0n;
      let totalIgst = 0n;
      let totalCgst = 0n;
      let totalSgst = 0n;

      const rateWise: Record<
        number,
        { taxable: bigint; igst: bigint; cgst: bigint; sgst: bigint }
      > = {};

      for (const inv of invoices) {
        totalTaxableValue += inv.subtotal;
        totalIgst += inv.igstAmount;
        totalCgst += inv.cgstAmount;
        totalSgst += inv.sgstAmount;

        for (const item of inv.items) {
          const rate = gstEnumToRate(item.gstRate);
          if (!rateWise[rate]) {
            rateWise[rate] = { taxable: 0n, igst: 0n, cgst: 0n, sgst: 0n };
          }
          rateWise[rate].taxable += item.taxableValue;
          rateWise[rate].igst += item.igstAmount;
          rateWise[rate].cgst += item.cgstAmount;
          rateWise[rate].sgst += item.sgstAmount;
        }
      }

      const gstr3bPayload = {
        gstin: org.gstin,
        ret_period: input.period.split("-").reverse().join(""),
        outward_supplies: {
          taxable_value: paiseToRupees(totalTaxableValue),
          igst: paiseToRupees(totalIgst),
          cgst: paiseToRupees(totalCgst),
          sgst: paiseToRupees(totalSgst),
          total_tax:
            paiseToRupees(totalIgst) +
            paiseToRupees(totalCgst) +
            paiseToRupees(totalSgst),
        },
        rate_wise_summary: Object.entries(rateWise).map(([rate, vals]) => ({
          rate: Number(rate),
          taxable_value: paiseToRupees(vals.taxable),
          igst: paiseToRupees(vals.igst),
          cgst: paiseToRupees(vals.cgst),
          sgst: paiseToRupees(vals.sgst),
        })),
        net_tax_payable: {
          igst: paiseToRupees(totalIgst),
          cgst: paiseToRupees(totalCgst),
          sgst: paiseToRupees(totalSgst),
          total:
            paiseToRupees(totalIgst) +
            paiseToRupees(totalCgst) +
            paiseToRupees(totalSgst),
        },
        invoice_count: invoices.length,
      };

      const existing = await ctx.db.gstReturn.findFirst({
        where: {
          orgId: ctx.session.orgId,
          returnType: "GSTR3B",
          period: input.period,
        },
      });

      let gstReturn;
      if (existing) {
        gstReturn = await ctx.db.gstReturn.update({
          where: { id: existing.id },
          data: {
            jsonPayload: JSON.parse(JSON.stringify(gstr3bPayload)),
            status: "DRAFT",
          },
        });
      } else {
        gstReturn = await ctx.db.gstReturn.create({
          data: {
            orgId: ctx.session.orgId,
            returnType: "GSTR3B",
            period: input.period,
            status: "DRAFT",
            jsonPayload: JSON.parse(JSON.stringify(gstr3bPayload)),
          },
        });
      }

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "GSTR3B_GENERATED",
          entityType: "gst_return",
          entityId: gstReturn.id,
          metadata: { period: input.period, invoiceCount: invoices.length },
        },
      });

      return {
        id: gstReturn.id,
        period: gstReturn.period,
        status: gstReturn.status,
        payload: gstr3bPayload,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const gstReturn = await ctx.db.gstReturn.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
      });
      if (!gstReturn) throw new Error("GST return not found");

      return {
        id: gstReturn.id,
        returnType: gstReturn.returnType,
        period: gstReturn.period,
        status: gstReturn.status,
        filedAt: gstReturn.filedAt?.toISOString() ?? null,
        arn: gstReturn.arn,
        jsonPayload: gstReturn.jsonPayload,
        errorLog: gstReturn.errorLog,
        createdAt: gstReturn.createdAt.toISOString(),
      };
    }),
});

function formatDateForGstn(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

function gstEnumToRate(
  gstRate: string
): 0 | 5 | 12 | 18 | 28 {
  const map: Record<string, 0 | 5 | 12 | 18 | 28> = {
    GST_0: 0,
    GST_5: 5,
    GST_12: 12,
    GST_18: 18,
    GST_28: 28,
  };
  return map[gstRate] ?? 18;
}
