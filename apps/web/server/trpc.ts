import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@invoiceos/db";
import { auth } from "@/lib/auth";
import { PLAN_LIMITS } from "@invoiceos/types";

export interface Context {
  db: typeof db;
  session: {
    userId: string;
    orgId: string;
    role: string;
    email: string;
  } | null;
}

export async function createContext(): Promise<Context> {
  const session = await auth();

  if (!session?.user) {
    return { db, session: null };
  }

  const s = session as unknown as Record<string, unknown>;

  return {
    db,
    session: {
      userId: s.user
        ? (s.user as Record<string, unknown>).id as string
        : "",
      orgId: (s.orgId as string) ?? "",
      role: (s.role as string) ?? "",
      email: session.user?.email ?? "",
    },
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Middleware that checks if the org has not exceeded its plan's invoice limit.
 * Use on invoice creation mutations.
 */
export const invoiceLimitProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [org, invoiceCount] = await Promise.all([
      ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
        select: { planTier: true, planStatus: true },
      }),
      ctx.db.invoice.count({
        where: {
          orgId: ctx.session.orgId,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }

    const limits = PLAN_LIMITS[org.planTier];
    if (limits && invoiceCount >= limits.maxInvoicesPerMonth) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Invoice limit reached. Your ${org.planTier} plan allows ${limits.maxInvoicesPerMonth} invoices per month. Please upgrade your plan.`,
      });
    }

    return next({ ctx });
  }
);

type BooleanPlanFeatures =
  | "eInvoiceAccess"
  | "gstFilingAccess"
  | "reconciliationAccess"
  | "tallyIntegration"
  | "whatsappNotifications"
  | "prioritySupport";

export function featureGateProcedure(feature: BooleanPlanFeatures) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.session.orgId },
      select: { planTier: true },
    });

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }

    const limits = PLAN_LIMITS[org.planTier];
    if (limits && !limits[feature]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This feature requires an upgrade from your ${org.planTier} plan.`,
      });
    }

    return next({ ctx });
  });
}
