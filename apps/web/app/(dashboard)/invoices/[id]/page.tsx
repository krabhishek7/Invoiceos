"use client";

import { useParams, useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

const statusTransitions: Record<string, { label: string; value: string }[]> = {
  DRAFT: [
    { label: "Mark as Sent", value: "SENT" },
    { label: "Mark as Paid", value: "PAID" },
    { label: "Cancel", value: "CANCELLED" },
  ],
  SENT: [
    { label: "Mark as Paid", value: "PAID" },
    { label: "Cancel", value: "CANCELLED" },
  ],
  PAID: [],
  CANCELLED: [],
  IRN_GENERATED: [
    { label: "Mark as Sent", value: "SENT" },
    { label: "Mark as Paid", value: "PAID" },
  ],
  OVERDUE: [
    { label: "Mark as Paid", value: "PAID" },
    { label: "Cancel", value: "CANCELLED" },
  ],
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: invoice, isLoading } = trpc.invoice.getById.useQuery({
    id: params.id,
  });

  const updateStatus = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Invoice status updated");
      void utils.invoice.getById.invalidate({ id: params.id });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const deleteInvoice = trpc.invoice.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted");
      router.push("/invoices");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Invoice not found</p>
        <Link href="/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const transitions = statusTransitions[invoice.status] ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <Badge variant={statusVariant[invoice.status] ?? "secondary"}>
              {invoice.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {invoice.customer.name}
            {invoice.customer.gstin ? ` (${invoice.customer.gstin})` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/api/invoices/${params.id}/pdf`, "_blank")
            }
          >
            View PDF
          </Button>
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transitions.map((t) => (
                  <DropdownMenuItem
                    key={t.value}
                    onClick={() =>
                      updateStatus.mutate({
                        id: params.id,
                        status: t.value as "DRAFT" | "SENT" | "PAID" | "CANCELLED",
                      })
                    }
                    className={
                      t.value === "CANCELLED" ? "text-destructive" : ""
                    }
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {invoice.status === "DRAFT" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Delete this draft invoice?")) {
                  deleteInvoice.mutate({ id: params.id });
                }
              }}
            >
              Delete
            </Button>
          )}
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Invoice Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Invoice Date</p>
            <p className="font-medium">
              {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Due Date</p>
            <p className="font-medium">
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Place of Supply</p>
            <p className="font-medium">{invoice.placeOfSupply}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
            <p className="font-bold text-lg">{formatPaise(invoice.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Flags */}
      {(invoice.isReverseCharge || invoice.isExport || invoice.irn) && (
        <div className="flex gap-2 flex-wrap">
          {invoice.isReverseCharge && (
            <Badge variant="outline">Reverse Charge</Badge>
          )}
          {invoice.isExport && <Badge variant="outline">Export</Badge>}
          {invoice.irn && (
            <Badge variant="default">IRN: {invoice.irn}</Badge>
          )}
        </div>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, idx) => {
                const taxAmount =
                  Number(item.cgstAmount) +
                  Number(item.sgstAmount) +
                  Number(item.igstAmount);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.description}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.hsnSacCode || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(item.taxableValue)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {item.gstRate.replace("GST_", "")}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(String(taxAmount))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatPaise(item.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatPaise(invoice.subtotal)}
                </span>
              </div>
              {Number(invoice.igstAmount) > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-mono">
                    {formatPaise(invoice.igstAmount)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-mono">
                      {formatPaise(invoice.cgstAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-mono">
                      {formatPaise(invoice.sgstAmount)}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="font-mono">
                  {formatPaise(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {invoice.paymentCollectedAt && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Payment collected on</p>
            <p className="font-medium">
              {new Date(invoice.paymentCollectedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
