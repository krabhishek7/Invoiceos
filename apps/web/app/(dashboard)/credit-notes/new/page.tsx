"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

const reasons = [
  { value: "SALES_RETURN", label: "Sales Return" },
  { value: "POST_SALE_DISCOUNT", label: "Post-Sale Discount" },
  { value: "DEFICIENCY_IN_SERVICE", label: "Deficiency in Service" },
  { value: "CORRECTION_IN_INVOICE", label: "Correction in Invoice" },
  { value: "CHANGE_IN_POS", label: "Change in Place of Supply" },
  {
    value: "FINALIZATION_OF_PROVISIONAL_ASSESSMENT",
    label: "Finalization of Provisional Assessment",
  },
  { value: "OTHERS", label: "Others" },
];

interface LineItem {
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: string;
}

export default function NewCreditNotePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
      <NewCreditNoteForm />
    </Suspense>
  );
}

function NewCreditNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get("invoiceId") ?? "";

  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId);
  const [reason, setReason] = useState("SALES_RETURN");
  const [items, setItems] = useState<LineItem[]>([
    {
      description: "",
      hsnSacCode: "",
      quantity: 1,
      unit: "NOS",
      unitPrice: 0,
      gstRate: "GST_18",
    },
  ]);

  const { data: invoices } = trpc.invoice.list.useQuery({
    page: 1,
    pageSize: 200,
    status: undefined,
  });

  const createCreditNote = trpc.creditNote.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Credit Note ${data.creditNoteNumber} created`);
      router.push("/credit-notes");
    },
    onError: (err) => toast.error(err.message),
  });

  function addItem() {
    setItems([
      ...items,
      {
        description: "",
        hsnSacCode: "",
        quantity: 1,
        unit: "NOS",
        unitPrice: 0,
        gstRate: "GST_18",
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index]!, [field]: value };
    setItems(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    createCreditNote.mutate({
      invoiceId,
      reason: reason as
        | "SALES_RETURN"
        | "POST_SALE_DISCOUNT"
        | "DEFICIENCY_IN_SERVICE"
        | "CORRECTION_IN_INVOICE"
        | "CHANGE_IN_POS"
        | "FINALIZATION_OF_PROVISIONAL_ASSESSMENT"
        | "OTHERS",
      items: items.map((item) => ({
        description: item.description,
        hsnSacCode: item.hsnSacCode || undefined,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate as "GST_0" | "GST_5" | "GST_12" | "GST_18" | "GST_28",
      })),
    });
  }

  const sentInvoices =
    invoices?.items.filter(
      (inv) => inv.status !== "DRAFT" && inv.status !== "CANCELLED"
    ) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Credit Note</h1>
          <p className="text-muted-foreground text-sm">
            Issue a credit note against an existing invoice
          </p>
        </div>
        <Link href="/credit-notes">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Credit Note Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Against Invoice *</Label>
                <Select value={invoiceId} onValueChange={(v) => v && setInvoiceId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {sentInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason *</Label>
                <Select value={reason} onValueChange={(v) => v && setReason(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeItem(idx)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>HSN/SAC Code</Label>
                    <Input
                      value={item.hsnSacCode}
                      onChange={(e) =>
                        updateItem(idx, "hsnSacCode", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit Price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(idx, "unit", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>GST Rate</Label>
                    <Select
                      value={item.gstRate}
                      onValueChange={(v) => v && updateItem(idx, "gstRate", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST_0">0%</SelectItem>
                        <SelectItem value="GST_5">5%</SelectItem>
                        <SelectItem value="GST_12">12%</SelectItem>
                        <SelectItem value="GST_18">18%</SelectItem>
                        <SelectItem value="GST_28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={createCreditNote.isPending}>
            {createCreditNote.isPending ? "Creating..." : "Create Credit Note"}
          </Button>
        </div>
      </form>
    </div>
  );
}
