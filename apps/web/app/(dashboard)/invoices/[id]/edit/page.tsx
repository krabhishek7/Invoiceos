"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export default function InvoiceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: invoice, isLoading } = trpc.invoice.getById.useQuery({
    id: params.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
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

  if (invoice.status !== "DRAFT") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">
          Only draft invoices can be edited. This invoice is{" "}
          <strong>{invoice.status}</strong>.
        </p>
        <Link href={`/invoices/${params.id}`}>
          <Button variant="outline">View Invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit {invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Editing draft invoice for {invoice.customer.name}
          </p>
        </div>
        <Link href={`/invoices/${params.id}`}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input value={invoice.invoiceNumber} disabled />
            </div>
            <div>
              <Label>Customer</Label>
              <Input value={invoice.customer.name} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Invoice Date</Label>
              <Input
                type="date"
                defaultValue={
                  new Date(invoice.invoiceDate).toISOString().split("T")[0]
                }
                disabled
              />
            </div>
            <div>
              <Label>Place of Supply</Label>
              <Input value={invoice.placeOfSupply} disabled />
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Editing limitation</p>
            <p>
              For GST compliance, editing line items on an existing invoice is
              restricted. To make changes, delete this draft and create a new
              invoice, or create a Credit Note after the invoice is sent.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/invoices/${params.id}`}>
              <Button variant="outline">Back to Invoice</Button>
            </Link>
            <Link href="/invoices/new">
              <Button>Create New Invoice</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
