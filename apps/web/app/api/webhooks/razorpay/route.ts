import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { db } from "@invoiceos/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyRazorpayWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event as string;

  switch (eventType) {
    case "subscription.activated":
    case "subscription.charged": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription?.id) break;

      const org = await db.organization.findFirst({
        where: { razorpaySubscriptionId: subscription.id },
      });
      if (!org) break;

      const planTier = getPlanTierFromPlanId(subscription.plan_id);

      await db.organization.update({
        where: { id: org.id },
        data: {
          planTier,
          planStatus: "ACTIVE",
        },
      });

      await db.auditLog.create({
        data: {
          orgId: org.id,
          action: "SUBSCRIPTION_CREATED",
          entityType: "organization",
          entityId: org.id,
          metadata: {
            event: eventType,
            subscriptionId: subscription.id,
            planTier,
          },
        },
      });
      break;
    }

    case "subscription.halted":
    case "subscription.cancelled": {
      const subscription = event.payload?.subscription?.entity;
      if (!subscription?.id) break;

      const org = await db.organization.findFirst({
        where: { razorpaySubscriptionId: subscription.id },
      });
      if (!org) break;

      await db.organization.update({
        where: { id: org.id },
        data: {
          planStatus: eventType === "subscription.halted" ? "PAST_DUE" : "CANCELLED",
          ...(eventType === "subscription.cancelled"
            ? { planTier: "STARTER", razorpaySubscriptionId: null }
            : {}),
        },
      });

      await db.auditLog.create({
        data: {
          orgId: org.id,
          action: "SUBSCRIPTION_CANCELLED",
          entityType: "organization",
          entityId: org.id,
          metadata: { event: eventType },
        },
      });
      break;
    }

    case "payment_link.paid": {
      const payment = event.payload?.payment_link?.entity;
      const invoiceNumber = payment?.notes?.invoice_number;
      if (!invoiceNumber) break;

      const invoice = await db.invoice.findFirst({
        where: { invoiceNumber },
      });
      if (!invoice || invoice.status === "PAID") break;

      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          paymentCollectedAt: new Date(),
          razorpayPaymentId: event.payload?.payment?.entity?.id,
        },
      });

      await db.auditLog.create({
        data: {
          orgId: invoice.orgId,
          action: "PAYMENT_RECEIVED",
          entityType: "invoice",
          entityId: invoice.id,
          metadata: {
            paymentId: event.payload?.payment?.entity?.id,
            amount: payment?.amount,
          },
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

function getPlanTierFromPlanId(
  planId: string
): "STARTER" | "GROWTH" | "PRO" {
  if (planId === process.env.RAZORPAY_PLAN_PRO) return "PRO";
  if (planId === process.env.RAZORPAY_PLAN_GROWTH) return "GROWTH";
  return "STARTER";
}
