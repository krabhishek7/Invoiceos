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
import { toast } from "sonner";

function formatPaise(paise: string): string {
  const num = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
}

const reasonLabels: Record<string, string> = {
  SALES_RETURN: "Sales Return",
  POST_SALE_DISCOUNT: "Post-Sale Discount",
  DEFICIENCY_IN_SERVICE: "Deficiency in Service",
  CORRECTION_IN_INVOICE: "Correction in Invoice",
  CHANGE_IN_POS: "Change in Place of Supply",
  FINALIZATION_OF_PROVISIONAL_ASSESSMENT: "Finalization of Assessment",
  OTHERS: "Others",
};

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: cn, isLoading } = trpc.creditNote.getById.useQuery({
    id: params.id,
  });

  const cancelCreditNote = trpc.creditNote.cancel.useMutation({
    onSuccess: () => {
      toast.success("Credit note cancelled");
      void utils.creditNote.getById.invalidate({ id: params.id });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading credit note...
      </div>
    );
  }

  if (!cn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Credit note not found</p>
        <Link href="/credit-notes">
          <Button variant="outline">Back to Credit Notes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cn.creditNoteNumber}</h1>
            <Badge variant={cn.status === "ACTIVE" ? "default" : "destructive"}>
              {cn.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Against invoice{" "}
            <Link
              href={`/invoices/${cn.invoiceId}`}
              className="text-primary hover:underline"
            >
              {cn.invoice.invoiceNumber}
            </Link>
            {" — "}
            {cn.customer.name}
            {cn.customer.gstin ? ` (${cn.customer.gstin})` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {cn.status === "ACTIVE" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Cancel this credit note? This cannot be undone.")) {
                  cancelCreditNote.mutate({ id: params.id });
                }
              }}
              disabled={cancelCreditNote.isPending}
            >
              Cancel Credit Note
            </Button>
          )}
          <Link href="/credit-notes">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="font-medium">
              {new Date(cn.creditNoteDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="font-medium">
              {reasonLabels[cn.reason] ?? cn.reason}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Original Invoice</p>
            <p className="font-medium">{cn.invoice.invoiceNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
            <p className="font-bold text-lg">{formatPaise(cn.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

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
              {cn.items.map((item, idx) => {
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatPaise(cn.subtotal)}</span>
              </div>
              {Number(cn.igstAmount) > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-mono">
                    {formatPaise(cn.igstAmount)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-mono">
                      {formatPaise(cn.cgstAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-mono">
                      {formatPaise(cn.sgstAmount)}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="font-mono">{formatPaise(cn.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
