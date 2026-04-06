import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateInvoiceHtml,
  getInvoiceDataForPdf,
} from "@/lib/pdf-generator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const s = session as unknown as Record<string, unknown>;
  const orgId = (s.orgId as string) ?? "";
  const { id } = await params;

  const data = await getInvoiceDataForPdf(id, orgId);
  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const html = generateInvoiceHtml(data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
