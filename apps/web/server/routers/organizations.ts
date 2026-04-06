import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { validateGstin } from "@invoiceos/gst-utils";
import { hash } from "bcryptjs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  orgName: z.string().min(1, "Business name is required"),
  gstin: z.string().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  gstin: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  invoicePrefix: z.string().optional(),
  businessType: z.enum(["B2B", "B2C", "MIXED"]).optional(),
});

export const organizationRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    // Check if user already exists
    const existingUser = await ctx.db.user.findFirst({
      where: { email: input.email },
    });
    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    // Validate GSTIN if provided
    if (input.gstin) {
      const validation = validateGstin(input.gstin);
      if (!validation.valid) {
        throw new Error(`Invalid GSTIN: ${validation.errors.join(", ")}`);
      }

      const existingOrg = await ctx.db.organization.findFirst({
        where: { gstin: input.gstin },
      });
      if (existingOrg) {
        throw new Error("A business with this GSTIN is already registered");
      }
    }

    const hashedPassword = await hash(input.password, 12);

    // Create org + owner user in a transaction
    const result = await ctx.db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.orgName,
          gstin: input.gstin || null,
          invoicePrefix: input.orgName
            .replace(/[^A-Za-z]/g, "")
            .substring(0, 3)
            .toUpperCase() || "INV",
        },
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: input.email,
          name: input.name,
          role: "OWNER",
          authProviderId: hashedPassword,
        },
      });

      return { org, user };
    });

    return {
      userId: result.user.id,
      orgId: result.org.id,
      email: result.user.email,
    };
  }),

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.session.orgId },
    });
    if (!org) throw new Error("Organization not found");
    return org;
  }),

  update: protectedProcedure
    .input(updateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER" && ctx.session.role !== "CA") {
        throw new Error("Only owners can update organization settings");
      }

      if (input.gstin) {
        const validation = validateGstin(input.gstin);
        if (!validation.valid) {
          throw new Error(`Invalid GSTIN: ${validation.errors.join(", ")}`);
        }
      }

      const org = await ctx.db.organization.update({
        where: { id: ctx.session.orgId },
        data: input,
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "ORG_UPDATED",
          entityType: "organization",
          entityId: org.id,
          metadata: input,
        },
      });

      return org;
    }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoiceCount, customerCount, org] = await Promise.all([
      ctx.db.invoice.count({
        where: {
          orgId: ctx.session.orgId,
          createdAt: { gte: monthStart },
        },
      }),
      ctx.db.customer.count({
        where: { orgId: ctx.session.orgId },
      }),
      ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      }),
    ]);

    return {
      invoicesThisMonth: invoiceCount,
      totalCustomers: customerCount,
      planTier: org?.planTier ?? "STARTER",
    };
  }),
});
