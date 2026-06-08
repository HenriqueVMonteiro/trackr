# Trackr

Trackr é um issue tracker modular (estilo Linear / Jira mini) construído como trabalho final da disciplina de PADRÕES E ARQUITETURA DE SOFTWARE: workspaces multi-tenant, projetos, issues com state machine, sub-tasks (Composite), comentários, labels, sprints, webhooks com assinatura e retry, notificações multi-canal, dashboards, busca full-text, time tracking e activity log com snapshots (Memento) — tudo organizado como um monolito modular hexagonal sobre Next.js 15 + TypeScript estrito.

**Grupo 1:** Henrique Vieira Monteiro (RA 20045324) — Agente A · Gabriel Teixeira Costa (RA 20123097) — Agente B.

**170+ testes unitários** verdes no domínio · **9 ADRs** (incluindo uma reversão) · **5+ padrões GoF** demonstrados · **OpenAPI 3.1** gerada do código.

## Stack

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript estrito
- **ORM**: Drizzle
- **Banco**: Postgres (Supabase)
- **Auth**: Supabase Auth + Row Level Security (RLS)
- **Realtime**: Supabase Realtime
- **Cache / Filas**: Upstash Redis + BullMQ
- **E-mail**: Resend · **Web Push**: VAPID
- **Validação**: Zod
- **Testes**: Vitest (unit + integração) + Playwright (E2E)

## Arquitetura

Trackr é um **monolito modular hexagonal**: um único deploy, mas dividido em
*bounded contexts* independentes, cada um seguindo Clean Architecture / Ports &
Adapters. O domínio é puro (sem I/O), a aplicação orquestra via *ports*
(interfaces) e a infraestrutura concretiza esses *ports* com adapters Drizzle /
Supabase / Redis.

```
src/modules/<contexto>/
  domain/           # entidades, value objects, eventos de domínio (puros)
  application/      # use cases, ports (interfaces), DTOs
  infrastructure/   # adapters: drizzle repo, supabase auth, redis, etc.
  interface/        # handlers HTTP + server actions Next.js
  index.ts          # public barrel + createXxxModule (composition root)
```

Cada módulo expõe seus use cases por uma factory `createXxxModule(deps)`. O
*bootstrap* da aplicação (`src/app/_bootstrap.ts`, função `container()`) monta o
cliente de banco (`createDbClient(url)`), o `Clock`, o `IdGenerator` e o
`EventBus`, e liga tudo num único lugar — sem singletons globais.

- Decisões de arquitetura: [`adrs/`](./adrs/)
- Documento final completo (visão, atributos de qualidade, diagramas):
  [`docs/final-document.md`](./docs/final-document.md)

## Pré-requisitos

- **Node.js >= 20.10** (ver `engines` no `package.json`)
- Um projeto **Supabase** (Postgres + Auth) — ou um Postgres descartável para testes
- Uma instância **Redis** (Upstash para cache/filas; um Redis acessível por `REDIS_URL` para o worker BullMQ)

## Instalação

```bash
git clone https://github.com/HenriqueVMonteiro/trackr.git
cd trackr
npm install
cp .env.example .env.local
# edite .env.local (ver seção abaixo)

npm run db:push        # sincroniza o schema Drizzle no Supabase em dev
npm run dev
```

Acesse `http://localhost:3000`.

## Configuração do `.env.local`

Copie `.env.example` para `.env.local` e preencha:

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | String de conexão Postgres. Em produção, use o **pooler do Supabase** (porta `6543`, modo *transaction*). Ex.: `postgres://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima (cliente) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service-role (servidor) — usada pelo relay/outbox; **nunca** expor no cliente |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST do Upstash Redis usado pelo cache |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do Upstash Redis |
| `RESEND_API_KEY` | Chave da API Resend (envio de e-mail) |
| `WEB_PUSH_PUBLIC_KEY` | Chave pública VAPID (Web Push) |
| `WEB_PUSH_PRIVATE_KEY` | Chave privada VAPID (Web Push) |
| `WEB_PUSH_SUBJECT` | Subject VAPID (ex.: `mailto:dev@trackr.local`) |
| `REDIS_URL` | Conexão TCP do Redis usada pelo **worker BullMQ** de webhooks (ex.: `redis://localhost:6379`) |
| `UPSTASH_REDIS_URL` | Alias aceito para a conexão TCP do Upstash Redis (`rediss://...`) usada pelo BullMQ |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação (`http://localhost:3000` em dev) |

> O worker BullMQ (`ioredis`) precisa de uma conexão TCP via `REDIS_URL`,
> separada do `UPSTASH_REDIS_REST_*` (REST) usado pelo cache.

## Banco de dados: RLS e busca full-text

O schema Drizzle cria as **tabelas**. Em desenvolvimento/Supabase free, use
`npm run db:push` para sincronizar o schema diretamente. Em um fluxo com
migrations versionadas, gere e aplique com `npm run db:generate` +
`npm run db:migrate`.

Há SQL que o `drizzle-kit` não diffa de forma confiável e que é aplicado à
parte.

### Políticas RLS (isolamento multi-tenant)

As políticas de Row Level Security vivem em `drizzle/sql/policies/*.sql` e são a
fonte da verdade (ver [ADR-0004](./adrs/0004-supabase-auth-vs-nextauth-lucia.md)
e o [README das policies](./drizzle/sql/policies/README.md)). Aplique-as **depois**
da migration base, em ordem numérica:

```bash
for f in drizzle/sql/policies/[0-9]*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

### Migration de busca full-text (FTS)

A busca usa Postgres FTS (ver [ADR-0008](./adrs/0008-fts-postgres-vs-meilisearch.md)).
Aplique a migration de FTS:

```bash
psql "$DATABASE_URL" -f drizzle/sql/search/0001_issues_fts.sql
```

> As views de dashboard em `drizzle/sql/views/*.sql` seguem a mesma ideia
> (SQL aplicado via `psql`) — veja o README daquela pasta.

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Next.js) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | Linter (ESLint) |
| `npm run typecheck` | Type checking (`tsc --noEmit`) |
| `npm run test` | Testes **unitários** (Vitest) — exclui integração e E2E |
| `npm run test:watch` | Testes unitários em modo watch |
| `npm run test:coverage` | Cobertura dos testes unitários |
| `npm run test:integration` | Testes de **integração** (precisa de `DATABASE_URL`) |
| `npm run db:generate` | Gera migration Drizzle a partir do schema |
| `npm run db:migrate` | Aplica as migrations |
| `npm run db:push` | Empurra o schema direto pro banco (dev) |
| `npm run db:studio` | Drizzle Studio (UI do banco) |
| `npm run openapi:generate` | Gera `openapi/trackr.json` dos schemas Zod |

## Worker de webhooks (BullMQ)

A entrega de webhooks roda em um **processo separado** que consome a fila BullMQ,
assina o payload (`WebhookSigner`, GoF: Strategy/LSP), faz `POST` HTTPS, registra
a tentativa (`RecordAttempt`) e re-enfileira com o backoff da `RetryStrategy` do
endpoint (ver [ADR-0006](./adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md)).

A factory `createWebhookWorker(deps)` em
`src/modules/webhooks/infrastructure/queue/workers/webhook-worker.ts` **não**
auto-executa no import: monte um `WebhooksModule` + uma conexão `ioredis`
(`REDIS_URL`) e chame-a num entrypoint dedicado, rodado como processo à parte
(`tsx <seu-entrypoint>.ts`). Garanta que `REDIS_URL` aponte para o mesmo Redis da
fila.

## Testes

A pirâmide de testes do Trackr tem três camadas, com comandos distintos:

### Unitários — `npm run test`

Domínio puro + primitivas compartilhadas (`src/**/*.test.ts`, `tests/unit/**`).
Rápidos, sem I/O, rodam em qualquer ambiente. É a suíte do dia a dia e a que
gera cobertura (`npm run test:coverage`). A config principal
(`vitest.config.ts`) **exclui** `tests/integration/**` e `tests/e2e/**`.

### Integração — `npm run test:integration`

Round-trips de repositório contra um **Postgres real** (`tests/integration/**`,
config `vitest.integration.config.ts`). Definidos em B12.

- Configure `DATABASE_URL` (ou `DATABASE_URL_TEST`) apontando para um **Postgres
  descartável** — Supabase ou local. **Nunca** aponte para produção.
- **Sem** banco configurado, os casos **pulam de forma limpa** (`it.skip`, via o
  guard `itDb` em `tests/integration/helpers.ts`) em vez de falhar — então o
  comando é seguro de rodar mesmo sem credenciais.

```bash
DATABASE_URL_TEST=postgres://... npm run test:integration
```

### E2E — Playwright

Fluxo crítico fim-a-fim (`tests/e2e/**`, config `playwright.config.ts`):
login → criar workspace → projeto → issue → transicionar
`backlog → todo → doing → review → done` → verificar o activity log.

Requer **app rodando** e **auth semeada** — o Playwright **não** sobe a aplicação
(não há `webServer` na config):

```bash
npx playwright install   # uma vez (baixa o Chromium)
npm run dev              # em outro terminal — app em NEXT_PUBLIC_APP_URL
npx playwright test
```

## Documentação

- [`docs/final-document.md`](./docs/final-document.md) — Documento final completo do sistema
- [`docs/superpowers/specs/2026-06-07-trackr-design.md`](./docs/superpowers/specs/2026-06-07-trackr-design.md) — Design spec detalhado
- [`HANDOFF.md`](./HANDOFF.md) — Contrato entre os dois agentes paralelos
- [`adrs/`](./adrs/) — Architecture Decision Records
- [`diagrams/`](./diagrams/) — Diagramas C4, classes e sequência (PlantUML)
- [`openapi/trackr.json`](./openapi/) — Especificação REST (gerada do código)

## Estrutura de pastas

```
trackr/
├── adrs/                    # Architecture Decision Records
├── diagrams/                # Diagramas em PlantUML/Mermaid
├── docs/                    # Documentação (final-document.md + spec)
├── openapi/                 # Especificação REST
├── drizzle/                 # Migrations + SQL de policies/search/views
├── src/
│   ├── app/                 # Next.js App Router (camada interface) + _bootstrap
│   ├── modules/             # Bounded contexts (cada um hexagonal)
│   ├── shared/              # Result, EventBus, Clock, IdGenerator, errors
│   └── infrastructure/      # DB client, Redis, Supabase clients
├── tests/
│   ├── integration/         # Vitest + Postgres real (test:integration)
│   └── e2e/                 # Playwright (app rodando)
├── scripts/                 # Scripts utilitários (ex: openapi gen)
├── HANDOFF.md               # Contrato Agente A / Agente B
└── README.md
```

## Convenções

- TypeScript estrito (sem `any`, sem `@ts-ignore`)
- Conventional Commits
- 1 stint = 1 PR = 1 commit em `main` (squash merge)
- Padrões evidenciados em código: `// GoF: Strategy`, `// SOLID: OCP` etc.
- Result pattern (`Result<T, E>` em `src/shared/result`) em vez de `throw` para erros de negócio

## Atributos de qualidade prioritários

Conforme ISO/IEC 25010:2023:

1. **Manutenibilidade** — Clean Architecture, ports/adapters, DI
2. **Confiabilidade** — Outbox pattern, retry policies (Strategy), idempotência
3. **Performance** — Cache em camadas, índices, paginação cursor-based

Detalhes e métricas em [`adrs/`](./adrs/) e no [documento final](./docs/final-document.md).

## Padrões GoF implementados

| Padrão | Onde | ADR/Stint |
|---|---|---|
| **State** | `issues/domain/state/` — workflow de Issue | A6 |
| **Composite** | `issues/domain/IssueTree.ts` — sub-tasks recursivas | A8 |
| **Memento** | `issues/domain/ActivitySnapshot.ts` — persistido em `activity` table via `ActivityRepository` | A8 + A13, [ADR-0009](./adrs/0009-activity-log-inline-capture.md) |
| **Observer** | `shared/events/EventBus.ts` + `OutboxRelay` + subscribers | A4, A9, [ADR-0007](./adrs/0007-outbox-pattern.md) |
| **Adapter / Factory** | `auth-rls/infrastructure/SupabaseAuthProvider.ts`, `createAuthRlsModule` | B1, [ADR-0004](./adrs/0004-supabase-auth-vs-nextauth-lucia.md) |
| Strategy / Factory Method / Decorator | webhooks/, notifications/, search/ | B2-B7 |

## Endpoints REST principais

Auth via `Authorization: Bearer <JWT-Supabase>`. Errors seguem [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807).

```
GET  /api/v1/workspaces
POST /api/v1/workspaces
GET  /api/v1/workspaces/{workspaceId}/projects
POST /api/v1/workspaces/{workspaceId}/projects
GET  /api/v1/projects/{projectId}/issues?cursor=&limit=&status=&priority=
POST /api/v1/projects/{projectId}/issues
GET  /api/v1/issues/{issueId}
PATCH /api/v1/issues/{issueId}
POST /api/v1/issues/{issueId}/transitions   { to: "in_progress" }
GET  /api/v1/issues/{issueId}/comments
POST /api/v1/issues/{issueId}/comments
GET  /api/v1/issues/{issueId}/activity      ← Memento timeline
GET  /api/v1/projects/{projectId}/labels
POST /api/v1/projects/{projectId}/labels
```

Spec completa: [`openapi/trackr.json`](./openapi/trackr.json) (gerada de schemas Zod com `npm run openapi:generate`).

## Licença

MIT. Veja [LICENSE](./LICENSE).
