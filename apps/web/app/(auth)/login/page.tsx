"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
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
            GST invoicing on <span className="text-neutral-400">autopilot.</span>
          </p>
          <p className="mt-4 text-base text-neutral-400 max-w-md leading-relaxed">
            Generate compliant invoices, auto-file returns, and get paid
            faster — all in one place. Built specifically for Indian MSMEs.
          </p>
        </div>
        <p className="text-sm text-neutral-500 relative z-10">
          &copy; {new Date().getFullYear()} InvoiceOS Inc.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 sm:px-12 bg-white">
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
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <Link href="#" className="text-xs font-medium text-neutral-600 hover:text-neutral-900">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900"
              />
            </div>
            <Button type="submit" className="h-11 w-full bg-neutral-900 hover:bg-black text-white shadow-sm" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-neutral-900 hover:text-black hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
