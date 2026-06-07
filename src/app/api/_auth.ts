import type { NextRequest, NextResponse } from "next/server";
import { unauthorizedProblem } from "./_problem";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

// PLACEHOLDER — replaced by SupabaseAuthProvider integration in stint B1.
// For now, the route handlers accept either:
//  - a valid Supabase JWT in Authorization (when B1 wires it up), or
//  - a dev-mode X-Trackr-Test-User header carrying a UUID
// to unblock local testing and unit/integration tests without spinning
// up Supabase locally for every test.
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const testUser = request.headers.get("x-trackr-test-user");
  if (testUser && /^[0-9a-f-]{36}$/i.test(testUser)) {
    return {
      ok: true,
      user: { id: testUser, email: `dev+${testUser.slice(0, 8)}@trackr.local` },
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // TODO(B1): validate JWT via SupabaseAuthProvider injected from bootstrap
    return { ok: false, response: unauthorizedProblem("Bearer validation not yet wired") };
  }

  return { ok: false, response: unauthorizedProblem() };
}
