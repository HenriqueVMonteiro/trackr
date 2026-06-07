# ADR-0004 — Supabase Auth vs NextAuth vs Lucia

- **Status:** Accepted
- **Data:** 2026-06-07
- **Stint:** B1 (`agent-b/B01-supabase-auth`)
- **Autor:** Agente B
- **Atributos de qualidade (ISO/IEC 25010):** Segurança → Manutenibilidade → Confiabilidade

## Contexto

Trackr precisa de autenticação email/senha e de **isolamento multi-tenant**
garantido: nenhum usuário pode ler/escrever dados de um workspace ao qual não
pertence. A stack já está fixada — Postgres no **Supabase**, Drizzle ORM, Next.js
15 (App Router), TypeScript estrito. A escolha da biblioteca de autenticação
precisa: (a) integrar com sessões SSR do App Router; (b) permitir impor o
isolamento no **banco** (não só na aplicação); (c) manter o domínio puro e testável.

Três candidatos foram avaliados: **Supabase Auth**, **NextAuth.js (Auth.js)** e
**Lucia**.

## Decisão

Adotar **Supabase Auth** (via `@supabase/ssr`) como provedor de autenticação, e
usar **Row-Level Security (RLS) do Postgres** como a fronteira de autorização
multi-tenant **primária e default-deny**. O `auth.uid()` exposto pelo Supabase nas
policies é o elo que liga a sessão autenticada às linhas que ela pode ver.

A integração é encapsulada atrás de uma port `AuthProvider` (DIP): o domínio e a
aplicação não conhecem o Supabase; o adapter `SupabaseAuthProvider` é a única peça
que importa o SDK. Trocar de provedor no futuro é reimplementar a port.

## Justificativa

- **Segurança / isolamento no banco** — Supabase Auth emite um JWT cujo
  `auth.uid()` é diretamente consumível por policies RLS. Isso permite impor a
  tenancy **no Postgres**, default-deny: uma tabela com RLS e sem policy que case
  retorna zero linhas. NextAuth e Lucia gerenciam sessão na aplicação, mas **não
  fornecem** essa ponte nativa para RLS — o isolamento dependeria de cada query
  aplicar o filtro certo (falha aberta). `getUser()` revalida o token contra o
  Supabase (anti-spoofing de cookie).
- **Manutenibilidade** — menos código próprio: o Supabase cuida de hashing,
  verificação de email, reset de senha e refresh de token. `@supabase/ssr` já traz
  os três clientes SSR (browser/server/middleware) que o App Router exige. A port
  `AuthProvider` mantém o domínio puro (zero import de Supabase em `domain/`/`application/`).
- **Confiabilidade** — RLS é defense-in-depth: somado às invariantes de domínio, um
  bug de adapter no caminho user-scoped ainda não vaza dados de outro tenant.

## Alternativas consideradas

| Alternativa | Por que rejeitada |
|---|---|
| **NextAuth.js (Auth.js)** | Excelente para federação OAuth e flexível em providers, mas a sessão é da aplicação e **não há ponte nativa para RLS do Postgres** — o isolamento multi-tenant voltaria a depender de filtros manuais em cada query (falha aberta). Exigiria um adapter de banco e mais fiação para chegar perto da garantia que o RLS dá de graça com Supabase. |
| **Lucia** | Biblioteca enxuta e com ótimo controle, porém transfere para nós a gestão de sessões/tabelas e, como NextAuth, não integra com `auth.uid()`/RLS. Além disso o projeto Lucia anunciou (2025) deprecação como biblioteca, migrando para material de aprendizado — risco de manutenção para um trabalho que vale "histórico coerente". |
| **App-layer-only (qualquer lib, sem RLS)** | Depende de cada repositório aplicar o filtro de tenant; um `WHERE` esquecido vaza dados, sem backstop no banco. Contraria os atributos priorizados. |
| **`service_role` para tudo + checagens manuais** | `service_role` tem `BYPASSRLS`; ignora todas as policies. Confinamos `service_role` a adapters admin server-only auditados e tornamos o caminho `authenticated`/RLS o padrão. |

## Consequências

### Positivas

- Isolamento multi-tenant imposto **uma vez**, no banco (`drizzle/sql/policies/`),
  e não burlável por um adapter que esqueça um filtro.
- Domínio/aplicação sem imports de Supabase → invariantes testáveis sem banco
  (ver `*.test.ts` do módulo) e fronteiras hexagonais intactas.
- Menos superfície de código de auth próprio (hashing, refresh, reset) para manter.
- `getCurrentUser()` chamável de Server Components retornando `UserContext | null`.

### Negativas

- Acoplamento ao Supabase como provedor (mitigado pela port `AuthProvider`).
- Autorização existe em dois lugares (RLS SQL + invariantes de domínio) e precisa
  ser mantida consistente.
- Policies RLS são SQL cru fora do sistema de tipos do Drizzle (corretude por
  review + teste de integração no B12).
- Toda query do caminho-de-request precisa rodar como `authenticated` com o JWT
  injetado para o RLS valer; o adapter `service_role` (`BYPASSRLS`) fica restrito a
  uso server-only auditado.

## Implementação (B1)

- `src/modules/auth-rls/domain/{Email,UserId,UserContext}.ts` — Value Objects (Result).
- `src/modules/auth-rls/application/ports/AuthProvider.ts` — port (`// SOLID: DIP`).
- `src/modules/auth-rls/application/use-cases/{SignIn,SignUp,SignOut,GetCurrentUser}.ts`.
- `src/modules/auth-rls/infrastructure/SupabaseAuthProvider.ts` — adapter (`// ADR-0004`, GoF: Adapter).
- `src/modules/auth-rls/infrastructure/supabase/{browserClient,serverClient,env}.ts`.
- `src/modules/auth-rls/interface/{middleware,getCurrentUser}.ts` + `src/middleware.ts`.
- `src/app/(client)/login/` — página `/login` funcional (Server Actions).
- `drizzle/sql/policies/*.sql` — RLS + trigger de sync `auth.users → public.users`.

## Referências

- Supabase — Server-Side Auth (Next.js): <https://supabase.com/docs/guides/auth/server-side/nextjs>
- Supabase — Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase — RLS performance & best practices: <https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv>
- NextAuth.js / Auth.js: <https://authjs.dev>
- Lucia (deprecation notice): <https://lucia-auth.com>
