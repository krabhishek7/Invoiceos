import { NextRequest, NextResponse } from "next/server";
import { db } from "@invoiceos/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const paymentLinkId = searchParams.get("razorpay_payment_link_id");
  const paymentId = searchParams.get("razorpay_payment_id");
  const paymentStatus = searchParams.get("razorpay_payment_link_status");

  if (paymentStatus === "paid" && paymentLinkId) {
    const invoice = await db.invoice.findFirst({
      where: { razorpayPaymentLinkId: paymentLinkId },
    });

    if (invoice && invoice.status !== "PAID") {
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          paymentCollectedAt: new Date(),
          razorpayPaymentId: paymentId,
        },
      });

      await db.auditLog.create({
        data: {
          orgId: invoice.orgId,
          action: "PAYMENT_RECEIVED",
          entityType: "invoice",
          entityId: invoice.id,
          metadata: { paymentLinkId, paymentId, source: "callback" },
        },
      });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (paymentStatus === "paid") {
    return NextResponse.redirect(
      `${appUrl}/dashboard?payment=success`
    );
  }

  return NextResponse.redirect(
    `${appUrl}/dashboard?payment=failed`
  );
}
