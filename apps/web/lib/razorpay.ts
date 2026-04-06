import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function createPaymentLink(params: {
  amount: number;
  currency?: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceNumber: string;
  callbackUrl?: string;
}): Promise<{ id: string; short_url: string }> {
  const razorpay = getRazorpay();

  const link = await razorpay.paymentLink.create({
    amount: params.amount,
    currency: params.currency ?? "INR",
    description: params.description,
    customer: {
      name: params.customerName,
      email: params.customerEmail,
      contact: params.customerPhone,
    },
    notify: { sms: true, email: true },
    reminder_enable: true,
    notes: { invoice_number: params.invoiceNumber },
    callback_url: params.callbackUrl,
    callback_method: "get",
  });

  return { id: link.id, short_url: link.short_url };
}

export async function createSubscription(params: {
  planId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
}): Promise<{ id: string; short_url: string }> {
  const razorpay = getRazorpay();

  let customerId = params.customerId;
  if (!customerId) {
    const customer = await razorpay.customers.create({
      name: params.customerName,
      email: params.customerEmail,
    });
    customerId = customer.id;
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: params.planId,
    total_count: 120,
    quantity: 1,
    customer_notify: 1,
    notes: { customer_id: customerId ?? "" },
  } as Parameters<typeof razorpay.subscriptions.create>[0]);

  return { id: subscription.id, short_url: subscription.short_url ?? "" };
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(subscriptionId, false);
}
