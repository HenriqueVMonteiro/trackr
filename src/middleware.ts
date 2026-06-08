import { NextResponse, type NextRequest } from "next/server";

// Import the leaf interface file directly (NOT the module barrel): the barrel
// transitively pulls in `next/headers` via the server client, which is not
// available in the edge middleware runtime. This file is edge-safe.
import { updateSession } from "@/modules/auth-rls/interface/middleware";

const DEMO_PUBLIC_EXACT_PATHS = ["/"];
const DEMO_PUBLIC_PREFIXES = ["/register"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (DEMO_PUBLIC_EXACT_PATHS.includes(path)) {
    return NextResponse.next();
  }
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
