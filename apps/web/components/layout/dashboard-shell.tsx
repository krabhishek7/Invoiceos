"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/gst-returns", label: "GST Returns" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/credit-notes", label: "Credit Notes" },
  { href: "/settings", label: "Settings" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const s = session as Record<string, unknown> | null;

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 shadow-sm shadow-neutral-900/10 dark:bg-white">
                <span className="text-[11px] font-bold leading-none text-white dark:text-neutral-900">
                  IO
                </span>
              </div>
              <span className="hidden text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-white sm:inline">
                InvoiceOS
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`rounded-md px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                        isActive
                          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] font-medium text-neutral-500 md:inline">
              {s?.orgName as string}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-full p-0 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8 border border-neutral-200 dark:border-neutral-700">
                  <AvatarFallback className="bg-neutral-100 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg">
                <div className="px-2.5 py-2">
                  <p className="text-[14px] font-semibold text-neutral-900 dark:text-white">{session?.user?.name}</p>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem className="rounded-md px-2.5 py-2 text-[13px] cursor-pointer">
                  <Link href="/settings" className="w-full">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-md px-2.5 py-2 text-[13px] cursor-pointer">
                  <Link href="/settings/team" className="w-full">Team</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-md px-2.5 py-2 text-[13px] cursor-pointer">
                  <Link href="/settings/billing" className="w-full">Billing</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  className="rounded-md px-2.5 py-2 text-[13px] cursor-pointer"
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                >
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  className="rounded-md px-2.5 py-2 text-[13px] font-medium text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
