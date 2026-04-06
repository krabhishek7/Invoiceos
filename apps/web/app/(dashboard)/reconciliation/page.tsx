"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function formatPaise(paise: string | null): string {
  if (!paise) return "—";
  const num = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
}

function getAvailablePeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`
    );
  }
  return periods;
}

const matchStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  MATCHED: "default",
  IN_2A_NOT_IN_BOOKS: "destructive",
  IN_BOOKS_NOT_IN_2A: "secondary",
  AMOUNT_MISMATCH: "outline",
};

const matchStatusLabels: Record<string, string> = {
  MATCHED: "Matched",
  IN_2A_NOT_IN_BOOKS: "In 2A, Not in Books",
  IN_BOOKS_NOT_IN_2A: "In Books, Not in 2A",
  AMOUNT_MISMATCH: "Amount Mismatch",
};

export default function ReconciliationPage() {
  const [period, setPeriod] = useState(getAvailablePeriods()[0]!);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: runs, isLoading: runsLoading } =
    trpc.reconciliation.listRuns.useQuery({ period });

  const { data: runEntries, isLoading: entriesLoading } =
    trpc.reconciliation.getRunEntries.useQuery(
      { runId: selectedRunId! },
      { enabled: !!selectedRunId }
    );

  const { data: purchaseInvoices } =
    trpc.reconciliation.purchaseInvoices.useQuery({ page: 1, pageSize: 10 });

  const reconcile = trpc.reconciliation.fetch2aAndReconcile.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Reconciliation complete: ${data.summary.matched} matched, ${data.summary.in2aNotInBooks} in 2A only, ${data.summary.inBooksNot2a} in books only`
      );
      setSelectedRunId(data.runId);
    },
    onError: (err) => toast.error(err.message),
  });

  const latestRun = runs?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GSTR-2A Reconciliation</h1>
          <p className="text-muted-foreground text-sm">
            Match your purchase records with GSTR-2A data from GSTN
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(latestRun?.summary as Record<string, number>)?.matched ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In 2A, Not in Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(latestRun?.summary as Record<string, number>)?.in2aNotInBooks ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Books, Not in 2A
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(latestRun?.summary as Record<string, number>)?.inBooksNot2a ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Mismatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(latestRun?.summary as Record<string, number>)?.amountMismatch ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Period</p>
              <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePeriods().map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => reconcile.mutate({ period })}
              disabled={reconcile.isPending}
            >
              {reconcile.isPending
                ? "Running..."
                : "Fetch GSTR-2A & Reconcile"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This will fetch your GSTR-2A data from GSTN and compare it with your
            purchase records. Requires Growth or Pro plan.
          </p>
        </CardContent>
      </Card>

      {runs && runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Reconciliation Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Matched</TableHead>
                  <TableHead>Mismatches</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const s = run.summary as Record<string, number> | null;
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.period}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.status === "COMPLETED" ? "default" : "destructive"
                          }
                        >
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{s?.matched ?? 0}</TableCell>
                      <TableCell>
                        {(s?.in2aNotInBooks ?? 0) +
                          (s?.inBooksNot2a ?? 0) +
                          (s?.amountMismatch ?? 0)}
                      </TableCell>
                      <TableCell>
                        {new Date(run.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedRunId && runEntries && (
        <Card>
          <CardHeader>
            <CardTitle>
              Reconciliation Details
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => setSelectedRunId(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier GSTIN</TableHead>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">GSTR-2A Amount</TableHead>
                  <TableHead className="text-right">Book Amount</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runEntries.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge
                        variant={
                          matchStatusVariant[entry.matchStatus] ?? "outline"
                        }
                      >
                        {matchStatusLabels[entry.matchStatus] ??
                          entry.matchStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.supplierGstin}
                    </TableCell>
                    <TableCell>{entry.supplierName ?? "—"}</TableCell>
                    <TableCell>{entry.invoiceNumber ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(entry.gstr2aAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(entry.bookAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(entry.difference)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Purchase Invoices ({purchaseInvoices?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseInvoices?.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No purchase invoices recorded yet. Add them manually or import from
              Tally to enable reconciliation.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {purchaseInvoices?.total} purchase invoices recorded for
              reconciliation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
