import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";

/**
 * Next.js 16 network boundary (formerly middleware).
 * Applies security headers, nonce CSP, and refreshes Supabase Auth cookies in live modes.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy({ nonce });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  try {
    const env = loadServerEnv();
    if (
      isLiveAppMode(env.IL_APP_MODE) &&
      "IL_SUPABASE_URL" in env &&
      "IL_SUPABASE_PUBLISHABLE_KEY" in env
    ) {
      const supabase = createServerClient(env.IL_SUPABASE_URL, env.IL_SUPABASE_PUBLISHABLE_KEY, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      // Touches the session so expired access tokens refresh into response cookies.
      await supabase.auth.getUser();
    }
  } catch {
    // Fail closed at page/data layer; proxy must still apply security headers.
  }

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
