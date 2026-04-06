"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";

export default function BillingPage() {
  const { data: currentPlan, isLoading: planLoading } =
    trpc.billing.getCurrentPlan.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();

  const createSub = trpc.billing.createSubscription.useMutation({
    onSuccess: (data) => {
      window.open(data.subscriptionUrl, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelSub = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled. You are now on the Starter plan.");
      window.location.reload();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground text-sm">
            Manage your subscription and usage
          </p>
        </div>
        <Link href="/settings">
          <Button variant="ghost">Back to Settings</Button>
        </Link>
      </div>

      {planLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge>{currentPlan?.tier}</Badge>
                <Badge
                  variant={
                    currentPlan?.status === "ACTIVE"
                      ? "default"
                      : "destructive"
                  }
                >
                  {currentPlan?.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    Invoices this month: {currentPlan?.invoicesUsed} /{" "}
                    {currentPlan?.invoiceLimit === Infinity
                      ? "Unlimited"
                      : currentPlan?.invoiceLimit}
                  </span>
                  <span>{currentPlan?.usagePercent}%</span>
                </div>
                <Progress
                  value={Math.min(currentPlan?.usagePercent ?? 0, 100)}
                />
              </div>

              {currentPlan?.hasSubscription && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        "Cancel your subscription? You'll be downgraded to the Starter plan."
                      )
                    ) {
                      cancelSub.mutate();
                    }
                  }}
                  disabled={cancelSub.isPending}
                >
                  Cancel Subscription
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            {plans?.map((plan) => (
              <Card
                key={plan.tier}
                className={
                  plan.tier === currentPlan?.tier
                    ? "border-primary ring-1 ring-primary"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.tier === currentPlan?.tier && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {plan.monthlyPriceFormatted}
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">&#10003;</span>
                      {plan.limits.maxInvoicesPerMonth === Infinity
                        ? "Unlimited invoices"
                        : `${plan.limits.maxInvoicesPerMonth} invoices/month`}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">&#10003;</span>
                      {plan.limits.maxCustomers === Infinity
                        ? "Unlimited customers"
                        : `${plan.limits.maxCustomers} customers`}
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.eInvoiceAccess
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.eInvoiceAccess ? "✓" : "✗"}
                      </span>
                      e-Invoice (IRN)
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.gstFilingAccess
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.gstFilingAccess ? "✓" : "✗"}
                      </span>
                      GST Filing
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.reconciliationAccess
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.reconciliationAccess ? "✓" : "✗"}
                      </span>
                      Reconciliation
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.tallyIntegration
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.tallyIntegration ? "✓" : "✗"}
                      </span>
                      Tally Integration
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.whatsappNotifications
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.whatsappNotifications ? "✓" : "✗"}
                      </span>
                      WhatsApp Notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={
                          plan.limits.prioritySupport
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      >
                        {plan.limits.prioritySupport ? "✓" : "✗"}
                      </span>
                      Priority Support
                    </li>
                  </ul>

                  {plan.tier !== currentPlan?.tier && plan.tier !== "STARTER" && (
                    <Button
                      className="w-full"
                      onClick={() =>
                        createSub.mutate({
                          planTier: plan.tier as "GROWTH" | "PRO",
                        })
                      }
                      disabled={createSub.isPending}
                    >
                      {createSub.isPending ? "Processing..." : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
