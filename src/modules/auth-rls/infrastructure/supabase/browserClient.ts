// Browser (Client Component) Supabase client. `createBrowserClient` is internally
// memoized by @supabase/ssr, so calling this repeatedly across components is cheap.
import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
