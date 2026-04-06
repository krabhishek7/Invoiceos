import { type Job } from "bullmq";
import { createWorker, QUEUE_NAMES } from "./queue";
import { sendEmail } from "@/lib/email";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

export function startEmailWorker() {
  return createWorker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { to, subject, html, attachments } = job.data;

      const success = await sendEmail({
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
        })),
      });

      if (!success) {
        throw new Error(`Failed to send email to ${to}`);
      }
    },
    3
  );
}
