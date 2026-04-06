import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { validateGstin, extractStateCodeFromGstin } from "@invoiceos/gst-utils";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  customerType: z.enum(["REGISTERED", "UNREGISTERED", "CONSUMER", "EXPORT"]),
  billingLine1: z.string().optional(),
  billingLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingStateCode: z.string().optional(),
  billingPincode: z.string().optional(),
  shippingLine1: z.string().optional(),
  shippingLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingStateCode: z.string().optional(),
  shippingPincode: z.string().optional(),
  placeOfSupply: z.string().optional(),
});

export const customerRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(50),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        orgId: ctx.session.orgId,
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" as const } },
                { gstin: { contains: input.search, mode: "insensitive" as const } },
                { email: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [customers, total] = await Promise.all([
        ctx.db.customer.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.customer.count({ where }),
      ]);

      return {
        items: customers,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
      });
      if (!customer) throw new Error("Customer not found");
      return customer;
    }),

  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate GSTIN if provided
      if (input.gstin) {
        const validation = validateGstin(input.gstin);
        if (!validation.valid) {
          throw new Error(`Invalid GSTIN: ${validation.errors.join(", ")}`);
        }
        // Auto-fill state code from GSTIN if not provided
        if (!input.billingStateCode) {
          input.billingStateCode = extractStateCodeFromGstin(input.gstin) ?? undefined;
        }
        if (!input.placeOfSupply) {
          input.placeOfSupply = extractStateCodeFromGstin(input.gstin) ?? undefined;
        }
      }

      const customer = await ctx.db.customer.create({
        data: {
          orgId: ctx.session.orgId,
          ...input,
          email: input.email || null,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "CUSTOMER_CREATED",
          entityType: "customer",
          entityId: customer.id,
        },
      });

      return customer;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(createCustomerSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.customer.findFirst({
        where: { id, orgId: ctx.session.orgId },
      });
      if (!existing) throw new Error("Customer not found");

      if (data.gstin) {
        const validation = validateGstin(data.gstin);
        if (!validation.valid) {
          throw new Error(`Invalid GSTIN: ${validation.errors.join(", ")}`);
        }
      }

      const customer = await ctx.db.customer.update({
        where: { id },
        data,
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "CUSTOMER_UPDATED",
          entityType: "customer",
          entityId: customer.id,
        },
      });

      return customer;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.customer.findFirst({
        where: { id: input.id, orgId: ctx.session.orgId },
      });
      if (!existing) throw new Error("Customer not found");

      // Check if customer has invoices
      const invoiceCount = await ctx.db.invoice.count({
        where: { customerId: input.id },
      });
      if (invoiceCount > 0) {
        throw new Error(
          `Cannot delete customer with ${invoiceCount} existing invoices`
        );
      }

      await ctx.db.customer.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
