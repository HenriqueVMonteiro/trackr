// Server Supabase client for Server Components, Route Handlers, and Server Actions.
// `cookies()` is async in Next.js 15 and MUST be awaited. Uses the getAll/setAll
// cookie API. With @supabase/ssr@0.5.2 (installed) `setAll` is single-argument.
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "./env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, which cannot mutate cookies. Safe to
          // ignore because the middleware refreshes the session every request.
        }
      },
    },
  });
}
