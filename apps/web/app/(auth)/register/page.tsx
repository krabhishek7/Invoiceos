"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
    gstin: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();

  const register = trpc.organization.register.useMutation({
    onSuccess: async () => {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!result?.error) {
        router.push("/dashboard");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    register.mutate({
      ...form,
      gstin: form.gstin || undefined,
    });
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-neutral-950 p-12 lg:flex relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-neutral-500 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-neutral-400 blur-[100px]" />
        </div>

        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm">
            <span className="text-[12px] font-bold text-neutral-900">IO</span>
          </div>
          <span className="text-[17px] font-semibold text-white tracking-tight">InvoiceOS</span>
        </Link>
        <div className="relative z-10">
          <p className="text-3xl font-bold leading-tight text-white">
            Start invoicing in under <span className="text-neutral-400">2 minutes.</span>
          </p>
          <p className="mt-4 text-base text-neutral-400 max-w-md leading-relaxed">
            Create your account, add your GSTIN, and send your first
            GST-compliant invoice today. Free forever for small businesses.
          </p>
        </div>
        <p className="text-sm text-neutral-500 relative z-10">
          &copy; {new Date().getFullYear()} InvoiceOS Inc.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 shadow-sm shadow-neutral-900/10">
                <span className="text-[12px] font-bold text-white">IO</span>
              </div>
              <span className="text-[17px] font-semibold text-neutral-900 tracking-tight">InvoiceOS</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Free plan includes 50 invoices/month
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-neutral-700">
                  Your name
                </Label>
                <Input
                  id="name"
                  placeholder="Rajesh Kumar"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-sm font-medium text-neutral-700">
                  Business name
                </Label>
                <Input
                  id="orgName"
                  placeholder="Kumar Traders"
                  value={form.orgName}
                  onChange={(e) => updateField("orgName", e.target.value)}
                  required
                  className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="rajesh@business.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
                className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin" className="text-sm font-medium text-neutral-700">
                GSTIN{" "}
                <span className="font-normal text-neutral-400">(optional)</span>
              </Label>
              <Input
                id="gstin"
                placeholder="27AABCU9603R1ZM"
                value={form.gstin}
                onChange={(e) =>
                  updateField("gstin", e.target.value.toUpperCase())
                }
                maxLength={15}
                className="h-11 font-mono bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900 uppercase"
              />
              <p className="text-xs text-neutral-500">
                You can add this later in settings
              </p>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-neutral-900 hover:bg-black text-white shadow-sm"
              disabled={register.isPending}
            >
              {register.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-neutral-900 hover:text-black hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
