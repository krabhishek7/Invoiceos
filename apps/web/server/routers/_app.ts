import { router } from "../trpc";
import { invoiceRouter } from "./invoices";
import { customerRouter } from "./customers";
import { organizationRouter } from "./organizations";
import { dashboardRouter } from "./dashboard";
import { gstReturnRouter } from "./gst-returns";
import { billingRouter } from "./billing";
import { teamRouter } from "./team";
import { einvoiceRouter } from "./einvoice";
import { reconciliationRouter } from "./reconciliation";
import { creditNoteRouter } from "./credit-notes";
import { tallyRouter } from "./tally";
import { ewayBillRouter } from "./eway-bill";

export const appRouter = router({
  invoice: invoiceRouter,
  customer: customerRouter,
  organization: organizationRouter,
  dashboard: dashboardRouter,
  gstReturn: gstReturnRouter,
  billing: billingRouter,
  team: teamRouter,
  einvoice: einvoiceRouter,
  reconciliation: reconciliationRouter,
  creditNote: creditNoteRouter,
  tally: tallyRouter,
  ewayBill: ewayBillRouter,
});

export type AppRouter = typeof appRouter;
