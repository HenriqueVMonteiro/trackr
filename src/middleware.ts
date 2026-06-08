import { NextResponse, type NextRequest } from "next/server";

// Import the leaf interface file directly (NOT the module barrel): the barrel
// transitively pulls in `next/headers` via the server client, which is not
// available in the edge middleware runtime. This file is edge-safe.
import { updateSession } from "@/modules/auth-rls/interface/middleware";

// Demo paths that are public and never need a Supabase session refresh
// (the demo UI built in A15 ships with mock fixtures so the visual layer
// works without DATABASE_URL / Supabase env). The auth-rls module remains
// the source of truth for real-auth flows when Supabase is configured.
const DEMO_PUBLIC_PREFIXES = ["/register", "/trackr"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (DEMO_PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  // Run on all paths except Next internals and static image assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
