import type { UserContext } from "../domain/UserContext";
import { GetCurrentUser } from "../application/use-cases/GetCurrentUser";
import { SupabaseAuthProvider } from "../infrastructure/SupabaseAuthProvider";

// Server-side convenience for Server Components / Server Actions:
//   const user = await getCurrentUser(); // UserContext | null
// Composes the use case with the Supabase adapter directly (no module-barrel
// import) to avoid an index <-> interface import cycle.
export async function getCurrentUser(): Promise<UserContext | null> {
  return new GetCurrentUser(new SupabaseAuthProvider()).execute();
}
