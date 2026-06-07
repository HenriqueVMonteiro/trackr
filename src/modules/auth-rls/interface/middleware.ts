import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "../infrastructure/supabase/env";

// Next.js middleware helper: refreshes the Supabase auth token on every request
// and propagates the refreshed cookies onto the response.
//
// Scope note (B1): route-level protection (redirecting anonymous users to /login)
// is wired here as a minimal guard — only the request gets refreshed and, if
// there is no user and the path is protected, we redirect to /login. Full route
// policy / public-path config is refined in B11.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // SECURITY: getUser() revalidates the token with Supabase Auth. Never use
  // getSession() here — it trusts the (spoofable) cookie. Do NOT run code between
  // createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" || path.startsWith("/login") || path.startsWith("/auth");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Return the EXACT supabaseResponse so refreshed auth cookies are not dropped.
  return supabaseResponse;
}
