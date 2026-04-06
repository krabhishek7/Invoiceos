"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.customer.list.useQuery({
    page: 1,
    pageSize: 100,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Manage your customers and their GSTIN details
          </p>
        </div>
        <Link href="/customers/new">
          <Button>Add Customer</Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by name, GSTIN, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading customers...
            </div>
          ) : data?.items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No customers yet</p>
              <Link href="/customers/new">
                <Button>Add Your First Customer</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {customer.gstin || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.customerType}</Badge>
                    </TableCell>
                    <TableCell>{customer.email || "—"}</TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>
                      {customer.billingState || customer.billingStateCode || "—"}
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
