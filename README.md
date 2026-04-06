# InvoiceOS — GST-Compliant Invoicing SaaS

Full-stack multi-tenant invoicing application built for Indian businesses with complete GST compliance, e-invoicing, GSTR filing, Tally integration, and subscription billing.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC (end-to-end type safety)
- **Auth**: NextAuth.js (credentials + JWT)
- **UI**: Tailwind CSS + shadcn/ui + dark mode
- **Monorepo**: Turborepo
- **Jobs**: BullMQ + Redis
- **Payments**: Razorpay (subscriptions + payment links)
- **Email**: Resend
- **Notifications**: WhatsApp Business API

## Project Structure

```
saas/
├── apps/
│   └── web/                   # Next.js application
│       ├── app/               # App Router pages
│       ├── components/        # React components
│       ├── lib/               # Utilities & clients
│       └── server/routers/    # tRPC API routers
├── packages/
│   ├── db/                    # Prisma schema & client
│   ├── gst-utils/             # GST calculation library (53 tests)
│   ├── types/                 # Shared TypeScript types
│   ├── eslint-config/         # ESLint config
│   └── typescript-config/     # Shared tsconfig
└── .github/workflows/ci.yml  # CI pipeline
```

## Quick Start (Local Development)

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or a cloud instance)
- Redis running locally (optional, needed for background jobs)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd saas
npm install
```

### 2. Set up environment variables

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in at minimum:

| Variable | Required | Where to get it |
|---|---|---|
| `DATABASE_URL` | **Yes** | Your PostgreSQL connection string |
| `AUTH_SECRET` | **Yes** | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (dev) | `http://localhost:3000` |

All other variables (Razorpay, Resend, WhatsApp, IRP, GSP, Sentry) are optional for local development — features that depend on them will gracefully degrade.

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations to your database
npm run db:migrate:deploy

# Or for development (creates migration + applies):
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account and create your first organization.

## Deploy to Production (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Set up a production database

Use any managed PostgreSQL provider:
- **Neon** (neon.tech) — generous free tier, serverless
- **Supabase** (supabase.com) — free tier, includes auth/storage extras
- **Railway** (railway.app) — simple, pay-as-you-go

Copy the connection string — you'll need it for the `DATABASE_URL` env var.

### 3. Run migrations against production

```bash
DATABASE_URL="your-production-connection-string" npm run db:migrate:deploy
```

### 4. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `apps/web`
4. Add environment variables in the Vercel dashboard:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Production PostgreSQL URL |
| `AUTH_SECRET` | **Yes** | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Your Vercel domain (e.g. `https://invoiceos.vercel.app`) |
| `RAZORPAY_KEY_ID` | For payments | Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Set in Razorpay webhook config |
| `RESEND_API_KEY` | For emails | resend.com |
| `REDIS_URL` | For jobs | Upstash / Railway Redis |

5. Click **Deploy**

### 5. Configure webhooks

After deploying, set up the Razorpay webhook:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Webhook URL: `https://your-domain.com/api/webhooks/razorpay`
3. Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment_link.paid`
4. Copy the webhook secret → add as `RAZORPAY_WEBHOOK_SECRET` env var in Vercel

## External Services Setup

### Razorpay (Payments & Subscriptions)

1. Sign up at [razorpay.com](https://razorpay.com)
2. Get API keys from Dashboard → Settings → API Keys
3. Create subscription plans in Dashboard → Subscriptions → Plans
4. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_GROWTH`, `RAZORPAY_PLAN_PRO`

### Resend (Transactional Email)

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Get API key → set `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified sender

### Redis (Background Jobs)

1. **Upstash** (upstash.com) — free tier, serverless, recommended
2. Get the Redis URL → set `REDIS_URL`

### WhatsApp Business API (Optional)

1. Create a Meta Business account
2. Set up WhatsApp Business API via Meta for Developers
3. Set `WHATSAPP_BUSINESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`

### IRP / GSP (e-Invoice & GSTN Filing) (Optional)

1. Register at [einvoice1.gst.gov.in](https://einvoice1.gst.gov.in) for e-Invoice access
2. Get GSP credentials from your GST Suvidha Provider
3. Set `IRP_CLIENT_ID`, `IRP_CLIENT_SECRET`, `GSP_USERNAME`, `GSP_PASSWORD`, etc.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build (all packages) |
| `npm run lint` | Lint all packages |
| `npm run check-types` | TypeScript type checking |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create and apply migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Features

- **Invoicing**: Create, send, track GST-compliant invoices with HSN/SAC codes
- **e-Invoicing**: IRN generation via IRP with QR codes
- **GST Filing**: GSTR-1, GSTR-3B generation and submission via GSP
- **GSTR-2A Reconciliation**: Match purchase invoices against GSTN data
- **Credit/Debit Notes**: Issue against existing invoices
- **e-Way Bills**: Generate for goods transport
- **Tally Integration**: Import/export via XML
- **Multi-tenant**: Organization-level data isolation
- **Team Management**: Invite members with role-based access (Owner, Accountant, Staff, CA)
- **Subscription Billing**: Free/Growth/Pro plans via Razorpay
- **Email Notifications**: Invoice delivery via Resend
- **WhatsApp Notifications**: Invoice & filing reminders
- **UPI Payment Links**: Collect payments via Razorpay payment links
- **PDF Generation**: Professional invoice PDFs
- **Dark Mode**: Full theme support
- **Background Jobs**: Email & reminder workers via BullMQ

## License

Private — All rights reserved.
