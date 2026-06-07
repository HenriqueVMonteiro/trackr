import { getCurrentUser } from "@/modules/auth-rls";

import { signInAction, signUpAction, signOutAction } from "./actions";

// Minimal but functional login page (B1 acceptance criterion). Styling/polish and
// the full client workspace shell land in B11. It is a Server Component: it reads
// the current user via getCurrentUser() and posts to Server Actions — no client JS.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const { error } = await searchParams;

  if (user) {
    return (
      <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1.5rem" }}>
        <h1>Trackr</h1>
        <p>
          Signed in as <strong>{user.email.value}</strong>
          {user.name ? ` (${user.name})` : ""}.
        </p>
        <form action={signOutAction}>
          <button type="submit">Sign out</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1.5rem" }}>
      <h1>Sign in to Trackr</h1>
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}
      <form style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Name (sign up only)
          <input name="name" type="text" autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" formAction={signInAction}>
            Sign in
          </button>
          <button type="submit" formAction={signUpAction}>
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
