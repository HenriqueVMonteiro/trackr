// Strict-mode env access for the Supabase clients. process.env[name] is
// `string | undefined`; validate and narrow to `string` here so no `!`,
// `as string`, or `any` is needed downstream. Lazy getters: importing this
// module must NOT throw — the throw only fires when a client is constructed
// (request time), never during typecheck/lint/unit tests.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
