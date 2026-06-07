# Trackr

Issue tracker modular para o trabalho final da disciplina de Arquitetura de Software.

Inspirado em Linear / Jira mini, com workspaces, projetos, issues com state machine, sub-tasks, comentários, labels, sprints, webhooks, notificações multi-canal, dashboards, busca full-text e time tracking.

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

## Licença

MIT. Veja [LICENSE](./LICENSE).
