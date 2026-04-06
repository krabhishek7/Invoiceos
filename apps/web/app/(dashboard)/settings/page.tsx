"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STATE_CODES } from "@invoiceos/gst-utils";

export default function SettingsPage() {
  const org = trpc.organization.getCurrent.useQuery();
  const usage = trpc.organization.getUsage.useQuery();
  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      org.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    gstin: "",
    addressLine1: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
    phone: "",
    email: "",
    invoicePrefix: "",
    businessType: "MIXED",
  });

  useEffect(() => {
    if (org.data) {
      setForm({
        name: org.data.name ?? "",
        gstin: org.data.gstin ?? "",
        addressLine1: org.data.addressLine1 ?? "",
        city: org.data.city ?? "",
        state: org.data.state ?? "",
        stateCode: org.data.stateCode ?? "",
        pincode: org.data.pincode ?? "",
        phone: org.data.phone ?? "",
        email: org.data.email ?? "",
        invoicePrefix: org.data.invoicePrefix ?? "",
        businessType: org.data.businessType ?? "MIXED",
      });
    }
  }, [org.data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateOrg.mutate({
      name: form.name || undefined,
      gstin: form.gstin || undefined,
      addressLine1: form.addressLine1 || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      stateCode: form.stateCode || undefined,
      pincode: form.pincode || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      invoicePrefix: form.invoicePrefix || undefined,
      businessType: form.businessType as "B2B" | "B2C" | "MIXED" | undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your business profile and preferences
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/settings/team">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-semibold">Team</h3>
              <p className="text-sm text-muted-foreground">
                Invite members, manage roles
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/billing">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <h3 className="font-semibold">Billing & Plans</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade, manage subscription
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold">Usage</h3>
            <p className="text-sm text-muted-foreground">
              Plan: {usage.data?.planTier ?? "STARTER"} &bull;
              {" "}{usage.data?.invoicesThisMonth ?? 0} invoices this month &bull;
              {" "}{usage.data?.totalCustomers ?? 0} customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Profile */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              This information appears on your invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))
                  }
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Prefix</Label>
                <Input
                  value={form.invoicePrefix}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      invoicePrefix: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. TRD"
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground">
                  Invoice format: {form.invoicePrefix || "INV"}/24-25/001
                </p>
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select
                  value={form.businessType}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, businessType: val ?? f.businessType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="MIXED">Mixed (B2B + B2C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, addressLine1: e.target.value }))
                }
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={form.stateCode}
                  onValueChange={(val) => {
                    if (val) setForm((f) => ({
                      ...f,
                      stateCode: val,
                      state: STATE_CODES[val] ?? "",
                    }));
                  }}
                >
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
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pincode: e.target.value }))
                  }
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateOrg.isPending}>
                {updateOrg.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
