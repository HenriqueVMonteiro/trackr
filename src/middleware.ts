import type { NextRequest } from "next/server";

// Import the leaf interface file directly (NOT the module barrel): the barrel
// transitively pulls in `next/headers` via the server client, which is not
// available in the edge middleware runtime. This file is edge-safe.
import { updateSession } from "@/modules/auth-rls/interface/middleware";

// Root Next.js middleware: delegates to the auth-rls module's session-refresh
// helper so server and browser stay in sync on every matched request.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all paths except Next internals and static image assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
