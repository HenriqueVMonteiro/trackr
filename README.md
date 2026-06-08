# Trackr

Issue tracker modular para o trabalho final da disciplina de Arquitetura de Software.

Inspirado em Linear / Jira mini, com workspaces, projetos, issues com state machine, sub-tasks, comentários, labels, sprints, webhooks, notificações multi-canal, dashboards, busca full-text, time tracking e activity log com snapshots Memento.

**170+ testes unitários** verde no domínio · **9 ADRs** (incluindo uma reversão) · **5+ padrões GoF** demonstrados · **OpenAPI 3.1** gerada do código.

## Stack

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript estrito
- **ORM**: Drizzle
- **Banco**: Postgres (Supabase)
- **Auth**: Supabase Auth + RLS
- **Realtime**: Supabase Realtime
- **Cache / Filas**: Upstash Redis + BullMQ
- **Validação**: Zod
- **Testes**: Vitest (unit + integração) + Playwright (E2E)

## Arquitetura

Monolito modular. Cada módulo segue Clean Architecture / Hexagonal:

```
src/modules/<contexto>/
  domain/           # entidades, value objects, eventos de domínio (puros)
  application/      # use cases, ports (interfaces), DTOs
  infrastructure/   # adapters: drizzle repo, supabase auth, redis, etc.
  interface/        # handlers HTTP + server actions Next.js
  index.ts          # public barrel
```

Detalhes completos no [design spec](./docs/superpowers/specs/2026-06-07-trackr-design.md).

## Instalação

Pré-requisitos: **Node.js >= 20.10**.

```bash
git clone https://github.com/HenriqueVMonteiro/trackr.git
cd trackr
npm install
cp .env.example .env.local
# edite .env.local com credenciais de Supabase e Upstash

npm run db:migrate
npm run dev
```

Acesse `http://localhost:3000`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | Linter (ESLint) |
| `npm run typecheck` | Type checking |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:coverage` | Cobertura de testes |
| `npm run test:integration` | Testes de integração |
| `npm run db:generate` | Gera migration Drizzle |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:studio` | Drizzle Studio (UI do banco) |
| `npm run openapi:generate` | Gera `openapi/trackr.yaml` a partir dos schemas Zod |

## Documentação

- [`docs/superpowers/specs/2026-06-07-trackr-design.md`](./docs/superpowers/specs/2026-06-07-trackr-design.md) — Design completo do sistema
- [`HANDOFF.md`](./HANDOFF.md) — Contrato entre os dois agentes paralelos
- [`adrs/`](./adrs/) — Architecture Decision Records
- [`diagrams/`](./diagrams/) — Diagramas C4, classes e sequência (PlantUML)
- [`openapi/trackr.yaml`](./openapi/) — Especificação REST (gerada do código)

## Estrutura de pastas

```
trackr/
├── adrs/                    # Architecture Decision Records
├── diagrams/                # Diagramas em PlantUML/Mermaid
├── docs/                    # Documentação e spec
├── openapi/                 # Especificação REST
├── drizzle/                 # Migrations SQL geradas
├── src/
│   ├── app/                 # Next.js App Router (camada interface)
│   ├── modules/             # Bounded contexts (cada um hexagonal)
│   ├── shared/              # Result, EventBus, errors, base VOs
│   └── infrastructure/      # DB client, Redis, Supabase clients
├── tests/
│   ├── integration/
│   └── e2e/
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

Detalhes e métricas em [`adrs/`](./adrs/) e no [design spec](./docs/superpowers/specs/2026-06-07-trackr-design.md).

## Padrões GoF implementados

| Padrão | Onde | ADR/Stint |
|---|---|---|
| **State** | `issues/domain/state/` — workflow de Issue | A6 |
| **Composite** | `issues/domain/IssueTree.ts` — sub-tasks recursivas | A8 |
| **Memento** | `issues/domain/ActivitySnapshot.ts` — persistido em `activity` table via `ActivityRepository` | A8 + A13, [ADR-0009](./adrs/0009-activity-log-inline-capture.md) |
| **Observer** | `shared/events/EventBus.ts` + `OutboxRelay` + subscribers | A4, A9, [ADR-0007](./adrs/0007-outbox-pattern.md) |
| **Adapter / Factory** | `auth-rls/infrastructure/SupabaseAuthProvider.ts`, `createAuthRlsModule` | B1, [ADR-0004](./adrs/0004-supabase-auth-vs-nextauth-lucia.md) |
| Strategy / Factory Method / Decorator | webhooks/, notifications/, search/ | B2-B7 (em curso) |

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
