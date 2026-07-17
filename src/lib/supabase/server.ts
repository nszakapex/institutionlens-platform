import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { ProductionRepositoryConfig } from "@/repositories/repository-config";

/**
 * Cookie-bound Supabase server client for the authenticated user JWT.
 * Never uses a privileged/service role key. Never for browser bundles.
 */
export async function createSupabaseServerClient(
  config: ProductionRepositoryConfig,
): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components may not mutate cookies; session refresh happens in Proxy / Route Handlers.
        }
      },
    },
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
