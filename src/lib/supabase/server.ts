import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { ProductionRepositoryConfig } from "@/repositories/repository-config";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function asCookieAdapter(store: CookieStore) {
  return {
    get(name: string) {
      return store.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      try {
        store.set({ name, value, ...options });
      } catch {
        // Server Components may not mutate cookies; session refresh happens in Route Handlers / Proxy.
      }
    },
    remove(name: string, options: CookieOptions) {
      try {
        store.set({ name, value: "", ...options, maxAge: 0 });
      } catch {
        // Same as set — ignore when cookies are read-only in RSC.
      }
    },
  };
}

/**
 * Cookie-bound Supabase server client for the authenticated user JWT.
 * Never uses a privileged/service role key. Never for browser bundles.
 */
export async function createSupabaseServerClient(
  config: ProductionRepositoryConfig,
): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: asCookieAdapter(store),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Stateless user-JWT client for injected access tokens (tests / explicit transport).
 * Still publishable-key only — never privileged credentials.
 */
export function createSupabaseUserClient(
  config: ProductionRepositoryConfig,
  accessToken: string,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
