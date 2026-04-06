"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { STATE_CODES, validateGstin, extractStateCodeFromGstin, getStateName } from "@invoiceos/gst-utils";

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<{
    name: string;
    gstin: string;
    pan: string;
    email: string;
    phone: string;
    customerType: "REGISTERED" | "UNREGISTERED" | "CONSUMER" | "EXPORT";
    billingLine1: string;
    billingCity: string;
    billingState: string;
    billingStateCode: string;
    billingPincode: string;
    placeOfSupply: string;
  }>({
    name: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    customerType: "CONSUMER",
    billingLine1: "",
    billingCity: "",
    billingState: "",
    billingStateCode: "",
    billingPincode: "",
    placeOfSupply: "",
  });
  const [gstinError, setGstinError] = useState("");

  const createCustomer = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success("Customer added successfully");
      router.push("/customers");
    },
    onError: (err) => toast.error(err.message),
  });

  function updateField(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function handleGstinChange(value: string) {
    const gstin = value.toUpperCase();
    updateField("gstin", gstin);
    setGstinError("");

    if (gstin.length === 15) {
      const result = validateGstin(gstin);
      if (!result.valid) {
        setGstinError(result.errors.join(", "));
      } else {
        const stateCode = extractStateCodeFromGstin(gstin) ?? "";
        const stateName = getStateName(stateCode) ?? "";
        setForm((prev) => ({
          ...prev,
          gstin,
          pan: result.pan ?? prev.pan,
          customerType: "REGISTERED",
          billingStateCode: stateCode,
          billingState: stateName,
          placeOfSupply: stateCode,
        }));
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCustomer.mutate({
      ...form,
      gstin: form.gstin || undefined,
      pan: form.pan || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Add Customer</h1>
        <p className="text-muted-foreground text-sm">
          Enter customer details. GSTIN auto-fills state and PAN.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="ABC Enterprises"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Type</Label>
                <Select
                  value={form.customerType}
                  onValueChange={(val) => updateField("customerType", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGISTERED">Registered (has GSTIN)</SelectItem>
                    <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                    <SelectItem value="CONSUMER">Consumer (B2C)</SelectItem>
                    <SelectItem value="EXPORT">Export / SEZ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                />
                {gstinError && (
                  <p className="text-xs text-destructive">{gstinError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input
                  value={form.pan}
                  onChange={(e) => updateField("pan", e.target.value.toUpperCase())}
                  placeholder="Auto-filled from GSTIN"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Place of Supply</Label>
                <Select value={form.placeOfSupply} onValueChange={(val) => updateField("placeOfSupply", val)}>
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="contact@abc.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                value={form.billingLine1}
                onChange={(e) => updateField("billingLine1", e.target.value)}
                placeholder="123, Main Street"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.billingCity}
                  onChange={(e) => updateField("billingCity", e.target.value)}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={form.billingState}
                  onChange={(e) => updateField("billingState", e.target.value)}
                  placeholder="Maharashtra"
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={form.billingPincode}
                  onChange={(e) => updateField("billingPincode", e.target.value)}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/customers")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Adding..." : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
