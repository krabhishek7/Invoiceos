// ─── API Response Types ──────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Auth & Session Types ────────────────────────────────────

export interface SessionUser {
  id: string;
  orgId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ACCOUNTANT" | "STAFF" | "CA";
  orgName: string;
  orgGstin: string | null;
}

// ─── Invoice Types ───────────────────────────────────────────

export interface CreateInvoiceInput {
  customerId: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupply: string;
  isReverseCharge?: boolean;
  isExport?: boolean;
  items: CreateInvoiceItemInput[];
}

export interface CreateInvoiceItemInput {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  gstRate: 0 | 5 | 12 | 18 | 28;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  totalAmount: string;
  status: string;
}

// ─── Customer Types ──────────────────────────────────────────

export interface CreateCustomerInput {
  name: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  customerType: "REGISTERED" | "UNREGISTERED" | "CONSUMER" | "EXPORT";
  billingLine1?: string;
  billingLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingStateCode?: string;
  billingPincode?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingStateCode?: string;
  shippingPincode?: string;
  placeOfSupply?: string;
}

// ─── Dashboard Types ─────────────────────────────────────────

export interface DashboardStats {
  totalInvoices: number;
  totalRevenuePaise: bigint;
  outstandingPaise: bigint;
  gstLiabilityPaise: {
    cgst: bigint;
    sgst: bigint;
    igst: bigint;
    total: bigint;
  };
  invoicesByStatus: Record<string, number>;
}

export interface FilingCalendarEntry {
  returnType: "GSTR1" | "GSTR3B";
  period: string;
  dueDate: string;
  status: "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "FILED";
}

// ─── Credit Note Types ───────────────────────────────────────

export type CreditNoteReasonType =
  | "SALES_RETURN"
  | "POST_SALE_DISCOUNT"
  | "DEFICIENCY_IN_SERVICE"
  | "CORRECTION_IN_INVOICE"
  | "CHANGE_IN_POS"
  | "FINALIZATION_OF_PROVISIONAL_ASSESSMENT"
  | "OTHERS";

// ─── Reconciliation Types ────────────────────────────────────

export type MatchStatus =
  | "MATCHED"
  | "IN_2A_NOT_IN_BOOKS"
  | "IN_BOOKS_NOT_IN_2A"
  | "AMOUNT_MISMATCH"
  | "GSTIN_MISMATCH";

export interface ReconciliationSummary {
  matched: number;
  in2aNotInBooks: number;
  inBooksNot2a: number;
  amountMismatch: number;
  totalItcAtRisk: bigint;
}

// ─── E-Way Bill Types ────────────────────────────────────────

export interface EwayBillInput {
  invoiceId: string;
  fromPlace: string;
  toPlace: string;
  transportMode: "ROAD" | "RAIL" | "AIR" | "SHIP";
  vehicleNumber?: string;
  transporterId?: string;
  distance: number;
}

// ─── Razorpay / Billing Types ────────────────────────────────

export interface RazorpaySubscriptionEvent {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        plan_id: string;
        customer_id: string;
        status: string;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        status: string;
      };
    };
  };
}

// ─── Email Types ─────────────────────────────────────────────

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

// ─── Plan & Billing Types ────────────────────────────────────

export interface PlanLimits {
  maxInvoicesPerMonth: number;
  maxCustomers: number;
  maxGstins: number;
  eInvoiceAccess: boolean;
  gstFilingAccess: boolean;
  reconciliationAccess: boolean;
  tallyIntegration: boolean;
  whatsappNotifications: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  STARTER: {
    maxInvoicesPerMonth: 50,
    maxCustomers: 100,
    maxGstins: 1,
    eInvoiceAccess: false,
    gstFilingAccess: false,
    reconciliationAccess: false,
    tallyIntegration: false,
    whatsappNotifications: false,
    prioritySupport: false,
  },
  GROWTH: {
    maxInvoicesPerMonth: 500,
    maxCustomers: 1000,
    maxGstins: 3,
    eInvoiceAccess: true,
    gstFilingAccess: true,
    reconciliationAccess: true,
    tallyIntegration: false,
    whatsappNotifications: true,
    prioritySupport: false,
  },
  PRO: {
    maxInvoicesPerMonth: Infinity,
    maxCustomers: Infinity,
    maxGstins: Infinity,
    eInvoiceAccess: true,
    gstFilingAccess: true,
    reconciliationAccess: true,
    tallyIntegration: true,
    whatsappNotifications: true,
    prioritySupport: true,
  },
};

export const PLAN_PRICES: Record<string, { monthly: number; name: string; description: string }> = {
  STARTER: { monthly: 0, name: "Starter", description: "For small shops & freelancers" },
  GROWTH: { monthly: 99900, name: "Growth", description: "For growing businesses" },
  PRO: { monthly: 299900, name: "Pro", description: "For large businesses & CAs" },
};
