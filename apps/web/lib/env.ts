function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill in the values.`
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  AUTH_SECRET: requireEnv("AUTH_SECRET"),

  NEXTAUTH_URL: optionalEnv("NEXTAUTH_URL", "http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: optionalEnv(
    "NEXT_PUBLIC_APP_URL",
    "http://localhost:3000"
  ),

  REDIS_URL: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  RESEND_FROM_EMAIL: optionalEnv(
    "RESEND_FROM_EMAIL",
    "InvoiceOS <noreply@invoiceos.in>"
  ),

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  RAZORPAY_PLAN_GROWTH: process.env.RAZORPAY_PLAN_GROWTH ?? "",
  RAZORPAY_PLAN_PRO: process.env.RAZORPAY_PLAN_PRO ?? "",

  IRP_CLIENT_ID: process.env.IRP_CLIENT_ID ?? "",
  IRP_CLIENT_SECRET: process.env.IRP_CLIENT_SECRET ?? "",
  IRP_BASE_URL: optionalEnv(
    "IRP_BASE_URL",
    "https://einv-apisandbox.nic.in"
  ),

  GSP_USERNAME: process.env.GSP_USERNAME ?? "",
  GSP_PASSWORD: process.env.GSP_PASSWORD ?? "",
  GSP_BASE_URL: process.env.GSP_BASE_URL ?? "",

  WHATSAPP_BUSINESS_TOKEN: process.env.WHATSAPP_BUSINESS_TOKEN ?? "",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",

  SENTRY_DSN: process.env.SENTRY_DSN ?? "",
} as const;
