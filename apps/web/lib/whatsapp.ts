const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getConfig() {
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const config = getConfig();
  if (!config) {
    console.warn("[whatsapp] Credentials not configured, skipping");
    return { success: false, error: "WhatsApp not configured" };
  }

  const normalizedPhone = to.replace(/\D/g, "");

  const response = await fetch(
    `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: err };
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.messages?.[0]?.id,
  };
}

export async function sendInvoiceWhatsApp(params: {
  phone: string;
  invoiceNumber: string;
  totalAmount: string;
  orgName: string;
  pdfUrl?: string;
  paymentLink?: string;
}): Promise<WhatsAppSendResult> {
  let message = `*Invoice ${params.invoiceNumber}*\n\nDear Customer,\n\n`;
  message += `Please find your invoice from *${params.orgName}* for *${params.totalAmount}*.\n\n`;

  if (params.paymentLink) {
    message += `Pay now: ${params.paymentLink}\n\n`;
  }
  if (params.pdfUrl) {
    message += `View PDF: ${params.pdfUrl}\n\n`;
  }

  message += `Thank you for your business!`;

  return sendWhatsAppMessage(params.phone, message);
}

export async function sendFilingReminderWhatsApp(params: {
  phone: string;
  orgName: string;
  returnType: string;
  period: string;
  dueDate: string;
  daysLeft: number;
}): Promise<WhatsAppSendResult> {
  const message =
    `*${params.returnType} Filing Reminder*\n\n` +
    `Dear ${params.orgName},\n\n` +
    `Your ${params.returnType} for ${params.period} is due on ${params.dueDate}.\n` +
    `${params.daysLeft} days remaining.\n\n` +
    `Log in to InvoiceOS to file your return.`;

  return sendWhatsAppMessage(params.phone, message);
}

export function generateWhatsAppShareLink(
  phone: string,
  invoiceNumber: string,
  totalAmount: string,
  pdfUrl?: string
): string {
  const text = encodeURIComponent(
    `Invoice ${invoiceNumber} - ${totalAmount}${pdfUrl ? `\n\nView: ${pdfUrl}` : ""}`
  );
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${text}`;
}
