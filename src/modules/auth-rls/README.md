# `auth-rls` — Authentication & Row-Level Security

Supabase email/password authentication + database-level multi-tenant isolation.
See [ADR-0004](../../../adrs/0004-supabase-auth-vs-nextauth-lucia.md).

## Layers

```
auth-rls/
├── domain/                      # pure Value Objects + auth errors (Result, no framework)
│   ├── Email.ts  UserId.ts  UserContext.ts  errors.ts
├── application/
│   ├── ports/AuthProvider.ts    # abstraction (SOLID: DIP, ISP)
│   └── use-cases/               # SignIn, SignUp, SignOut, GetCurrentUser (Result)
├── infrastructure/
│   ├── SupabaseAuthProvider.ts  # GoF: Adapter, // ADR-0004
│   └── supabase/                # browser/server SSR clients + strict env access
├── interface/
│   ├── middleware.ts            # updateSession() — Next.js session refresh
│   └── getCurrentUser.ts        # Server-Component helper -> UserContext | null
└── index.ts                     # barrel + createAuthRlsModule(deps)
```

RLS SQL lives in [`drizzle/sql/policies/`](../../../drizzle/sql/policies/) (raw SQL
is the source of truth). The root `src/middleware.ts` delegates to
`interface/middleware.ts`. The `/login` page is in `src/app/(client)/login/`.

## Public API

```ts
import { getCurrentUser, createAuthRlsModule } from "@/modules/auth-rls";

const user = await getCurrentUser();          // UserContext | null (Server Component)
const auth = createAuthRlsModule();           // DI factory (inject a fake in tests)
const result = await auth.signIn.execute({ email, password }); // Result<UserContext, …>
```

## Patterns evidenced

- **GoF: Adapter** — `SupabaseAuthProvider` adapts the Supabase SDK to the port.
- **GoF: Factory** — `createAuthRlsModule(deps)` composes adapters (no singletons).
- **SOLID: DIP/ISP** — use cases depend on the `AuthProvider` port, not Supabase.
- **SOLID: SRP/LSP** — VOs own their invariants; any `AuthProvider` is substitutable
  (real adapter ↔ test fake).
- **Result pattern** — VO factories and use cases return `Result<T, DomainError>`.

## Acceptance (B1)

- ✅ `/login` page functional (sign in / sign up / sign out via Server Actions).
- ✅ `getCurrentUser()` returns `UserContext | null` from a Server Component.
- ✅ RLS policies block cross-workspace access (SQL in `drizzle/sql/policies/`;
  live integration test runs in **B12**).
- ✅ `npm run lint && npm run typecheck && npm run test` green.

## Env

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe);
`SUPABASE_SERVICE_ROLE_KEY` (server-only, `BYPASSRLS` — admin adapters only);
`DATABASE_URL` (Drizzle). See `.env.example`.
