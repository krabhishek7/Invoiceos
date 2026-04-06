"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { STATE_CODES, searchHsn, getGstRateForHsn } from "@invoiceos/gst-utils";
import type { GstRatePercent } from "@invoiceos/gst-utils";

interface LineItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  gstRate: GstRatePercent;
}

function createEmptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    hsnSacCode: "",
    quantity: 1,
    unit: "NOS",
    unitPrice: 0,
    discountPercent: 0,
    gstRate: 18,
  };
}

const GST_RATE_OPTIONS: { value: GstRatePercent; label: string }[] = [
  { value: 0, label: "0%" },
  { value: 5, label: "5%" },
  { value: 12, label: "12%" },
  { value: 18, label: "18%" },
  { value: 28, label: "28%" },
];

const gstRateToEnum: Record<number, string> = {
  0: "GST_0",
  5: "GST_5",
  12: "GST_12",
  18: "GST_18",
  28: "GST_28",
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function InvoiceForm() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]!
  );
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [hsnQuery, setHsnQuery] = useState("");
  const [hsnResults, setHsnResults] = useState<
    ReturnType<typeof searchHsn>
  >([]);
  const [activeHsnItemId, setActiveHsnItemId] = useState<string | null>(null);

  const customers = trpc.customer.list.useQuery({ page: 1, pageSize: 200 });
  const org = trpc.organization.getCurrent.useQuery();
  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created successfully");
      router.push("/invoices");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const supplierStateCode = org.data?.stateCode ?? "";

  const handleHsnSearch = useCallback(
    (query: string, itemId: string) => {
      setHsnQuery(query);
      setActiveHsnItemId(itemId);
      if (query.length >= 2) {
        setHsnResults(searchHsn(query, 8));
      } else {
        setHsnResults([]);
      }
    },
    []
  );

  function selectHsn(itemId: string, code: string) {
    const rate = getGstRateForHsn(code);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              hsnSacCode: code,
              gstRate: rate ?? item.gstRate,
            }
          : item
      )
    );
    setHsnResults([]);
    setActiveHsnItemId(null);
  }

  function updateItem(id: string, field: keyof LineItem, value: unknown) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  // Calculate totals
  function calcItemTaxable(item: LineItem): number {
    const lineTotal = item.unitPrice * item.quantity;
    return lineTotal * (1 - item.discountPercent / 100);
  }

  function calcItemTax(item: LineItem): number {
    return calcItemTaxable(item) * (item.gstRate / 100);
  }

  const isInterState = supplierStateCode !== placeOfSupply && placeOfSupply !== "";
  const subtotal = items.reduce((sum, item) => sum + calcItemTaxable(item), 0);
  const totalTax = items.reduce((sum, item) => sum + calcItemTax(item), 0);
  const grandTotal = subtotal + totalTax;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!placeOfSupply) {
      toast.error("Please select place of supply");
      return;
    }
    if (items.some((item) => !item.description || item.unitPrice <= 0)) {
      toast.error("All line items must have a description and valid price");
      return;
    }

    createInvoice.mutate({
      customerId,
      invoiceDate,
      dueDate: dueDate || undefined,
      placeOfSupply,
      isReverseCharge,
      items: items.map((item) => ({
        description: item.description,
        hsnSacCode: item.hsnSacCode || undefined,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        gstRate: gstRateToEnum[item.gstRate] as "GST_0" | "GST_5" | "GST_12" | "GST_18" | "GST_28",
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={(val) => {
              if (!val) return;
              setCustomerId(val);
              const customer = customers.data?.items.find((c) => c.id === val);
              if (customer?.placeOfSupply) {
                setPlaceOfSupply(customer.placeOfSupply);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.data?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.gstin ? `(${c.gstin})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Place of Supply</Label>
            <Select value={placeOfSupply} onValueChange={(val) => val && setPlaceOfSupply(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATE_CODES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {code} - {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isInterState && placeOfSupply && (
              <p className="text-xs text-blue-600 font-medium">
                Inter-state supply — IGST will apply
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            + Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Item {idx + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 px-2"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Product or service name"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-1 relative">
                  <Label className="text-xs">HSN/SAC Code</Label>
                  <Input
                    placeholder="Search HSN..."
                    value={
                      activeHsnItemId === item.id ? hsnQuery : item.hsnSacCode
                    }
                    onChange={(e) => handleHsnSearch(e.target.value, item.id)}
                    onFocus={() => {
                      setActiveHsnItemId(item.id);
                      setHsnQuery(item.hsnSacCode);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setActiveHsnItemId(null);
                        setHsnResults([]);
                      }, 200);
                    }}
                  />
                  {activeHsnItemId === item.id && hsnResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                      {hsnResults.map((hsn) => (
                        <button
                          key={hsn.code}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                          onMouseDown={() => selectHsn(item.id, hsn.code)}
                        >
                          <span className="font-mono font-medium">
                            {hsn.code}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {hsn.description}
                          </span>
                          <span className="text-xs ml-1 text-blue-600">
                            ({hsn.gstRate}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", Number(e.target.value))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", Number(e.target.value))
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GST Rate</Label>
                  <Select
                    value={item.gstRate.toString()}
                    onValueChange={(val) =>
                      updateItem(
                        item.id,
                        "gstRate",
                        Number(val) as GstRatePercent
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value.toString()}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Line item total */}
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-muted-foreground">
                  Taxable: {formatInr(calcItemTaxable(item))}
                </span>
                <span className="text-muted-foreground">
                  Tax: {formatInr(calcItemTax(item))}
                </span>
                <span className="font-medium">
                  Total: {formatInr(calcItemTaxable(item) + calcItemTax(item))}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatInr(subtotal)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span>{formatInr(totalTax)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span>{formatInr(totalTax / 2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span>{formatInr(totalTax / 2)}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatInr(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/invoices")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createInvoice.isPending}>
          {createInvoice.isPending ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
