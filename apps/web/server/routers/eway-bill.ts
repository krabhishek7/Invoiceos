import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { paiseToRupees } from "@invoiceos/gst-utils";

export const ewayBillRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        fromPlace: z.string().min(1),
        toPlace: z.string().min(1),
        transportMode: z.enum(["ROAD", "RAIL", "AIR", "SHIP"]),
        vehicleNumber: z.string().optional(),
        transporterId: z.string().optional(),
        distance: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        include: { org: true, customer: true },
      });
      if (!invoice) throw new Error("Invoice not found");

      const totalInRupees = paiseToRupees(invoice.totalAmount);
      if (totalInRupees < 50000) {
        throw new Error("e-Way Bill is required only for goods worth ₹50,000 or more");
      }

      const existing = await ctx.db.ewayBill.findUnique({
        where: { invoiceId: input.invoiceId },
      });
      if (existing) throw new Error("e-Way Bill already exists for this invoice");

      const ewayBill = await ctx.db.ewayBill.create({
        data: {
          orgId: ctx.session.orgId,
          invoiceId: input.invoiceId,
          fromPlace: input.fromPlace,
          toPlace: input.toPlace,
          transportMode: input.transportMode,
          vehicleNumber: input.vehicleNumber,
          transporterId: input.transporterId,
          distance: input.distance,
          status: "DRAFT",
        },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "EWAY_BILL_GENERATED",
          entityType: "eway_bill",
          entityId: ewayBill.id,
          metadata: {
            invoiceId: input.invoiceId,
            distance: input.distance,
            transportMode: input.transportMode,
          },
        },
      });

      return {
        id: ewayBill.id,
        status: "DRAFT",
      };
    }),

  getByInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const ewayBill = await ctx.db.ewayBill.findUnique({
        where: { invoiceId: input.invoiceId },
      });
      return ewayBill;
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        ctx.db.ewayBill.findMany({
          where: { orgId: ctx.session.orgId },
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                totalAmount: true,
                customer: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.ewayBill.count({ where: { orgId: ctx.session.orgId } }),
      ]);

      return {
        items: items.map((eb) => ({
          id: eb.id,
          invoiceNumber: eb.invoice.invoiceNumber,
          customerName: eb.invoice.customer.name,
          invoiceAmount: eb.invoice.totalAmount.toString(),
          ewayBillNumber: eb.ewayBillNumber,
          fromPlace: eb.fromPlace,
          toPlace: eb.toPlace,
          transportMode: eb.transportMode,
          status: eb.status,
          createdAt: eb.createdAt.toISOString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ewayBill = await ctx.db.ewayBill.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
      });
      if (!ewayBill) throw new Error("e-Way Bill not found");
      if (ewayBill.status === "CANCELLED") throw new Error("Already cancelled");

      await ctx.db.ewayBill.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      return { success: true };
    }),
});
