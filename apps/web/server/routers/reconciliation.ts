import { z } from "zod";
import { router, featureGateProcedure, protectedProcedure } from "../trpc";
import { fetchGstr2a } from "@/lib/gstn-client";
import { rupeesToPaise } from "@invoiceos/gst-utils";

export const reconciliationRouter = router({
  purchaseInvoices: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        ctx.db.purchaseInvoice.findMany({
          where: { orgId: ctx.session.orgId },
          orderBy: { invoiceDate: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.purchaseInvoice.count({
          where: { orgId: ctx.session.orgId },
        }),
      ]);

      return {
        items: items.map((pi) => ({
          ...pi,
          taxableValue: pi.taxableValue.toString(),
          cgstAmount: pi.cgstAmount.toString(),
          sgstAmount: pi.sgstAmount.toString(),
          igstAmount: pi.igstAmount.toString(),
          totalAmount: pi.totalAmount.toString(),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  createPurchaseInvoice: protectedProcedure
    .input(
      z.object({
        supplierName: z.string().min(1),
        supplierGstin: z.string().min(15).max(15),
        invoiceNumber: z.string().min(1),
        invoiceDate: z.string(),
        taxableValue: z.number().min(0),
        cgstAmount: z.number().min(0).default(0),
        sgstAmount: z.number().min(0).default(0),
        igstAmount: z.number().min(0).default(0),
        placeOfSupply: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const taxableValuePaise = BigInt(rupeesToPaise(input.taxableValue));
      const cgstPaise = BigInt(rupeesToPaise(input.cgstAmount));
      const sgstPaise = BigInt(rupeesToPaise(input.sgstAmount));
      const igstPaise = BigInt(rupeesToPaise(input.igstAmount));
      const totalPaise = taxableValuePaise + cgstPaise + sgstPaise + igstPaise;

      const pi = await ctx.db.purchaseInvoice.create({
        data: {
          orgId: ctx.session.orgId,
          supplierName: input.supplierName,
          supplierGstin: input.supplierGstin,
          invoiceNumber: input.invoiceNumber,
          invoiceDate: new Date(input.invoiceDate),
          placeOfSupply: input.placeOfSupply,
          taxableValue: taxableValuePaise,
          cgstAmount: cgstPaise,
          sgstAmount: sgstPaise,
          igstAmount: igstPaise,
          totalAmount: totalPaise,
          source: "MANUAL",
        },
      });

      return { id: pi.id };
    }),

  fetch2aAndReconcile: featureGateProcedure("reconciliationAccess")
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
      });
      if (!org?.gstin) throw new Error("Organization GSTIN is required");

      const run = await ctx.db.reconciliationRun.create({
        data: {
          orgId: ctx.session.orgId,
          period: input.period,
          status: "RUNNING",
        },
      });

      try {
        let gstr2aInvoices: Gstr2aInvoice[] = [];

        if (org.gstnAuthToken && org.gstnTokenExpiry && org.gstnTokenExpiry > new Date()) {
          const periodFormatted = input.period.replace("-", "");
          const gstr2aData = await fetchGstr2a(org.gstin, org.gstnAuthToken, periodFormatted);
          gstr2aInvoices = parseGstr2aResponse(gstr2aData);
        }

        const purchaseInvoices = await ctx.db.purchaseInvoice.findMany({
          where: {
            orgId: ctx.session.orgId,
            invoiceDate: {
              gte: new Date(`${input.period}-01`),
              lt: getNextMonthStart(input.period),
            },
          },
        });

        const entries = performReconciliation(
          gstr2aInvoices,
          purchaseInvoices.map((pi) => ({
            id: pi.id,
            supplierGstin: pi.supplierGstin,
            supplierName: pi.supplierName,
            invoiceNumber: pi.invoiceNumber,
            invoiceDate: pi.invoiceDate,
            totalAmount: Number(pi.totalAmount),
          }))
        );

        const summary = {
          matched: entries.filter((e) => e.matchStatus === "MATCHED").length,
          in2aNotInBooks: entries.filter((e) => e.matchStatus === "IN_2A_NOT_IN_BOOKS").length,
          inBooksNot2a: entries.filter((e) => e.matchStatus === "IN_BOOKS_NOT_IN_2A").length,
          amountMismatch: entries.filter((e) => e.matchStatus === "AMOUNT_MISMATCH").length,
        };

        if (entries.length > 0) {
          await ctx.db.reconciliationEntry.createMany({
            data: entries.map((e) => ({
              runId: run.id,
              matchStatus: e.matchStatus,
              supplierGstin: e.supplierGstin,
              supplierName: e.supplierName,
              invoiceNumber: e.invoiceNumber,
              invoiceDate: e.invoiceDate,
              gstr2aAmount: e.gstr2aAmount ? BigInt(e.gstr2aAmount) : null,
              bookAmount: e.bookAmount ? BigInt(e.bookAmount) : null,
              difference: e.difference ? BigInt(e.difference) : null,
              purchaseInvoiceId: e.purchaseInvoiceId,
            })),
          });
        }

        await ctx.db.reconciliationRun.update({
          where: { id: run.id },
          data: { status: "COMPLETED", summary },
        });

        await ctx.db.auditLog.create({
          data: {
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            action: "RECONCILIATION_RUN",
            entityType: "reconciliation_run",
            entityId: run.id,
            metadata: summary,
          },
        });

        return { runId: run.id, summary };
      } catch (error) {
        await ctx.db.reconciliationRun.update({
          where: { id: run.id },
          data: { status: "FAILED", summary: { error: String(error) } },
        });
        throw error;
      }
    }),

  listRuns: protectedProcedure
    .input(z.object({ period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const runs = await ctx.db.reconciliationRun.findMany({
        where: {
          orgId: ctx.session.orgId,
          ...(input.period ? { period: input.period } : {}),
        },
        include: { _count: { select: { entries: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return runs.map((r) => ({
        id: r.id,
        period: r.period,
        status: r.status,
        summary: r.summary as Record<string, number> | null,
        entryCount: r._count.entries,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  getRunEntries: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.reconciliationRun.findFirst({
        where: { id: input.runId, orgId: ctx.session.orgId },
        include: { entries: true },
      });
      if (!run) throw new Error("Reconciliation run not found");

      return {
        ...run,
        entries: run.entries.map((e) => ({
          ...e,
          gstr2aAmount: e.gstr2aAmount?.toString() ?? null,
          bookAmount: e.bookAmount?.toString() ?? null,
          difference: e.difference?.toString() ?? null,
        })),
      };
    }),
});

interface Gstr2aInvoice {
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
}

function parseGstr2aResponse(data: Record<string, unknown>): Gstr2aInvoice[] {
  const invoices: Gstr2aInvoice[] = [];

  const b2b = (data.b2b ?? data.B2B ?? []) as {
    ctin: string;
    cfs: string;
    inv: {
      inum: string;
      idt: string;
      val: number;
    }[];
  }[];

  for (const supplier of b2b) {
    for (const inv of supplier.inv ?? []) {
      invoices.push({
        supplierGstin: supplier.ctin,
        supplierName: supplier.cfs ?? supplier.ctin,
        invoiceNumber: inv.inum,
        invoiceDate: parseGstnDate(inv.idt),
        totalAmount: Math.round(inv.val * 100),
      });
    }
  }

  return invoices;
}

function parseGstnDate(dateStr: string): Date {
  if (dateStr.includes("-")) {
    const [d, m, y] = dateStr.split("-");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(dateStr);
}

interface ReconciliationEntryData {
  matchStatus: "MATCHED" | "IN_2A_NOT_IN_BOOKS" | "IN_BOOKS_NOT_IN_2A" | "AMOUNT_MISMATCH";
  supplierGstin: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  gstr2aAmount: number | null;
  bookAmount: number | null;
  difference: number | null;
  purchaseInvoiceId: string | null;
}

interface BookInvoice {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
}

function performReconciliation(
  gstr2a: Gstr2aInvoice[],
  books: BookInvoice[]
): ReconciliationEntryData[] {
  const entries: ReconciliationEntryData[] = [];
  const matchedBookIds = new Set<string>();
  const TOLERANCE_PAISE = 100;

  for (const g2a of gstr2a) {
    const match = books.find(
      (b) =>
        b.supplierGstin === g2a.supplierGstin &&
        normalizeInvNum(b.invoiceNumber) === normalizeInvNum(g2a.invoiceNumber)
    );

    if (match) {
      matchedBookIds.add(match.id);
      const diff = Math.abs(g2a.totalAmount - match.totalAmount);

      if (diff <= TOLERANCE_PAISE) {
        entries.push({
          matchStatus: "MATCHED",
          supplierGstin: g2a.supplierGstin,
          supplierName: g2a.supplierName,
          invoiceNumber: g2a.invoiceNumber,
          invoiceDate: g2a.invoiceDate,
          gstr2aAmount: g2a.totalAmount,
          bookAmount: match.totalAmount,
          difference: 0,
          purchaseInvoiceId: match.id,
        });
      } else {
        entries.push({
          matchStatus: "AMOUNT_MISMATCH",
          supplierGstin: g2a.supplierGstin,
          supplierName: g2a.supplierName,
          invoiceNumber: g2a.invoiceNumber,
          invoiceDate: g2a.invoiceDate,
          gstr2aAmount: g2a.totalAmount,
          bookAmount: match.totalAmount,
          difference: g2a.totalAmount - match.totalAmount,
          purchaseInvoiceId: match.id,
        });
      }
    } else {
      entries.push({
        matchStatus: "IN_2A_NOT_IN_BOOKS",
        supplierGstin: g2a.supplierGstin,
        supplierName: g2a.supplierName,
        invoiceNumber: g2a.invoiceNumber,
        invoiceDate: g2a.invoiceDate,
        gstr2aAmount: g2a.totalAmount,
        bookAmount: null,
        difference: null,
        purchaseInvoiceId: null,
      });
    }
  }

  for (const book of books) {
    if (!matchedBookIds.has(book.id)) {
      entries.push({
        matchStatus: "IN_BOOKS_NOT_IN_2A",
        supplierGstin: book.supplierGstin,
        supplierName: book.supplierName,
        invoiceNumber: book.invoiceNumber,
        invoiceDate: book.invoiceDate,
        gstr2aAmount: null,
        bookAmount: book.totalAmount,
        difference: null,
        purchaseInvoiceId: book.id,
      });
    }
  }

  return entries;
}

function normalizeInvNum(num: string): string {
  return num.replace(/[\s\-\/]/g, "").toUpperCase();
}

function getNextMonthStart(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(year!, month!, 1);
}
