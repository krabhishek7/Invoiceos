"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function getAvailablePeriods(): { value: string; label: string }[] {
  const periods: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
    periods.push({ value, label });
  }

  return periods;
}

function getFilingDates() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLabel = prevMonth.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return [
    {
      type: "GSTR-1",
      period: prevMonthLabel,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 11),
      desc: "Outward supply details — all sales invoices",
    },
    {
      type: "GSTR-3B",
      period: prevMonthLabel,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
      desc: "Summary return — tax liability and ITC",
    },
  ];
}

const returnStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  SUBMITTED: "outline",
  FILED: "default",
  ERROR: "destructive",
};

export default function GstReturnsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [jsonPreview, setJsonPreview] = useState<object | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const periods = getAvailablePeriods();
  const filingDates = getFilingDates();

  const pastReturns = trpc.gstReturn.listByPeriod.useQuery({
    page: 1,
    pageSize: 20,
  });

  const generateGstr1 = trpc.gstReturn.generateGstr1.useMutation({
    onSuccess: (data) => {
      toast.success(
        `GSTR-1 generated for ${data.period} (${data.invoiceCount} invoices)`
      );
      setJsonPreview(data.payload);
      setPreviewTitle(`GSTR-1 — ${data.period}`);
      pastReturns.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateGstr3b = trpc.gstReturn.generateGstr3b.useMutation({
    onSuccess: (data) => {
      toast.success(`GSTR-3B generated for ${data.period}`);
      setJsonPreview(data.payload);
      setPreviewTitle(`GSTR-3B — ${data.period}`);
      pastReturns.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleCopyJson() {
    if (jsonPreview) {
      navigator.clipboard.writeText(JSON.stringify(jsonPreview, null, 2));
      toast.success("JSON copied to clipboard");
    }
  }

  function handleDownloadJson() {
    if (jsonPreview) {
      const blob = new Blob([JSON.stringify(jsonPreview, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${previewTitle.replace(/\s+/g, "_").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Returns</h1>
        <p className="text-muted-foreground text-sm">
          Generate and manage GSTR-1 and GSTR-3B returns
        </p>
      </div>

      {/* Filing Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Filing Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filingDates.map((filing, idx) => {
              const now = new Date();
              const isOverdue = now > filing.dueDate;
              const daysLeft = Math.ceil(
                (filing.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={idx}
                  className="border rounded-lg p-4 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{filing.type}</span>
                      <Badge
                        variant={isOverdue ? "destructive" : "secondary"}
                      >
                        {isOverdue
                          ? "Overdue"
                          : `${daysLeft} days left`}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filing.period}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {filing.desc}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due:{" "}
                      {filing.dueDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Generate Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Return</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-64">
              <Select
                value={selectedPeriod}
                onValueChange={(val) => val && setSelectedPeriod(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  selectedPeriod &&
                  generateGstr1.mutate({ period: selectedPeriod })
                }
                disabled={!selectedPeriod || generateGstr1.isPending}
              >
                {generateGstr1.isPending
                  ? "Generating..."
                  : "Generate GSTR-1"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  selectedPeriod &&
                  generateGstr3b.mutate({ period: selectedPeriod })
                }
                disabled={!selectedPeriod || generateGstr3b.isPending}
              >
                {generateGstr3b.isPending
                  ? "Generating..."
                  : "Generate GSTR-3B"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Select a period and generate the return JSON from your invoice data.
            You can download the JSON to upload to the GST portal.
          </p>
        </CardContent>
      </Card>

      {/* JSON Preview */}
      {jsonPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{previewTitle}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyJson}>
                  Copy JSON
                </Button>
                <Button size="sm" onClick={handleDownloadJson}>
                  Download JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-auto max-h-96 font-mono">
              {JSON.stringify(jsonPreview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Past Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {pastReturns.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : pastReturns.data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No returns generated yet. Select a period above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {pastReturns.data?.items.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {r.returnType}
                      </span>
                      <Badge
                        variant={
                          returnStatusVariant[r.status] ?? "secondary"
                        }
                        className="text-xs"
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period: {r.period}
                      {r.arn ? ` — ARN: ${r.arn}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
