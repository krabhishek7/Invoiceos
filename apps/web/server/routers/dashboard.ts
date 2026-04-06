import { router, protectedProcedure } from "../trpc";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalInvoices,
      invoicesThisMonth,
      paidInvoices,
      draftInvoices,
      sentInvoices,
      overdueInvoices,
      recentInvoices,
      topCustomers,
    ] = await Promise.all([
      ctx.db.invoice.count({ where: { orgId } }),
      ctx.db.invoice.count({
        where: { orgId, createdAt: { gte: monthStart } },
      }),
      ctx.db.invoice.aggregate({
        where: { orgId, status: "PAID" },
        _sum: { totalAmount: true },
        _count: true,
      }),
      ctx.db.invoice.count({ where: { orgId, status: "DRAFT" } }),
      ctx.db.invoice.count({ where: { orgId, status: "SENT" } }),
      ctx.db.invoice.count({ where: { orgId, status: "OVERDUE" } }),
      ctx.db.invoice.findMany({
        where: { orgId },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      ctx.db.invoice.groupBy({
        by: ["customerId"],
        where: { orgId, status: "PAID" },
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 5,
      }),
    ]);

    // Fetch customer names for top customers
    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await ctx.db.customer.findMany({
      where: { id: { in: customerIds } },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    // GST liability for current month
    const monthlyInvoices = await ctx.db.invoice.aggregate({
      where: {
        orgId,
        invoiceDate: { gte: monthStart },
        status: { not: "CANCELLED" },
      },
      _sum: {
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        totalAmount: true,
        subtotal: true,
      },
    });

    return {
      totalInvoices,
      invoicesThisMonth,
      totalRevenue: paidInvoices._sum.totalAmount?.toString() ?? "0",
      paidCount: paidInvoices._count,
      draftCount: draftInvoices,
      sentCount: sentInvoices,
      overdueCount: overdueInvoices,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        totalAmount: inv.totalAmount.toString(),
        status: inv.status,
        invoiceDate: inv.invoiceDate.toISOString(),
      })),
      topCustomers: topCustomers.map((tc) => ({
        customerId: tc.customerId,
        customerName: customerMap.get(tc.customerId) ?? "Unknown",
        totalRevenue: tc._sum.totalAmount?.toString() ?? "0",
        invoiceCount: tc._count,
      })),
      gstLiability: {
        cgst: monthlyInvoices._sum.cgstAmount?.toString() ?? "0",
        sgst: monthlyInvoices._sum.sgstAmount?.toString() ?? "0",
        igst: monthlyInvoices._sum.igstAmount?.toString() ?? "0",
        subtotal: monthlyInvoices._sum.subtotal?.toString() ?? "0",
        total: monthlyInvoices._sum.totalAmount?.toString() ?? "0",
      },
    };
  }),
});
