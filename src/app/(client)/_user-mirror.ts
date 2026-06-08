import type { Database } from "@/infrastructure/db/client";
import { users } from "@/infrastructure/db/schema";

interface AuthenticatedUser {
  readonly id: { readonly value: string };
  readonly email: { readonly value: string };
  readonly name: string | null;
}

export async function ensureUserMirror(
  db: Pick<Database, "insert">,
  user: AuthenticatedUser,
): Promise<void> {
  const email = user.email.value;
  const name = user.name ?? email.split("@", 1)[0] ?? "Trackr user";

  await db
    .insert(users)
    .values({
      id: user.id.value,
      email,
      name,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        name,
      },
    });
}
