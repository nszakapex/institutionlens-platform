import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Clears Supabase SSR session cookies. Safe no-op outside live modes. */
export async function POST() {
  let env;
  try {
    env = loadServerEnv();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!isLiveAppMode(env.IL_APP_MODE) || !("IL_SUPABASE_URL" in env)) {
    return NextResponse.json({ ok: true }, { status: 200 });
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

  await supabase.auth.signOut();
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
