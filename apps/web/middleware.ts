import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth", "/invite"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isApiTrpc = pathname.startsWith("/api/trpc");
  const isApiWebhook = pathname.startsWith("/api/webhooks");
  const isApiPayment = pathname.startsWith("/api/payments");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isApiTrpc || isApiWebhook || isApiPayment || isStaticAsset) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Landing page: "/" — show to unauthenticated, redirect authenticated to dashboard
  if (pathname === "/") {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
