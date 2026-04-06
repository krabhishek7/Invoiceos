import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "GST-Compliant Invoices",
    desc: "Auto-calculate CGST, SGST, IGST with HSN code lookup. Generate professional PDFs with QR codes.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Auto-File GSTR-1 & 3B",
    desc: "One-click GSTR-1 JSON generation. Auto-aggregate for GSTR-3B. Never miss a filing deadline.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: "e-Invoice (IRN)",
    desc: "Generate IRN via IRP integration. Signed QR codes embedded automatically in invoice PDFs.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    ),
  },
  {
    title: "GSTR-2A Reconciliation",
    desc: "Fetch supplier data from GSTN. Three-way matching. Flag ITC at risk before you file.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
      </svg>
    ),
  },
  {
    title: "UPI Payment Links",
    desc: "Embed Razorpay UPI payment links in invoices. Get paid faster with one-click payments.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
  {
    title: "Tally Integration",
    desc: "Import and export Tally XML. Sync invoices seamlessly between InvoiceOS and Tally Prime.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For small shops & freelancers",
    features: [
      "50 invoices / month",
      "1 GSTIN",
      "PDF invoices with QR",
      "Customer management",
    ],
  },
  {
    name: "Growth",
    price: "₹999",
    period: "/mo",
    desc: "For growing businesses",
    popular: true,
    features: [
      "500 invoices / month",
      "3 GSTINs",
      "GSTR-1 & 3B auto-filing",
      "e-Invoice (IRN)",
      "GSTR-2A reconciliation",
      "WhatsApp notifications",
      "UPI payment links",
    ],
  },
  {
    name: "Pro",
    price: "₹2,999",
    period: "/mo",
    desc: "For large businesses & CAs",
    features: [
      "Unlimited invoices",
      "Unlimited GSTINs",
      "Everything in Growth",
      "Tally import / export",
      "Multi-org CA portal",
      "Priority support",
      "Custom branding",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 shadow-sm">
              <span className="text-[11px] font-bold leading-none text-white">IO</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
              InvoiceOS
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-neutral-900 hover:bg-black text-white shadow-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-900 animate-pulse" />
            <span className="text-neutral-700 font-medium">GSTR-1 auto-filing now available</span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            GST invoicing on{" "}
            <span className="bg-gradient-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent">
              autopilot
            </span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-neutral-500 sm:text-lg">
            Generate GST-compliant invoices, auto-file returns, create
            e-Invoices, and collect payments via UPI — built for Indian
            MSMEs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="h-11 px-8 text-sm bg-neutral-900 hover:bg-black text-white shadow-md shadow-neutral-900/10">
                Start free trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-11 px-8 text-sm text-neutral-600 border-neutral-200 hover:bg-neutral-50">
              Watch demo
            </Button>
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            No credit card required &middot; 14-day free trial on all plans
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 bg-neutral-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Everything you need for GST compliance
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              From invoice generation to return filing — one platform,
              zero hassle.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-neutral-200/80 bg-white p-6 transition-all hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-900/5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-neutral-900 shadow-xl shadow-neutral-900/5 ring-1 ring-neutral-900"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <h3 className={`text-sm font-medium ${plan.popular ? "text-neutral-900" : "text-neutral-500"}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold tracking-tight text-neutral-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="ml-1 text-sm text-neutral-400">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">{plan.desc}</p>
                </div>
                <Link href="/register" className="mt-6">
                  <Button
                    className="w-full h-10"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Get started
                  </Button>
                </Link>
                <ul className="mt-6 flex-1 space-y-3 border-t border-neutral-100 pt-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm text-neutral-600"
                    >
                      <svg
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.popular ? "text-neutral-900" : "text-neutral-400"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 bg-gradient-to-b from-neutral-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Ready to simplify your GST workflow?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-neutral-500">
            Join thousands of Indian businesses using InvoiceOS to save
            hours on invoicing and compliance every month.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" className="h-12 px-8 text-base bg-neutral-900 hover:bg-black text-white shadow-lg shadow-neutral-900/10">
              Start your free trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-900">
              <span className="text-[8px] font-bold text-white">IO</span>
            </div>
            <span className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} InvoiceOS
            </span>
          </div>
          <p className="text-sm text-neutral-500">Built for Indian MSMEs</p>
        </div>
      </footer>
    </div>
  );
}
