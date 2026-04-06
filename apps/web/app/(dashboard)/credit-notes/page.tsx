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

const reasonLabels: Record<string, string> = {
  SALES_RETURN: "Sales Return",
  POST_SALE_DISCOUNT: "Post-Sale Discount",
  DEFICIENCY_IN_SERVICE: "Deficiency in Service",
  CORRECTION_IN_INVOICE: "Correction in Invoice",
  CHANGE_IN_POS: "Change in POS",
  FINALIZATION_OF_PROVISIONAL_ASSESSMENT: "Finalization of Assessment",
  OTHERS: "Others",
};

export default function CreditNotesPage() {
  const { data, isLoading } = trpc.creditNote.list.useQuery({
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Notes</h1>
          <p className="text-muted-foreground text-sm">
            Manage credit notes issued against invoices
          </p>
        </div>
        <Link href="/credit-notes/new">
          <Button>Create Credit Note</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : data?.items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No credit notes yet</p>
              <p className="text-sm text-muted-foreground">
                Credit notes are issued to adjust invoices after they have been sent.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit Note #</TableHead>
                  <TableHead>Against Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((cn) => (
                  <TableRow key={cn.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/credit-notes/${cn.id}`}
                        className="text-primary hover:underline"
                      >
                        {cn.creditNoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{cn.invoiceNumber}</TableCell>
                    <TableCell>{cn.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {reasonLabels[cn.reason] ?? cn.reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cn.creditNoteDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPaise(cn.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cn.status === "ACTIVE" ? "default" : "destructive"
                        }
                      >
                        {cn.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
