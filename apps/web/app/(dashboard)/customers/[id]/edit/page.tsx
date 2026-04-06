"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function CustomerEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: customer, isLoading } = trpc.customer.getById.useQuery({
    id: params.id,
  });

  const [form, setForm] = useState({
    name: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    customerType: "CONSUMER" as string,
    billingLine1: "",
    billingCity: "",
    billingState: "",
    billingStateCode: "",
    billingPincode: "",
    placeOfSupply: "",
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        gstin: customer.gstin ?? "",
        pan: customer.pan ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        customerType: customer.customerType,
        billingLine1: customer.billingLine1 ?? "",
        billingCity: customer.billingCity ?? "",
        billingState: customer.billingState ?? "",
        billingStateCode: customer.billingStateCode ?? "",
        billingPincode: customer.billingPincode ?? "",
        placeOfSupply: customer.placeOfSupply ?? "",
      });
    }
  }, [customer]);

  const updateCustomer = trpc.customer.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated");
      utils.customer.getById.invalidate({ id: params.id });
      utils.customer.list.invalidate();
      router.push("/customers");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCustomer = trpc.customer.delete.useMutation({
    onSuccess: () => {
      toast.success("Customer deleted");
      router.push("/customers");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Customer not found</p>
        <Link href="/customers">
          <Button variant="outline">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateCustomer.mutate({
      id: params.id,
      name: form.name,
      gstin: form.gstin || undefined,
      pan: form.pan || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      customerType: form.customerType as
        | "REGISTERED"
        | "UNREGISTERED"
        | "CONSUMER"
        | "EXPORT",
      billingLine1: form.billingLine1 || undefined,
      billingCity: form.billingCity || undefined,
      billingState: form.billingState || undefined,
      billingStateCode: form.billingStateCode || undefined,
      billingPincode: form.billingPincode || undefined,
      placeOfSupply: form.placeOfSupply || undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Customer</h1>
          <p className="text-muted-foreground text-sm">{customer.name}</p>
        </div>
        <Link href="/customers">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Customer Type</Label>
                <Select
                  value={form.customerType}
                  onValueChange={(v) =>
                    v && setForm({ ...form, customerType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGISTERED">Registered</SelectItem>
                    <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                    <SelectItem value="CONSUMER">Consumer</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) =>
                    setForm({ ...form, gstin: e.target.value.toUpperCase() })
                  }
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div>
                <Label>PAN</Label>
                <Input
                  value={form.pan}
                  onChange={(e) =>
                    setForm({ ...form, pan: e.target.value.toUpperCase() })
                  }
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Billing Address</Label>
              <Input
                value={form.billingLine1}
                onChange={(e) =>
                  setForm({ ...form, billingLine1: e.target.value })
                }
                placeholder="Address line 1"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={form.billingCity}
                  onChange={(e) =>
                    setForm({ ...form, billingCity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={form.billingState}
                  onChange={(e) =>
                    setForm({ ...form, billingState: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={form.billingPincode}
                  onChange={(e) =>
                    setForm({ ...form, billingPincode: e.target.value })
                  }
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>State Code (2-digit)</Label>
                <Input
                  value={form.billingStateCode}
                  onChange={(e) =>
                    setForm({ ...form, billingStateCode: e.target.value })
                  }
                  maxLength={2}
                />
              </div>
              <div>
                <Label>Place of Supply (State Code)</Label>
                <Input
                  value={form.placeOfSupply}
                  onChange={(e) =>
                    setForm({ ...form, placeOfSupply: e.target.value })
                  }
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateCustomer.isPending}>
                {updateCustomer.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Delete this customer? This cannot be undone."
                    )
                  ) {
                    deleteCustomer.mutate({ id: params.id });
                  }
                }}
                disabled={deleteCustomer.isPending}
              >
                Delete Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
