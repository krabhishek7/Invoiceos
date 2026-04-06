import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "InvoiceOS <noreply@invoiceos.in>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email send");
    return false;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    return false;
  }

  return true;
}

export function invoiceSentEmailHtml(params: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string | null;
  orgName: string;
  viewUrl: string;
}): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2563eb;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">${params.orgName}</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
        <p>Dear ${params.customerName},</p>
        <p>Please find attached invoice <strong>${params.invoiceNumber}</strong> for <strong>${params.totalAmount}</strong>.</p>
        ${params.dueDate ? `<p>Payment is due by <strong>${params.dueDate}</strong>.</p>` : ""}
        <a href="${params.viewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
          View Invoice
        </a>
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">
          Thank you for your business.<br/>— ${params.orgName}
        </p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
        Sent via InvoiceOS
      </p>
    </div>
  `;
}

export function paymentReceivedEmailHtml(params: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: string;
  orgName: string;
}): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Payment Received</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
        <p>Dear ${params.customerName},</p>
        <p>We have received your payment of <strong>${params.totalAmount}</strong> for invoice <strong>${params.invoiceNumber}</strong>.</p>
        <p>Thank you for your prompt payment.</p>
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">— ${params.orgName}</p>
      </div>
    </div>
  `;
}

export function filingReminderEmailHtml(params: {
  orgName: string;
  returnType: string;
  period: string;
  dueDate: string;
  daysLeft: number;
}): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#f59e0b;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Filing Reminder</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
        <p>Dear ${params.orgName},</p>
        <p>Your <strong>${params.returnType}</strong> for <strong>${params.period}</strong> is due on <strong>${params.dueDate}</strong>.</p>
        <p style="color:#dc2626;font-weight:600;">${params.daysLeft} days remaining.</p>
        <p>Please log in to InvoiceOS to generate and file your return.</p>
      </div>
    </div>
  `;
}
