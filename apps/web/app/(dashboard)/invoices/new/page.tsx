import { InvoiceForm } from "@/components/invoice/invoice-form";

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Invoice</h1>
        <p className="text-muted-foreground text-sm">
          Fill in the details to generate a GST-compliant invoice
        </p>
      </div>
      <InvoiceForm />
    </div>
  );
}
