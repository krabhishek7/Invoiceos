import { type Job } from "bullmq";
import { createWorker, createQueue, QUEUE_NAMES } from "./queue";
import { db } from "@invoiceos/db";
import { sendEmail, filingReminderEmailHtml } from "@/lib/email";
import { sendFilingReminderWhatsApp } from "@/lib/whatsapp";

interface FilingReminderJobData {
  orgId: string;
}

export function startFilingReminderWorker() {
  return createWorker<FilingReminderJobData>(
    QUEUE_NAMES.FILING_REMINDER,
    async (job: Job<FilingReminderJobData>) => {
      const org = await db.organization.findUnique({
        where: { id: job.data.orgId },
        include: {
          users: { where: { role: "OWNER" }, take: 1 },
        },
      });

      if (!org) return;

      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      const filings = [
        { type: "GSTR-1", dueDay: 11 },
        { type: "GSTR-3B", dueDay: 20 },
      ];

      for (const filing of filings) {
        const dueDate = new Date(now.getFullYear(), now.getMonth(), filing.dueDay);
        const daysLeft = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft > 0 && daysLeft <= 5) {
          const existingReturn = await db.gstReturn.findFirst({
            where: {
              orgId: org.id,
              returnType: filing.type === "GSTR-1" ? "GSTR1" : "GSTR3B",
              period: currentPeriod,
              status: "FILED",
            },
          });

          if (existingReturn) continue;

          const owner = org.users[0];
          if (owner?.email) {
            await sendEmail({
              to: owner.email,
              subject: `${filing.type} filing reminder — ${daysLeft} days left`,
              html: filingReminderEmailHtml({
                orgName: org.name,
                returnType: filing.type,
                period: currentPeriod,
                dueDate: dueDate.toLocaleDateString("en-IN"),
                daysLeft,
              }),
            });
          }

          if (org.phone) {
            await sendFilingReminderWhatsApp({
              phone: org.phone,
              orgName: org.name,
              returnType: filing.type,
              period: currentPeriod,
              dueDate: dueDate.toLocaleDateString("en-IN"),
              daysLeft,
            });
          }
        }
      }
    },
    1
  );
}

export async function scheduleFilingReminders() {
  const queue = createQueue(QUEUE_NAMES.FILING_REMINDER);

  const orgs = await db.organization.findMany({
    where: {
      gstin: { not: null },
      planStatus: { in: ["ACTIVE", "TRIALING"] },
    },
    select: { id: true },
  });

  for (const org of orgs) {
    await queue.add(
      `reminder-${org.id}`,
      { orgId: org.id },
      { removeOnComplete: true, removeOnFail: true }
    );
  }
}
