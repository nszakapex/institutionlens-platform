import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";

/**
 * Next.js 16 network boundary (formerly middleware).
 * Applies security headers and a nonce-based CSP for HTML routes.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy({ nonce });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", csp);

  for (const header of buildSecurityHeaders({ includeContentSecurityPolicy: false })) {
    response.headers.set(header.key, header.value);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
    },
  ],
};
