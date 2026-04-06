import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const useTls = redisUrl.startsWith("rediss://");
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: useTls ? { rejectUnauthorized: false } : undefined,
    });
  }
  return connection;
}

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: getConnection() });
}

export function createWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 5
): Worker<T> {
  return new Worker<T>(name, processor, {
    connection: getConnection(),
    concurrency,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
}

export const QUEUE_NAMES = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  GST_FILING: "gst-filing",
  RECONCILIATION: "reconciliation",
  PDF_GENERATION: "pdf-generation",
  FILING_REMINDER: "filing-reminder",
} as const;
