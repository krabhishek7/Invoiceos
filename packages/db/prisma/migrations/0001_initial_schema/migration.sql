-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('B2B', 'B2C', 'MIXED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'STAFF', 'CA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED', 'IRN_GENERATED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "GstRate" AS ENUM ('GST_0', 'GST_5', 'GST_12', 'GST_18', 'GST_28');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('REGISTERED', 'UNREGISTERED', 'CONSUMER', 'EXPORT');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('GSTR1', 'GSTR3B', 'GSTR2A');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FILED', 'ERROR');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CreditNoteReason" AS ENUM ('SALES_RETURN', 'POST_SALE_DISCOUNT', 'DEFICIENCY_IN_SERVICE', 'CORRECTION_IN_INVOICE', 'CHANGE_IN_POS', 'FINALIZATION_OF_PROVISIONAL_ASSESSMENT', 'OTHERS');

-- CreateEnum
CREATE TYPE "ReconciliationMatchStatus" AS ENUM ('MATCHED', 'IN_2A_NOT_IN_BOOKS', 'IN_BOOKS_NOT_IN_2A', 'AMOUNT_MISMATCH', 'GSTIN_MISMATCH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_SENT', 'INVOICE_PAID', 'INVOICE_CANCELLED', 'IRN_GENERATED', 'IRN_CANCELLED', 'GSTR1_GENERATED', 'GSTR1_FILED', 'GSTR3B_GENERATED', 'GSTR3B_FILED', 'GSTR2A_FETCHED', 'RECONCILIATION_RUN', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'ORG_UPDATED', 'USER_INVITED', 'USER_REMOVED', 'PAYMENT_RECEIVED', 'PAYMENT_LINK_CREATED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'SUBSCRIPTION_UPGRADED', 'CREDIT_NOTE_CREATED', 'CREDIT_NOTE_CANCELLED', 'EWAY_BILL_GENERATED', 'TALLY_IMPORT', 'TALLY_EXPORT', 'EMAIL_SENT', 'WHATSAPP_SENT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "businessType" "BusinessType" NOT NULL DEFAULT 'MIXED',
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "planStatus" "PlanStatus" NOT NULL DEFAULT 'TRIALING',
    "annualTurnover" BIGINT,
    "eInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "invoicePrefix" TEXT,
    "currentFy" TEXT,
    "nextInvoiceSeq" INTEGER NOT NULL DEFAULT 1,
    "razorpayCustomerId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "razorpayPlanId" TEXT,
    "gstnAuthToken" TEXT,
    "gstnTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "authProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'CONSUMER',
    "billingLine1" TEXT,
    "billingLine2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "billingPincode" TEXT,
    "shippingLine1" TEXT,
    "shippingLine2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingStateCode" TEXT,
    "shippingPincode" TEXT,
    "placeOfSupply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "placeOfSupply" TEXT NOT NULL,
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "cgstAmount" BIGINT NOT NULL DEFAULT 0,
    "sgstAmount" BIGINT NOT NULL DEFAULT 0,
    "igstAmount" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "irn" TEXT,
    "ackNumber" TEXT,
    "ackDate" TIMESTAMP(3),
    "qrCodeData" TEXT,
    "irnError" JSONB,
    "upiPaymentLink" TEXT,
    "razorpayPaymentLinkId" TEXT,
    "paymentCollectedAt" TIMESTAMP(3),
    "razorpayPaymentId" TEXT,
    "pdfUrl" TEXT,
    "jsonPayload" JSONB,
    "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "isExport" BOOLEAN NOT NULL DEFAULT false,
    "financialYear" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "whatsappSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSacCode" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'NOS',
    "unitPrice" BIGINT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "taxableValue" BIGINT NOT NULL DEFAULT 0,
    "gstRate" "GstRate" NOT NULL DEFAULT 'GST_18',
    "cgstRate" INTEGER NOT NULL DEFAULT 0,
    "sgstRate" INTEGER NOT NULL DEFAULT 0,
    "igstRate" INTEGER NOT NULL DEFAULT 0,
    "cgstAmount" BIGINT NOT NULL DEFAULT 0,
    "sgstAmount" BIGINT NOT NULL DEFAULT 0,
    "igstAmount" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "creditNoteDate" TIMESTAMP(3) NOT NULL,
    "reason" "CreditNoteReason" NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "cgstAmount" BIGINT NOT NULL DEFAULT 0,
    "sgstAmount" BIGINT NOT NULL DEFAULT 0,
    "igstAmount" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "irn" TEXT,
    "ackNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_items" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSacCode" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'NOS',
    "unitPrice" BIGINT NOT NULL,
    "taxableValue" BIGINT NOT NULL DEFAULT 0,
    "gstRate" "GstRate" NOT NULL DEFAULT 'GST_18',
    "cgstAmount" BIGINT NOT NULL DEFAULT 0,
    "sgstAmount" BIGINT NOT NULL DEFAULT 0,
    "igstAmount" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "placeOfSupply" TEXT,
    "taxableValue" BIGINT NOT NULL DEFAULT 0,
    "cgstAmount" BIGINT NOT NULL DEFAULT 0,
    "sgstAmount" BIGINT NOT NULL DEFAULT 0,
    "igstAmount" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "itcEligible" BOOLEAN NOT NULL DEFAULT true,
    "itcClaimed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_entries" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "matchStatus" "ReconciliationMatchStatus" NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "supplierName" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "gstr2aAmount" BIGINT,
    "bookAmount" BIGINT,
    "difference" BIGINT,
    "purchaseInvoiceId" TEXT,

    CONSTRAINT "reconciliation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eway_bills" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "ewayBillNumber" TEXT,
    "ewayBillDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "fromPlace" TEXT,
    "toPlace" TEXT,
    "transportMode" TEXT,
    "vehicleNumber" TEXT,
    "transporterId" TEXT,
    "distance" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eway_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_returns" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "period" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "filedAt" TIMESTAMP(3),
    "arn" TEXT,
    "jsonPayload" JSONB,
    "errorLog" JSONB,
    "gstnReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_gstin_key" ON "organizations"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "users_authProviderId_key" ON "users"("authProviderId");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "users_orgId_email_key" ON "users"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_orgId_idx" ON "invitations"("orgId");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "customers_orgId_idx" ON "customers"("orgId");

-- CreateIndex
CREATE INDEX "customers_orgId_gstin_idx" ON "customers"("orgId", "gstin");

-- CreateIndex
CREATE INDEX "invoices_orgId_status_idx" ON "invoices"("orgId", "status");

-- CreateIndex
CREATE INDEX "invoices_orgId_invoiceDate_idx" ON "invoices"("orgId", "invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_orgId_customerId_idx" ON "invoices"("orgId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orgId_invoiceNumber_key" ON "invoices"("orgId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_notes_orgId_invoiceId_idx" ON "credit_notes"("orgId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_orgId_creditNoteNumber_key" ON "credit_notes"("orgId", "creditNoteNumber");

-- CreateIndex
CREATE INDEX "credit_note_items_creditNoteId_idx" ON "credit_note_items"("creditNoteId");

-- CreateIndex
CREATE INDEX "purchase_invoices_orgId_idx" ON "purchase_invoices"("orgId");

-- CreateIndex
CREATE INDEX "purchase_invoices_orgId_supplierGstin_idx" ON "purchase_invoices"("orgId", "supplierGstin");

-- CreateIndex
CREATE INDEX "reconciliation_runs_orgId_period_idx" ON "reconciliation_runs"("orgId", "period");

-- CreateIndex
CREATE INDEX "reconciliation_entries_runId_idx" ON "reconciliation_entries"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "eway_bills_invoiceId_key" ON "eway_bills"("invoiceId");

-- CreateIndex
CREATE INDEX "eway_bills_orgId_idx" ON "eway_bills"("orgId");

-- CreateIndex
CREATE INDEX "gst_returns_orgId_returnType_idx" ON "gst_returns"("orgId", "returnType");

-- CreateIndex
CREATE UNIQUE INDEX "gst_returns_orgId_returnType_period_key" ON "gst_returns"("orgId", "returnType", "period");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_createdAt_idx" ON "audit_logs"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_entityType_entityId_idx" ON "audit_logs"("orgId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_entries" ADD CONSTRAINT "reconciliation_entries_runId_fkey" FOREIGN KEY ("runId") REFERENCES "reconciliation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_entries" ADD CONSTRAINT "reconciliation_entries_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

