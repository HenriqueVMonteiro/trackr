# Trackr — Design Spec

**Status:** Accepted
**Data:** 2026-06-07
**Autores:** Agente A (núcleo de domínio) + Agente B (infraestrutura + UI)
**Contexto:** Trabalho final da disciplina de Arquitetura de Software.

---

## 1. Contexto

O Trackr é um issue tracker no estilo Linear/Jira mini, com workspaces, projetos, issues com workflow de estados, sub-tarefas, comentários, labels, prioridades, assignees, sprints, webhooks de saída, notificações multi-canal, dashboards, busca full-text e time tracking.

O projeto é o entregável final de uma disciplina de Arquitetura de Software e precisa demonstrar de forma **objetiva e auditável**:

- Atributos de qualidade prioritários (ISO/IEC 25010:2023)
- Decisões arquiteturais registradas (ADRs no estilo Nygard)
- Estilo arquitetural em dois planos (macro + interno)
- Cinco princípios SOLID aplicados
- Práticas de Clean Code (Martin)
- Pelo menos três padrões GoF
- Design de API formalmente especificado (OpenAPI 3.1)

## 2. Escopo

### 2.1. Dentro do escopo

- Cadastro e autenticação de usuários (Supabase Auth)
- Workspaces multi-tenant com membros e papéis básicos
- Projetos dentro de workspaces
- Issues com state machine (`backlog → todo → in_progress → in_review → done | canceled`), prioridade, labels, assignee, sub-tasks arbitrariamente aninhadas
- Comentários em issues
- Activity log (snapshots de mudança)
- Webhooks de saída com retry policies configuráveis e assinatura HMAC
- Notificações multi-canal (email via Resend, push via Web Push, in-app via Supabase Realtime)
- Preferências de notificação por usuário e tipo de evento
- Sprints/Cycles com status, capacity, datas
- Busca full-text de issues
- Dashboards de relatórios (velocity, throughput, cycle time, burndown)
- Time tracking
- Templates de issue
- Importação de issues via CSV/JSON
- API REST documentada com OpenAPI 3.1
- UI Next.js funcional para todos os fluxos acima

### 2.2. Fora do escopo

- Aplicativo mobile nativo
- Funcionalidades de pagamento/billing
- Integrações OAuth com terceiros (GitHub, Slack — apenas via webhook de saída)
- Análise por IA (sumarizações, prioritization)
- Plug-ins/extensions de terceiros
- Permissões granulares por field (RBAC fica em owner/member only)

## 3. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Linguagem | TypeScript 5.7+ estrito | tipo seguro, expressividade para SOLID/GoF |
| Framework web | Next.js 15 (App Router) | full-stack monolito, server actions, route handlers |
| Persistência | Postgres (Supabase) | relacional, FTS embutido, materialized views, RLS |
| ORM | Drizzle | type-safe sem code-gen pesado, migrations SQL diff |
| Auth | Supabase Auth | JWT bundled com RLS no Postgres, sem code de auth próprio |
| Realtime | Supabase Realtime | broadcast in-app sem servidor separado |
| Cache + Filas | Upstash Redis + BullMQ | serverless-compatible, REST API, durabilidade |
| Validação | Zod | schemas reutilizáveis para input + geração OpenAPI |
| Geração OpenAPI | `@asteasolutions/zod-to-openapi` | single source of truth (schema = doc) |
| Email | Resend | API simples, transactional, devx |
| Push | web-push (VAPID) | padrão W3C, sem SaaS |
| Testes unit/integration | Vitest | rápido, TS nativo, compatível ESM |
| Testes E2E | Playwright | cross-browser, screenshots, trace |
| Hospedagem alvo | Vercel | Next.js nativo, edge runtime opcional |

## 4. Atributos de qualidade prioritários (ISO/IEC 25010:2023)

### 4.1. Top-3 priorizados

**(1) Manutenibilidade — `Maintainability / Modifiability`**

- *Por quê:* trabalho acadêmico cujo critério explícito é demonstrar SOLID, Clean Code, GoF; equipe pequena (2 agentes) com baixo overhead de coordenação; código será lido em detalhe pela banca avaliadora; e o domínio é candidato a evoluir com novas funcionalidades (sprints, integrações).
- *Resposta arquitetural:* Hexagonal / Clean Architecture com 4 camadas por módulo (`domain` puro, `application` com use cases + ports, `infrastructure` com adapters, `interface` Next.js). Dependency Injection via factory functions. Modular monolith — fronteiras explícitas por barrel (`index.ts`). Lint que veta `any` e enforça `consistent-type-imports`.
- *Métricas observáveis:* trocar provedor de auth (Supabase → Lucia) toca ≤2 arquivos de `infrastructure/auth-rls/`; complexidade ciclomática ≤10 por função (medida via ESLint + complexity rule, opcional); cobertura de testes no `domain/` ≥80%; tempo médio para adicionar novo bounded context ≤1 stint.

**(2) Confiabilidade — `Reliability / Maturity + Fault tolerance + Recoverability`**

- *Por quê:* webhooks e notificações são side-effects externos; perda de evento gera incidente (assinante deixou de ser notificado de issue urgente); integrações externas falham; o serviço de fila pode estar indisponível.
- *Resposta arquitetural:* **Outbox pattern** — eventos persistidos em tabela `outbox` na mesma transação que altera o estado; relay worker lê outbox e enfileira para entrega. **Strategy** para retry policies (Exponential, Linear, Fixed) configurável por endpoint. Idempotency keys nas requisições de webhook. Logs estruturados em cada tentativa.
- *Métricas observáveis:* taxa de entrega de webhook ≥99% em 24h após 5 retries; zero perda em quedas de Redis (outbox sobrevive); MTTR para reprocessamento manual ≤1h via Drizzle Studio + script.

**(3) Performance Efficiency — `Time-behaviour + Resource utilization`**

- *Por quê:* dashboard e listagem de issues precisam de UX snappy (devs comparam ao Linear); consultas crescem linearmente com volume de issues por projeto; Vercel cobra por compute, então caching reduz custo direto.
- *Resposta arquitetural:* cache em camadas — Upstash Redis para queries de busca quentes (via Decorator), materialized views Postgres para agregados de dashboard (refresh periódico), ETag/SWR no client; índices via Drizzle migrations (em colunas de FK, `(project_id, status)`, `(workspace_id, updated_at)`); paginação cursor-based opaco (base64 de `(updated_at, id)`).
- *Métricas observáveis:* p95 listagem de issues ≤200ms; p95 dashboard agregado ≤500ms; hit rate cache busca ≥70%.

### 4.2. Atributos deliberadamente fora do top-3

- **Segurança** — Supabase RLS cobre boundary de auth/authz com isolamento por workspace. Segurança é mencionada e adereçada (RLS policies em B1, HMAC assinatura em B3), mas não é a maior tensão de design — não há dados financeiros nem PII regulada.
- **Usabilidade** — UI será funcional mas não polida (não é critério da disciplina; banca avalia código e doc, não UX).
- **Portabilidade** — stack é fortemente acoplada ao Postgres (FTS, materialized views, RLS). Trocar de banco seria custoso. Aceito porque não há sinal real de necessidade.

## 5. Estilo arquitetural

### 5.1. Plano macro: **Monolito Modular**

Justificativa (registrada em [ADR-0001](../../../adrs/0001-modular-monolith-vs-microservices.md)):

- Equipe de 2 agentes — overhead de microsserviços (deploy independente, network, observabilidade distribuída, contratos versionados) não se paga.
- Não há requisito de escalar módulos independentemente (sem domínio "hot" identificado).
- Vercel hospeda Next.js bem, runtime único simplifica deploy.
- Fronteiras explícitas (via barrel) permitem refatorar para microsserviços no futuro sem reescrita.

Módulos:

```
src/modules/
├── workspaces/
├── issues/
├── comments/
├── labels/
├── sprints/
├── webhooks/
├── notifications/
├── auth-rls/
├── search/
├── timetracking/
├── reports/
└── import/
```

Cada módulo é um **bounded context** com seu schema Drizzle, suas use cases, seus adapters. Cross-module só via barrel.

### 5.2. Plano interno: **Hexagonal (Ports & Adapters) + Clean Architecture**

Cada módulo:

```
src/modules/<contexto>/
├── domain/           # TS puro, sem framework
│   ├── entities/
│   ├── value-objects/
│   └── events/
├── application/
│   ├── use-cases/    # 1 use case = 1 arquivo = 1 responsabilidade (SRP)
│   ├── ports/        # interfaces que use cases dependem (DIP)
│   └── dto/
├── infrastructure/   # adapters: drizzle, supabase, redis
└── interface/        # Next.js route handlers + server actions
```

Justificativa (registrada em [ADR-0002](../../../adrs/0002-hexagonal-clean-architecture-per-module.md)):

- Manutenibilidade — domain testável sem framework, adapters trocáveis
- SOLID demonstrável de forma natural (DIP via ports, SRP via use case por arquivo, OCP via ports plugáveis)
- Mapeia diretamente a fontes do livro-texto (Martin, Cockburn)

## 6. Modelo de domínio

### 6.1. Entidades principais

```
User
  id, email, name, avatar_url, created_at

Workspace
  id, name, slug, owner_id, created_at
  ──< Member { user_id, role: owner|member, joined_at }
  ──< Project

Project
  id, workspace_id, name, slug, description, created_at
  ──< Issue
  ──< Sprint
  ──< Label

Issue
  id, project_id, number, title, description, status, priority,
  assignee_id, parent_id (null = root), created_by, created_at, updated_at
  ──< Comment
  ──< Activity (snapshots)
  ──< TimeEntry
  ──m:n Label
  ──< Issue (sub-tasks via parent_id, Composite)

Sprint
  id, project_id, name, start_date, end_date, status: planned|active|closed,
  capacity_points, created_at
  ──m:n Issue (via SprintIssue)

Label
  id, project_id, name, color

Comment
  id, issue_id, author_id, body, created_at, updated_at

Activity (Memento)
  id, issue_id, actor_id, snapshot_before, snapshot_after, diff, created_at

WebhookEndpoint
  id, workspace_id, url, secret, retry_policy_type, retry_policy_params,
  signature_algo, active, created_at
  ──< WebhookDelivery

WebhookDelivery
  id, endpoint_id, event_type, payload, status,
  attempt_count, last_attempted_at, last_error, created_at
  ──< DeliveryAttempt (status, status_code, response_body, attempted_at)

Notification
  id, recipient_id, channel, subject, body, status, sent_at, error, created_at

NotificationPreference
  user_id, event_type, channels_enabled[]

TimeEntry
  id, issue_id, user_id, started_at, ended_at, description, duration_seconds

Outbox
  id, aggregate_type, aggregate_id, event_type, payload,
  published_at (nullable), created_at
```

### 6.2. State Machine de Issue (GoF: State)

```
backlog ─→ todo ─→ in_progress ─→ in_review ─→ done
   ↑          ↓          ↓             ↓          ↑
   └──── canceled ←──────┴──────────────┘     (reopened from done = todo)
```

Cada estado é uma classe que implementa `IssueState` com `canTransitionTo(next)` e regras específicas:

- `BacklogState` → permite `todo`, `canceled`
- `TodoState` → permite `in_progress`, `canceled`
- `InProgressState` → permite `in_review`, `canceled`
- `InReviewState` → permite `done` (requer approver_id presente), `in_progress` (rejeitado), `canceled`
- `DoneState` → permite `todo` (reopened — não permite voltar a in_progress sem passar por todo)
- `CanceledState` → terminal (não permite mais transições)

Implementação em `src/modules/issues/domain/state/`.

### 6.3. Composite — sub-tasks

Issue tem `parent_id` opcional. `IssueTree` agrega operações recursivas:

- `progressPercent()` — % de sub-tasks resolvidas (recursivo)
- `walk(visitor)` — visita árvore com `IssueVisitor` callback
- `flattenTo(maxDepth)` — lista achatada

Implementação em `src/modules/issues/domain/IssueTree.ts`.

### 6.4. Memento — Activity Log

Quando um Issue muda, `ActivitySnapshot` captura o estado antes/depois e produz diff legível ("Maria mudou prioridade de Low para High").

Implementação:

- Entity em `src/modules/issues/domain/ActivitySnapshot.ts`
- Port `ActivityRepository` em `src/modules/issues/application/ports/`
- Adapter `DrizzleActivityRepository` em `src/modules/issues/infrastructure/`
- Cada use case que altera estado (`CreateIssue`, `TransitionIssue`, `AssignIssue`, `EditIssue`, `SetPriority`) persiste o snapshot **inline** na mesma transação lógica que salva a entity — decisão registrada em [ADR-0009](../../../adrs/0009-activity-log-inline-capture.md).
- API: `GET /api/v1/issues/{id}/activity` retorna a timeline.

## 7. Padrões GoF aplicados

| # | Padrão | Categoria | Onde | Por quê |
|---|--------|-----------|------|---------|
| 1 | **State** | Comportamental | `issues/domain/state/` | Transições de Issue têm regras por estado; substitui switch/if gigante |
| 2 | **Composite** | Estrutural | `issues/domain/IssueTree.ts` | Sub-tasks formam árvore; cálculos recursivos uniformes |
| 3 | **Memento** | Comportamental | `issues/domain/ActivitySnapshot.ts` | Activity log precisa snapshot do estado antes/depois |
| 4 | **Observer** | Comportamental | `shared/events/EventBus.ts` + subscribers | Issue mudou → notificar + webhook + realtime + activity |
| 5 | **Strategy** | Comportamental | `webhooks/.../retry/`, `search/.../ranking/`, `import/.../parsers/` | Algoritmos trocáveis em runtime |
| 6 | **Factory Method** | Criação | `notifications/application/NotificationFactory.ts` | Criar Notification por canal com payload formatado |
| 7 | **Decorator** | Estrutural | `search/infrastructure/CachedSearcher.ts` | Cache em camadas sobre Searcher real |

**Mínimo do edital:** 3. Entregamos 7 (com folga, para demonstrar profundidade — cada padrão escolhido resolve problema real, não preenche checklist).

## 8. SOLID — aplicação concreta

### 8.1. SRP — Single Responsibility Principle

`IssueRepository` apenas persiste. `IssueStateMachine` apenas transiciona. `IssueNotifier` apenas notifica. Cada use case (`CreateIssue`, `UpdateIssue`, `TransitionIssue`, `AssignIssue`) é uma classe com método `execute(input)` — uma razão para mudar.

### 8.2. OCP — Open-Closed Principle

`RetryStrategy` é port; adicionar `CustomBackoff` cria classe nova sem tocar use case que enfileira a entrega. `NotificationChannel` é port; adicionar canal Slack/Discord cria adapter sem mudar `SendNotification` use case.

### 8.3. LSP — Liskov Substitution Principle

`WebhookSigner` tem implementações `HmacSha256Signer`, `HmacSha1Signer`, `Ed25519Signer`. Qualquer delas pode substituir o padrão sem caller perceber — contrato é `sign(payload, secret): string`. Testes verificam pre/post-conditions iguais.

### 8.4. ISP — Interface Segregation Principle

`IssueReader` (search, get, list) e `IssueWriter` (create, update, delete) são ports separadas. Use case de busca depende só de `IssueReader`. Evita acoplamento de busca a invariantes de escrita.

### 8.5. DIP — Dependency Inversion Principle

Todo use case depende de `XxxRepository` (interface em `application/ports/`), nunca de `DrizzleXxxRepository` (em `infrastructure/`). Adapter é injetado via factory function no bootstrap (`src/app/`).

## 9. API Design — REST + OpenAPI 3.1

### 9.1. Decisão (ADR-0005)

REST sobre GraphQL/gRPC. Justificativa:

- Tooling universal (curl, Postman, browser)
- Auth simples (Bearer JWT)
- Paginação cursor-based limpa
- Doc OpenAPI gerada do código (Zod → `zod-to-openapi`) — sem drift
- gRPC/GraphQL agregam complexidade sem ganho mensurável aqui

### 9.2. Convenções

- **Base path:** `/api/v1/...` (versionamento por URL)
- **Status codes:** 2xx success, 4xx client, 5xx server. Erros seguem [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807).
- **Paginação:** cursor opaco `?cursor=<base64>&limit=<n>` (default 50, max 200). Response inclui `next_cursor`.
- **Auth:** `Authorization: Bearer <jwt>` (Supabase JWT). Para webhooks recebidos (futuro), HMAC no header.
- **Idempotência:** `Idempotency-Key` header opcional em POST mutativos.

### 9.3. Exemplos de endpoints

```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{workspaceId}
DELETE /api/v1/workspaces/{workspaceId}

GET    /api/v1/workspaces/{workspaceId}/projects
POST   /api/v1/workspaces/{workspaceId}/projects

GET    /api/v1/projects/{projectId}/issues?cursor=...&status=todo
POST   /api/v1/projects/{projectId}/issues
GET    /api/v1/issues/{issueId}
PATCH  /api/v1/issues/{issueId}
POST   /api/v1/issues/{issueId}/transitions
POST   /api/v1/issues/{issueId}/comments
GET    /api/v1/issues/{issueId}/activity

POST   /api/v1/issues/{issueId}/subtasks
GET    /api/v1/issues/{issueId}/tree

GET    /api/v1/workspaces/{workspaceId}/webhooks
POST   /api/v1/workspaces/{workspaceId}/webhooks

GET    /api/v1/projects/{projectId}/sprints
POST   /api/v1/projects/{projectId}/sprints

GET    /api/v1/search?q=...&workspace=...
GET    /api/v1/reports/velocity?project=...
```

Detalhes em `openapi/trackr.yaml` (gerado de Zod no stint A11).

### 9.4. Erros — RFC 7807

```json
{
  "type": "https://trackr.app/errors/invalid-transition",
  "title": "Invalid issue state transition",
  "status": 422,
  "detail": "Cannot transition from 'done' to 'in_progress'",
  "instance": "/api/v1/issues/iss_01J/transitions",
  "currentState": "done",
  "attemptedState": "in_progress"
}
```

## 10. Estratégia de persistência

### 10.1. Schema

- Drizzle em `src/infrastructure/db/schema/*.ts`
- Migrations geradas com `drizzle-kit generate` em `drizzle/`
- IDs: `nanoid(21)` com prefixo por tipo (`wsp_`, `prj_`, `iss_`, etc.) para legibilidade
- Soft delete: `deleted_at` em entidades com auditoria; hard delete para Comment, TimeEntry
- Timestamps em todas as tabelas (`created_at`, `updated_at`)

### 10.2. Índices

- Foreign keys sempre indexadas
- `(project_id, status)` em `issues`
- `(workspace_id, updated_at DESC)` em `issues`
- `tsvector` em `issues.search_vector` (B7)

### 10.3. Materialized Views (B10)

- `mv_velocity_per_sprint`
- `mv_throughput_weekly`
- `mv_cycle_time_per_issue`

Refresh via worker (cron job no BullMQ, intervalo 5min).

### 10.4. RLS (B1)

Políticas por tabela isolando dados por `workspace_id`. JWT Supabase carrega `user_id` e Postgres bloqueia leituras/escritas fora do escopo do workspace do usuário.

## 11. Eventos e processamento assíncrono

### 11.1. EventBus (Observer)

`src/shared/events/EventBus.ts`:

```ts
interface DomainEvent {
  type: string;
  occurredAt: Date;
  aggregateId: string;
  payload: unknown;
}

interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<E extends DomainEvent>(type: E["type"], handler: (e: E) => Promise<void>): void;
}
```

Implementação inicial: in-memory + outbox para persistência.

### 11.2. Outbox Pattern (ADR-0007)

Quando um use case altera estado e publica evento, faz tudo em uma transação:

1. Update no aggregate
2. Insert na tabela `outbox`
3. Commit

Worker separado lê `outbox`, despacha para EventBus em memória (que ativa subscribers de webhook, notification, realtime, etc.), e marca como `published_at = now()`.

Garante:

- Atomicidade entre estado e evento
- Re-entrega após queda
- Ordem de eventos por aggregate

### 11.3. Filas (B3)

`DeliveryQueue` (port) → `BullMqDeliveryQueue` (adapter usando Upstash Redis).

Workers em `src/infrastructure/queue/workers/`:

- `webhook-worker.ts` — consome fila, busca endpoint, aplica `RetryStrategy`, assina com `WebhookSigner`, envia HTTPS
- `notification-worker.ts` — consome fila, cria Notification via Factory, envia via Channel
- `mv-refresh-worker.ts` — refresh periódico das materialized views

## 12. Observabilidade

- Logs estruturados via `pino` (adicionar em A4)
- Cada use case loga entry/exit com `correlation_id` (gerado no middleware)
- Workers logam tentativa de entrega com `endpoint_id`, `attempt`, `status`, `latency_ms`
- Métricas — Vercel Analytics nativo + logs estruturados (sem Prometheus para simplicidade)
- Sentry opcional para erros em produção

## 13. Estratégia de testes

| Tipo | Ferramenta | Onde | Cobertura |
|------|-----------|------|----------|
| Unit (domain + application) | Vitest | `src/**/*.test.ts` | ≥80% em `domain/` e `application/use-cases/` |
| Integração | Vitest + testcontainers (Postgres) ou Supabase local | `tests/integration/*.test.ts` | Adapters, RLS, outbox |
| E2E crítico | Playwright | `tests/e2e/*.spec.ts` | Fluxo: login → criar workspace → criar issue → transicionar → notificar |

TDD encorajado em domain e application (Red → Green → Refactor). Adapters podem ser desenvolvidos guiados por integração.

## 14. ADRs — índice

| ADR | Título | Status | Agente |
|-----|--------|--------|--------|
| 0001 | Modular Monolith vs Microservices | Accepted | A |
| 0002 | Hexagonal / Clean Architecture per Module | Accepted | A |
| 0003 | Drizzle ORM vs Prisma vs raw SQL | Accepted | A |
| 0004 | Supabase Auth vs NextAuth vs Lucia | Accepted | B |
| 0005 | REST + OpenAPI vs GraphQL | Accepted | A |
| 0006 | BullMQ + Upstash vs Inngest vs Vercel Cron | Accepted | B |
| 0007 | Outbox Pattern para entrega confiável de eventos | Accepted | A |
| 0008 | FTS Postgres vs MeiliSearch (**reversão**) | Accepted (supersedes earlier) | B |
| 0009 | Activity Log inline capture per use case (Memento) | Accepted | A |

**Mínimo do edital:** 5. **Entregamos:** 9. Um deles é uma REVERSÃO conforme recomendação do edital.

## 15. Split de trabalho — Agente A vs Agente B

Resumo (detalhes completos em `HANDOFF.md`):

### Agente A — 12 stints

A1 scaffolding · A2 spec+ADR-001/002+C4 · A3 schema Drizzle · A4 shared (Result, EventBus, Clock) · A5 workspaces · A6 issues State machine + ADR-003 · A7 issues use cases · A8 Composite + Memento + ADR-007 · A9 outbox relay · A10 comments + labels · A11 OpenAPI + REST + ADR-005 · A12 testes unit + diagramas classes + sequência

### Agente B — 12 stints

B1 Supabase Auth + RLS + ADR-004 · B2 webhooks domain + ADR-006 · B3 webhooks Strategy + Signer (LSP) + worker · B4 notifications Factory · B5 channel adapters (email/push/in-app) · B6 sprints · B7 search FTS + Strategy ranking + Decorator cache + ADR-008 · B8 templates + CSV import (Strategy parsers) · B9 time tracking · B10 dashboards + materialized views · B11 UI · B12 integração + E2E + docs finais

## 16. Estrutura de pastas final

```
trackr/
├── adrs/
│   ├── README.md
│   ├── template.md
│   ├── 0001-modular-monolith-vs-microservices.md
│   ├── 0002-hexagonal-clean-architecture-per-module.md
│   └── ... (0003..0008)
├── diagrams/
│   ├── c4-context.puml
│   ├── c4-container.puml
│   ├── classes-gof.puml
│   ├── classes-gof-b.puml
│   ├── sequence-issue-transition.puml
│   └── sequence-webhook-delivery.puml
├── docs/
│   ├── superpowers/specs/2026-06-07-trackr-design.md  (este arquivo)
│   └── final-document.md  (compilado para PDF)
├── openapi/
│   └── trackr.yaml
├── drizzle/
│   ├── 0000_*.sql
│   └── sql/
│       ├── policies/
│       └── views/
├── src/
│   ├── app/                # Next.js (interface)
│   │   ├── (client)/
│   │   ├── api/v1/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── shared/
│   │   ├── result/
│   │   ├── events/
│   │   ├── errors/
│   │   ├── clock/
│   │   └── value-objects/
│   ├── modules/
│   │   ├── workspaces/
│   │   ├── issues/
│   │   ├── comments/
│   │   ├── labels/
│   │   ├── sprints/
│   │   ├── webhooks/
│   │   ├── notifications/
│   │   ├── auth-rls/
│   │   ├── search/
│   │   ├── timetracking/
│   │   ├── reports/
│   │   └── import/
│   └── infrastructure/
│       ├── db/
│       ├── queue/
│       ├── cache/
│       └── supabase/
├── tests/
│   ├── integration/
│   └── e2e/
├── scripts/
│   └── generate-openapi.ts
├── HANDOFF.md
├── README.md
├── LICENSE
└── (configs)
```

## 17. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Conflito de merge entre agentes em áreas compartilhadas | Médio | Médio | Fronteiras explícitas no HANDOFF, ordem de stints, PRs squash, comunicação no GitHub |
| Stint B5 (channels) precisa de eventos do A9 (outbox) já merged | Alto | Alto | Sequência B respeita ordem: B1 → B2 → B3 → B4 → B5. B5 não bloqueia até A9. Se A9 atrasar, B mete mock |
| Performance do FTS Postgres em volume grande | Baixo (escopo acadêmico) | Baixo | Documentar limite (10k issues por projeto sem queixar); ADR-0008 menciona migração para Meili como contingência futura |
| Vercel timeout em workers | Médio | Alto | Workers separados — não vivem em Vercel function. Considerar Fly.io ou Railway para workers (mas escopo acadêmico permite rodar local) |
| Friction de instalação para banca | Baixo | Médio | README com setup completo, docker-compose opcional para Postgres+Redis locais |

## 18. Próximos passos pós-trabalho (não-escopo)

- Pluginar SSO (OAuth GitHub/Google)
- Slack/Discord adapters de notificação
- Mobile (React Native)
- Real-time collaboration em comments (Yjs/Liveblocks)
- IA para sumarização de threads longas

---

**Esta spec é a autoridade.** Qualquer ambiguidade no `HANDOFF.md` se resolve consultando este documento. Mudanças a este documento exigem PR explícito com discussão.
