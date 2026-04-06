"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatPaise(paise: string): string {
  const num = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  CANCELLED: "destructive",
  IRN_GENERATED: "default",
  OVERDUE: "destructive",
};

function getFilingCalendar() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = prevMonth.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const gstr1Due = new Date(now.getFullYear(), now.getMonth(), 11);
  const gstr3bDue = new Date(now.getFullYear(), now.getMonth(), 20);

  return [
    {
      type: "GSTR-1",
      period: prevMonthStr,
      dueDate: gstr1Due,
      overdue: now > gstr1Due,
    },
    {
      type: "GSTR-3B",
      period: prevMonthStr,
      dueDate: gstr3bDue,
      overdue: now > gstr3bDue,
    },
  ];
}

export default function DashboardHomePage() {
  const { data, isLoading } = trpc.dashboard.stats.useQuery();
  const filingCalendar = getFilingCalendar();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Business overview and GST compliance status
          </p>
        </div>
        <Link href="/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totalInvoices ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.invoicesThisMonth ?? 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.totalRevenue ? formatPaise(data.totalRevenue) : "₹0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.paidCount ?? 0} paid invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(data?.draftCount ?? 0) + (data?.sentCount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.draftCount ?? 0} draft, {data?.sentCount ?? 0} sent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.overdueCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires follow-up
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GST Liability This Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GST Liability (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.gstLiability ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Value</span>
                  <span className="font-mono font-medium">
                    {formatPaise(data.gstLiability.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="font-mono">
                    {formatPaise(data.gstLiability.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="font-mono">
                    {formatPaise(data.gstLiability.sgst)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-mono">
                    {formatPaise(data.gstLiability.igst)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total GST</span>
                  <span className="font-mono">
                    {formatPaise(
                      String(
                        Number(data.gstLiability.cgst) +
                          Number(data.gstLiability.sgst) +
                          Number(data.gstLiability.igst)
                      )
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No invoices this month
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filing Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filing Calendar</CardTitle>
              <Link href="/gst-returns">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filingCalendar.map((filing, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-sm">{filing.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {filing.period}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={filing.overdue ? "destructive" : "outline"}>
                    {filing.overdue ? "Overdue" : "Upcoming"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Due:{" "}
                    {filing.dueDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data?.recentInvoices && data.recentInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-primary hover:underline text-sm"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.customerName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPaise(inv.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant[inv.status] ?? "secondary"}
                          className="text-xs"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-primary hover:underline">
                  Create your first invoice
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Customers</CardTitle>
              <Link href="/customers">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data?.topCustomers && data.topCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCustomers.map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="font-medium text-sm">
                        {c.customerName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPaise(c.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {c.invoiceCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Revenue data will appear here once invoices are paid
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
