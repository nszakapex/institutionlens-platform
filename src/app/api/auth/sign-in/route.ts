import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-only password sign-in for live modes.
 * Sets Supabase SSR session cookies; never returns tokens or user identifiers.
 */
export async function POST(request: Request) {
  let env;
  try {
    env = loadServerEnv();
  } catch {
    return NextResponse.json({ ok: false, error: "configuration_unavailable" }, { status: 503 });
  }

  if (!isLiveAppMode(env.IL_APP_MODE) || !("IL_SUPABASE_URL" in env)) {
    return NextResponse.json({ ok: false, error: "sign_in_unavailable" }, { status: 403 });
  }

  let email = "";
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { email?: unknown; password?: unknown };
      email = typeof body.email === "string" ? body.email.trim() : "";
      password = typeof body.password === "string" ? body.password : "";
    } else {
      const form = await request.formData();
      email = String(form.get("email") ?? "").trim();
      password = String(form.get("password") ?? "");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.IL_SUPABASE_URL, env.IL_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ ok: false, error: "authentication_failed" }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
