import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { PLAN_LIMITS, PLAN_PRICES } from "@invoiceos/types";
import {
  createSubscription,
  cancelSubscription,
  createPaymentLink,
} from "@/lib/razorpay";
import { formatPaiseToInr, paiseToRupees } from "@invoiceos/gst-utils";

export const billingRouter = router({
  getPlans: protectedProcedure.query(() => {
    return Object.entries(PLAN_PRICES).map(([tier, info]) => ({
      tier,
      name: info.name,
      description: info.description,
      monthlyPrice: info.monthly,
      monthlyPriceFormatted:
        info.monthly === 0 ? "Free" : `₹${(info.monthly / 100).toLocaleString("en-IN")}/mo`,
      limits: PLAN_LIMITS[tier]!,
    }));
  }),

  getCurrentPlan: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.session.orgId },
      select: {
        planTier: true,
        planStatus: true,
        razorpaySubscriptionId: true,
        razorpayCustomerId: true,
      },
    });
    if (!org) throw new Error("Organization not found");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const invoiceCount = await ctx.db.invoice.count({
      where: { orgId: ctx.session.orgId, createdAt: { gte: monthStart } },
    });

    const limits = PLAN_LIMITS[org.planTier];

    return {
      tier: org.planTier,
      status: org.planStatus,
      hasSubscription: !!org.razorpaySubscriptionId,
      invoicesUsed: invoiceCount,
      invoiceLimit: limits?.maxInvoicesPerMonth ?? 50,
      usagePercent: limits
        ? Math.round((invoiceCount / limits.maxInvoicesPerMonth) * 100)
        : 0,
    };
  }),

  createSubscription: protectedProcedure
    .input(
      z.object({
        planTier: z.enum(["GROWTH", "PRO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER") {
        throw new Error("Only owners can manage subscriptions");
      }

      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      });
      if (!org) throw new Error("Organization not found");

      const planIdEnv =
        input.planTier === "GROWTH"
          ? process.env.RAZORPAY_PLAN_GROWTH
          : process.env.RAZORPAY_PLAN_PRO;

      if (!planIdEnv) {
        throw new Error(
          `Razorpay plan ID not configured for ${input.planTier}`
        );
      }

      const user = await ctx.db.user.findFirst({
        where: { id: ctx.session.userId },
      });

      const result = await createSubscription({
        planId: planIdEnv,
        customerId: org.razorpayCustomerId ?? undefined,
        customerEmail: user?.email ?? ctx.session.email,
        customerName: org.name,
      });

      await ctx.db.organization.update({
        where: { id: ctx.session.orgId },
        data: { razorpaySubscriptionId: result.id },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "SUBSCRIPTION_CREATED",
          entityType: "organization",
          entityId: ctx.session.orgId,
          metadata: { planTier: input.planTier, subscriptionId: result.id },
        },
      });

      return { subscriptionUrl: result.short_url };
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.role !== "OWNER") {
      throw new Error("Only owners can manage subscriptions");
    }

    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.session.orgId },
    });
    if (!org?.razorpaySubscriptionId) {
      throw new Error("No active subscription found");
    }

    await cancelSubscription(org.razorpaySubscriptionId);

    await ctx.db.organization.update({
      where: { id: ctx.session.orgId },
      data: {
        planTier: "STARTER",
        planStatus: "CANCELLED",
        razorpaySubscriptionId: null,
      },
    });

    await ctx.db.auditLog.create({
      data: {
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        action: "SUBSCRIPTION_CANCELLED",
        entityType: "organization",
        entityId: ctx.session.orgId,
      },
    });

    return { success: true };
  }),

  createPaymentLink: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.invoiceId, orgId: ctx.session.orgId },
        include: { customer: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "PAID") throw new Error("Invoice already paid");

      const amountInPaise = Number(invoice.totalAmount);
      const result = await createPaymentLink({
        amount: amountInPaise,
        description: `Invoice ${invoice.invoiceNumber}`,
        customerName: invoice.customer.name,
        customerEmail: invoice.customer.email ?? undefined,
        customerPhone: invoice.customer.phone ?? undefined,
        invoiceNumber: invoice.invoiceNumber,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/payments/callback`,
      });

      await ctx.db.invoice.update({
        where: { id: input.invoiceId },
        data: {
          upiPaymentLink: result.short_url,
          razorpayPaymentLinkId: result.id,
        },
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "PAYMENT_LINK_CREATED",
          entityType: "invoice",
          entityId: input.invoiceId,
          metadata: { paymentLinkId: result.id, url: result.short_url },
        },
      });

      return { paymentUrl: result.short_url };
    }),
});
