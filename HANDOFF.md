# HANDOFF — Trackr (Agente A / Agente B)

Este documento é o **contrato** entre os dois agentes Claude Code que constroem o Trackr em paralelo.

- **Agente A** — núcleo de domínio + arquitetura (workspaces, issues, comments, labels, sub-tasks, state machine, EventBus + Outbox, OpenAPI, ADRs principais, diagramas core)
- **Agente B** — infraestrutura periférica + features de produto + UI (auth/RLS, webhooks, notificações multi-canal, sprints, busca, time tracking, dashboards, templates, CSV import, UI Next.js, E2E)

Leia este documento na íntegra **antes de qualquer código**.

---

## 1. Visão de 30 segundos

**Projeto:** Trackr — Issue Tracker estilo Linear/Jira mini.
**Stack:** Next.js 15 (App Router) + TypeScript estrito + Drizzle ORM + Supabase (Postgres + Auth + Realtime) + Upstash Redis + BullMQ.
**Arquitetura:** Monolito modular, Hexagonal / Clean Architecture por módulo.
**Total:** ~24 stints (12 por agente), 1 stint = 1 PR = 1 commit em main (squash).

Para o contexto completo, ler:

1. `docs/superpowers/specs/2026-06-07-trackr-design.md` — design completo (autoridade)
2. ADRs em `adrs/`
3. Este arquivo

---

## 2. Regras de fronteira

### 2.1. Áreas exclusivas do Agente A (Agente B NÃO modifica)

- `src/shared/` — Result, EventBus port, Clock, base errors, base value objects
- `src/modules/workspaces/`
- `src/modules/issues/`
- `src/modules/comments/`
- `src/modules/labels/`
- `src/infrastructure/db/schema/{users,workspaces,issues,labels,comments,activity,outbox}.ts`
- `adrs/0001-*.md`, `adrs/0002-*.md`, `adrs/0003-*.md`, `adrs/0005-*.md`, `adrs/0007-*.md`
- `diagrams/c4-context.puml`, `diagrams/c4-container.puml`
- `diagrams/classes-gof.puml` (Agente A documenta seus padrões; Agente B documenta os seus em `diagrams/classes-gof-b.puml`)
- `diagrams/sequence-issue-transition.puml`
- `openapi/trackr.yaml` — Agente A possui o esqueleto e os paths dos seus módulos; Agente B adiciona apenas seus paths

### 2.2. Áreas exclusivas do Agente B (Agente A NÃO modifica)

- `src/modules/auth-rls/`
- `src/modules/webhooks/`
- `src/modules/notifications/`
- `src/modules/sprints/`
- `src/modules/search/`
- `src/modules/timetracking/`
- `src/modules/reports/`
- `src/modules/import/`
- `src/app/(client)/` (TODA UI cliente)
- `src/infrastructure/queue/` (BullMQ + workers)
- `src/infrastructure/cache/` (Redis adapter)
- `src/infrastructure/db/schema/{webhooks,notifications,sprints,timetracking,search}.ts`
- `adrs/0004-*.md`, `adrs/0006-*.md`, `adrs/0008-*.md`
- `diagrams/c4-container-detail.puml`, `diagrams/sequence-webhook-delivery.puml`, `diagrams/classes-gof-b.puml`

### 2.3. Áreas compartilhadas (combinar via PR antes de tocar)

- `README.md` — atualizado por Agente B no B12 (instalação completa)
- `docs/final-document.md` — Agente A escreve seções 1, 2A, 2B, 3, 4 (SRP/OCP/LSP), 6 (State/Composite/Memento), 8 (diagramas), 10 (refs); Agente B escreve seção 4 (ISP/DIP), 6 (Strategy/Factory), 7 (REST endpoints próprios), 9 (avaliação crítica), e 8 (diagramas adicionais)
- `package.json` — adicione deps quando precisar; nunca remova existentes; ordene alfabeticamente
- `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `prettier.config.mjs` — discuta em PR se precisar mudar

---

## 3. Convenções obrigatórias

### 3.1. Código

- **TypeScript estrito** — sem `any`, sem `@ts-ignore`, sem `as unknown as X`. Em casos legítimos de cast (ex: parsing de unknown externo), use `z.parse()` ou type predicates explícitos.
- **Result pattern** — use `Result<T, DomainError>` do `src/shared/result` para erros de negócio previsíveis. `throw` só para bugs de programação (assertion errors, invariantes quebrados).
- **DI por factory function** — cada módulo expõe `createXxxModule(deps: XxxDeps)` no `index.ts`. Sem singleton global, sem `process.env` dentro de domain/application.
- **Camadas (regras imutáveis):**
  - `domain/` → TypeScript puro, ZERO import de Next/Drizzle/Supabase/Redis/`process.env`
  - `application/` → importa apenas `domain/` e ports locais (`./ports/`)
  - `infrastructure/` → adapters concretos das ports; importa libs externas
  - `interface/` → handlers/server actions; delega imediatamente a use cases
- **Imports proibidos:**
  - `domain/` → nunca `application/`, `infrastructure/`, `interface/`
  - `application/` → nunca `infrastructure/`
  - Cross-module → SOMENTE pelo barrel `index.ts` do outro módulo

### 3.2. Padrões marcados em código

Marque com comentário **na linha do uso** ou no topo do arquivo:

```ts
// GoF: Strategy — escolha de algoritmo de retry em runtime
export interface RetryStrategy { ... }

// SOLID: DIP — depende de port, não de adapter concreto
constructor(private readonly issueRepo: IssueRepository) {}
```

O professor vai grepar por essas marcas. Use exatamente este formato.

### 3.3. Commits e PRs

- **Conventional Commits** — `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs(adr-XXX): ...`, `chore: ...`, `refactor(scope): ...`
- **1 stint = 1 PR** (squash merge → 1 commit em main)
- **Título do PR**: `[A05] feat(workspaces): bounded context with hexagonal architecture` ou `[B03] feat(webhooks): Strategy pattern for retries and signed deliveries`
- **Body do PR**: descreva o que mudou, qual GoF aplicou, link pro ADR se houver, qual atributo de qualidade endereça
- **Branch**: `agent-{a,b}/B{xx}-<topic-curto>` (ex: `agent-b/B03-retry-strategy`)

### 3.4. Fluxo de trabalho

```bash
git checkout main && git pull
git checkout -b agent-X/B0Y-topic
# trabalha o stint
npm run lint && npm run typecheck && npm run test
git add . && git commit -m "feat(scope): ..."
git push -u origin agent-X/B0Y-topic
gh pr create --base main --title "[A05] feat(...): ..." --body "..."
# espera review (do outro agente humano que vai mesclar via squash)
# antes do próximo stint:
git checkout main && git pull
```

### 3.5. Quando travar

- **Conflito com o outro agente:** NÃO force merge. Aborte rebase, espere o outro stint mesclar, refaz rebase.
- **Faltando port do `src/shared/` ou de outro módulo:** verifique se o agente correspondente já entregou. Se não, abra issue no GitHub. NÃO duplique do seu lado.
- **Dúvida arquitetural:** releia o spec. Se ainda assim, abra discussion no repo marcando o outro agente humano.

---

## 4. Stints do Agente A (12)

| # | Stint | Branch | Resumo |
|---|-------|--------|--------|
| A1 | Scaffolding + tooling | (já feito) | `package.json`, tsconfig estrito, eslint, prettier, vitest, layout `src/` |
| A2 | Spec + ADR-001/002 + diagramas C4 + HANDOFF | (já feito) | Design completo, dois ADRs base, contexto+container |
| A3 | Schema Drizzle inicial + outbox + activity tables | `agent-a/A03-schema` | Migrations base |
| A4 | `src/shared/` — Result, EventBus, errors, Clock, value objects | `agent-a/A04-shared` | Foundation |
| A5 | Módulo `workspaces/` (domain + application + drizzle + interface) | `agent-a/A05-workspaces` | Primeiro bounded context completo |
| A6 | Módulo `issues/` — entidades + State pattern + ADR-003 | `agent-a/A06-issues-state` | State machine como GoF State |
| A7 | Módulo `issues/` — use cases + ports + drizzle adapter | `agent-a/A07-issues-usecases` | CRUD + transições |
| A8 | Sub-tasks (Composite) + ActivitySnapshot (Memento) + ADR-007 | `agent-a/A08-composite-memento` | Dois GoF |
| A9 | EventBus dispatcher + outbox relay worker (Observer wiring) | `agent-a/A09-outbox` | Eventos confiáveis |
| A10 | Módulos `comments/` + `labels/` | `agent-a/A10-comments-labels` | Domínio adicional |
| A11 | OpenAPI 3.1 gerada de Zod + REST handlers + ADR-005 | `agent-a/A11-openapi-rest` | API formal |
| A12 | Testes unit do domain (80%+) + diagrama de classes (Mermaid) + diagrama de sequência | `agent-a/A12-tests-diagrams` | Cobertura + visuais |

---

## 5. Stints do Agente B (12)

### B1 — feat(auth): Supabase Auth integration with RLS policies + ADR-004

**Branch:** `agent-b/B01-supabase-auth`

**Objetivo:** habilitar login email/password via Supabase, middleware Next.js que injeta `currentUser` no contexto, políticas RLS em SQL para as tabelas existentes.

**Entregáveis:**

- `src/modules/auth-rls/domain/UserContext.ts` — value object do usuário autenticado
- `src/modules/auth-rls/application/ports/AuthProvider.ts` — port (DIP)
- `src/modules/auth-rls/infrastructure/SupabaseAuthProvider.ts` — adapter
- `src/modules/auth-rls/interface/middleware.ts` (Next.js middleware)
- `src/modules/auth-rls/index.ts` — barrel + factory
- `drizzle/sql/policies/*.sql` — RLS por tabela (workspaces, projects, issues, comments, labels)
- `adrs/0004-supabase-auth-vs-nextauth-lucia.md`

**Critérios de aceitação:**

- Página `/login` funcional
- Server Component pode chamar `getCurrentUser()` que retorna `UserContext | null`
- RLS bloqueia acesso a workspace de outro usuário (teste integração)
- `npm run lint && npm run typecheck && npm run test` passam

**Marcas obrigatórias:**

- `// SOLID: DIP` no port `AuthProvider`
- `// ADR-0004` no `SupabaseAuthProvider`

---

### B2 — feat(webhooks): bounded context with delivery domain

**Branch:** `agent-b/B02-webhooks-domain`

**Objetivo:** bounded context de webhooks. Entidades `WebhookEndpoint` (URL, secret, política de retry, status) e `WebhookDelivery` (event, attempts, status, last_error). Use cases de gerenciamento.

**Entregáveis:**

- `src/modules/webhooks/domain/{WebhookEndpoint,WebhookDelivery,DeliveryStatus,DeliveryAttempt}.ts`
- `src/modules/webhooks/application/use-cases/{CreateEndpoint,ListEndpoints,DeleteEndpoint,EnqueueDelivery,RecordAttempt}.ts`
- `src/modules/webhooks/application/ports/{WebhookRepository,DeliveryQueue,Clock}.ts` (reusa `Clock` de `src/shared/`)
- `src/modules/webhooks/infrastructure/DrizzleWebhookRepository.ts`
- `src/infrastructure/db/schema/webhooks.ts`
- `adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md`

**Critérios:**

- Use cases testados (unit) ≥80% coverage no `domain/` e `application/`
- Repo Drizzle testado com integração (esquema válido)
- Endpoint pode ser criado com `RetryPolicy.exponential(maxAttempts=5)`

---

### B3 — feat(webhooks): Strategy pattern for retries and signed deliveries

**Branch:** `agent-b/B03-webhooks-strategy`

**Objetivo:** **Strategy** para retry policies (Exponential, Linear, Fixed), trocável por endpoint. **HMAC-SHA256** signer com possibilidade futura de HMAC-SHA1 ou Ed25519 (demonstra LSP). Worker BullMQ consome fila, tenta entregar com a strategy do endpoint, registra Attempt.

**Entregáveis:**

- `src/modules/webhooks/application/retry/RetryStrategy.ts` — interface (port)
- `src/modules/webhooks/application/retry/{ExponentialRetry,LinearRetry,FixedRetry}.ts`
- `src/modules/webhooks/infrastructure/sign/{WebhookSigner,HmacSha256Signer,HmacSha1Signer,Ed25519Signer}.ts`
- `src/infrastructure/queue/BullMqDeliveryQueue.ts` (adapter de `DeliveryQueue`)
- `src/infrastructure/queue/workers/webhook-worker.ts`

**Marcas obrigatórias:**

```ts
// GoF: Strategy — política de retry trocável por endpoint
export interface RetryStrategy {
  nextDelay(attemptNumber: number): Duration;
  shouldRetry(attemptNumber: number, error: DeliveryError): boolean;
}
```

```ts
// SOLID: OCP — adicionar nova política não toca callers
export class CustomBackoff implements RetryStrategy { ... }
```

```ts
// SOLID: LSP — qualquer Signer substituível
export interface WebhookSigner { sign(payload: string, secret: string): string }
```

---

### B4 — feat(notifications): Factory Method for multi-channel delivery

**Branch:** `agent-b/B04-notifications-factory`

**Objetivo:** bounded context de notificações com `Notification` entidade abstrata, `NotificationChannel` port, e **Factory Method** que cria o objeto Notification certo por canal: `EmailNotification`, `PushNotification`, `InAppNotification`, `WebhookNotification`.

**Entregáveis:**

- `src/modules/notifications/domain/{Notification,Channel,Subject,Body,Recipient}.ts`
- `src/modules/notifications/domain/notifications/{EmailNotification,PushNotification,InAppNotification}.ts`
- `src/modules/notifications/application/NotificationFactory.ts` (Factory Method)
- `src/modules/notifications/application/ports/NotificationChannel.ts`
- `src/modules/notifications/application/use-cases/{SendNotification,UpdatePreferences,SubscribeUserToTopic}.ts`
- `src/infrastructure/db/schema/notifications.ts`

**Marcas:**

```ts
// GoF: Factory Method — cria Notification concreta por Channel
export abstract class NotificationFactory {
  abstract create(payload: NotificationPayload): Notification;
}
```

---

### B5 — feat(notifications): email, push and in-app channel adapters

**Branch:** `agent-b/B05-notification-channels`

**Objetivo:** três adapters de `NotificationChannel`: **Resend** (email), **web-push** (push), **Supabase Realtime** (in-app broadcast). Cada um implementa a port. Subscriber no EventBus: quando `IssueAssigned` é publicado, dispara notificação para o assignee pelos canais ativos na preferência.

**Entregáveis:**

- `src/modules/notifications/infrastructure/channels/ResendEmailChannel.ts`
- `src/modules/notifications/infrastructure/channels/WebPushChannel.ts`
- `src/modules/notifications/infrastructure/channels/RealtimeChannel.ts`
- `src/modules/notifications/interface/subscribers/IssueAssignedSubscriber.ts`
- Atualizar `package.json` com `resend` e `web-push`

**Marcas:**

```ts
// SOLID: OCP — adicionar canal Slack só adiciona classe, não muda use case
export class SlackChannel implements NotificationChannel { ... }
```

---

### B6 — feat(sprints): cycles with start/end dates and capacity

**Branch:** `agent-b/B06-sprints`

**Objetivo:** sprints/cycles. Cada sprint tem nome, datas de início/fim, status (planned/active/closed), capacity (story points), lista de issues. Use cases: criar, iniciar, fechar, adicionar/remover issue.

**Entregáveis:**

- `src/modules/sprints/domain/{Sprint,SprintState,Capacity,Velocity}.ts`
- `src/modules/sprints/application/use-cases/{CreateSprint,StartSprint,CloseSprint,AddIssueToSprint,RemoveIssueFromSprint,GetActiveSprint}.ts`
- `src/modules/sprints/application/ports/SprintRepository.ts`
- `src/modules/sprints/infrastructure/DrizzleSprintRepository.ts`
- `src/infrastructure/db/schema/sprints.ts`

**Marcas:**

- `// GoF: State` (opcional) se reutilizar o pattern para SprintState
- `// SOLID: SRP` em cada use case (uma responsabilidade)

---

### B7 — feat(search): full-text search with Redis cache layer + ADR-008 reversal

**Branch:** `agent-b/B07-search`

**Objetivo:** busca full-text de issues usando Postgres `tsvector` + `tsquery`. **Strategy** de ranking (relevance, date, priority). Cache de queries quentes em Upstash Redis via **Decorator** (`CachedSearcher` decora `PostgresFtsSearcher`).

**ADR-008** documenta REVERSÃO de decisão: inicialmente o grupo escolheu MeiliSearch/Algolia, depois reverteu para FTS Postgres por simplicidade operacional e custo. O edital RECOMENDA registrar uma decisão revertida.

**Entregáveis:**

- `src/modules/search/application/ranking/{RankingStrategy,RelevanceRanking,DateRanking,PriorityRanking}.ts`
- `src/modules/search/application/ports/IssueSearcher.ts`
- `src/modules/search/infrastructure/PostgresFtsSearcher.ts` (adapter principal)
- `src/modules/search/infrastructure/CachedSearcher.ts` (Decorator)
- `src/infrastructure/cache/UpstashRedisCache.ts`
- `adrs/0008-fts-postgres-vs-meilisearch.md` (status: Accepted, supersedes a decisão anterior)

**Marcas:**

- `// GoF: Strategy` em ranking
- `// GoF: Decorator` em `CachedSearcher`
- `// SOLID: ISP` na port `IssueSearcher` (read-only, separado de write)

---

### B8 — feat: issue templates and CSV import with parser strategies

**Branch:** `agent-b/B08-templates-import`

**Objetivo:** templates de issue (preenchem campos default ao criar) + import de issues via CSV ou JSON com **Strategy** de parser por formato.

**Entregáveis:**

- `src/modules/import/domain/ImportRow.ts`
- `src/modules/import/application/parsers/{Parser,CsvParser,JsonParser}.ts` (Strategy)
- `src/modules/import/application/use-cases/{ImportIssues,DryRunImport}.ts`
- `src/modules/import/application/templates/IssueTemplate.ts`
- `src/modules/import/interface/server-actions.ts`

**Marcas:**

- `// GoF: Strategy` em `Parser`

> Combine no PR se precisar adicionar campos a `Issue` para templates (área compartilhada do Agente A).

---

### B9 — feat(timetracking): time entries with aggregation

**Branch:** `agent-b/B09-timetracking`

**Objetivo:** time tracking. Usuário registra `TimeEntry` numa issue, com start/end e descrição. Aggregator soma por issue, sprint, usuário, projeto.

**Entregáveis:**

- `src/modules/timetracking/domain/{TimeEntry,Duration,TimeReport}.ts`
- `src/modules/timetracking/application/use-cases/{LogTime,EditEntry,DeleteEntry,GetUserSummary,GetIssueTotal,GetSprintSummary}.ts`
- `src/modules/timetracking/application/ports/TimeEntryRepository.ts`
- `src/modules/timetracking/infrastructure/DrizzleTimeEntryRepository.ts`
- `src/infrastructure/db/schema/timetracking.ts`

---

### B10 — feat(dashboards): aggregated reports with materialized views

**Branch:** `agent-b/B10-dashboards`

**Objetivo:** dashboards de relatórios — issues por status, velocity por sprint, throughput, cycle time, burndown. Use **materialized views** Postgres para agregados que vão a UI (refresh periódico via worker).

**Entregáveis:**

- `drizzle/sql/views/{dashboard_velocity,dashboard_throughput,dashboard_cycle_time,dashboard_burndown}.sql`
- `src/modules/reports/application/use-cases/{GetVelocityReport,GetThroughput,GetCycleTime,GetBurndown}.ts`
- `src/modules/reports/application/ports/ReportReader.ts`
- `src/modules/reports/infrastructure/DrizzleReportReader.ts`
- REST endpoints `/api/v1/reports/*` em `src/app/api/v1/reports/`

---

### B11 — feat(ui): client pages for issue tracker workflows

**Branch:** `agent-b/B11-ui`

**Objetivo:** UI Next.js funcional. Mínimo de polimento, foco em fluxo.

**Páginas:**

- `/login`
- `/[workspace]` (workspace home com projetos)
- `/[workspace]/projects/[project]` (lista de issues com filtros)
- `/[workspace]/projects/[project]/issues/[issue]` (detalhe com transições, comentários, sub-tasks, time entries, activity)
- `/[workspace]/sprints` (sprints ativas e planejadas)
- `/[workspace]/dashboard` (relatórios)

**Stack UI:**

- Tailwind CSS
- shadcn/ui para componentes base
- Server Components para listagens
- Server Actions para mutations
- Forms com `react-hook-form` + `zod`

**Entregáveis:**

- Páginas em `src/app/(client)/`
- Componentes reutilizáveis em `src/components/ui/`
- Atualizar `package.json` com `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `@radix-ui/...` (conforme shadcn)

---

### B12 — test: integration and E2E coverage with documentation polish

**Branch:** `agent-b/B12-tests-docs`

**Objetivo:** testes de integração para seus use cases (Postgres real via testcontainers ou Supabase local) + Playwright E2E para fluxo crítico + atualização final de README + suas seções no doc final.

**Fluxo E2E crítico:**

1. Login
2. Criar workspace
3. Criar projeto
4. Criar issue
5. Transicionar issue: backlog → todo → doing → review → done
6. Verificar activity log
7. Verificar notificação in-app no destinatário

**Entregáveis:**

- `tests/integration/{webhooks,notifications,sprints,search,timetracking,reports}.test.ts`
- `tests/e2e/critical-flow.spec.ts` (Playwright)
- `playwright.config.ts`
- Atualizar `README.md` com instruções completas de setup (Supabase local, Upstash, .env)
- Adicionar suas seções em `docs/final-document.md` (4 ISP/DIP, 6 Strategy/Factory/Decorator, 7 REST endpoints próprios, 9 avaliação crítica)

---

## 6. Verificação antes de marcar stint como completo

```bash
npm run lint
npm run typecheck
npm run test
# se for stint que toca infraestrutura/DB:
npm run test:integration
# se for B11/B12:
npx playwright test
```

Todo `// GoF: X` e `// SOLID: Y` precisa ser correto — o professor vai cobrar evidência objetiva.

---

## 7. Padrões GoF — quem implementa o quê

| Padrão | Agente | Onde |
|--------|--------|------|
| State | A | `src/modules/issues/domain/state/` (workflow de issue) |
| Composite | A | `src/modules/issues/domain/IssueTree.ts` (sub-tasks) |
| Memento | A | `src/modules/issues/domain/ActivitySnapshot.ts` (activity log) |
| Observer | A | `src/shared/events/EventBus.ts` + subscribers nos módulos |
| Strategy | B | `src/modules/webhooks/application/retry/` e `src/modules/search/application/ranking/` e `src/modules/import/application/parsers/` |
| Factory Method | B | `src/modules/notifications/application/NotificationFactory.ts` |
| Decorator | B (opcional bônus) | `src/modules/search/infrastructure/CachedSearcher.ts` |

**Mínimo do edital:** 3. **Entregaremos:** 7 (com folga, para demonstrar profundidade).

---

## 8. SOLID — distribuição

| Princípio | Agente | Exemplo principal |
|-----------|--------|--------------------|
| SRP | A + B | `IssueRepository` (só persiste), `IssueStateMachine` (só transiciona), cada use case |
| OCP | B | `RetryStrategy`, `NotificationChannel` (add canal sem mudar use case) |
| LSP | B | `WebhookSigner` (HMAC-256, HMAC-1, Ed25519 — todos substituíveis) |
| ISP | A + B | A: `IssueReader` vs `IssueWriter`; B: `IssueSearcher` separado de write |
| DIP | A + B | Todo use case depende de port (interface), não de adapter |

---

## 9. ADRs — distribuição

| ADR | Agente | Tema |
|-----|--------|------|
| 0001 | A | Modular Monolith vs Microservices |
| 0002 | A | Hexagonal / Clean Architecture per Module |
| 0003 | A | Drizzle vs Prisma vs raw SQL |
| 0004 | B | Supabase Auth vs NextAuth vs Lucia |
| 0005 | A | REST + OpenAPI vs GraphQL |
| 0006 | B | BullMQ + Upstash vs Inngest vs Vercel Cron |
| 0007 | A | Outbox Pattern para entrega confiável de eventos |
| 0008 | B | FTS Postgres vs MeiliSearch (**reversão** — superseded MeiliSearch) |

---

## 10. Como começar (Agente B)

```bash
git clone https://github.com/HenriqueVMonteiro/trackr.git
cd trackr
npm install

# leia (em ordem):
#  1. HANDOFF.md (este arquivo)
#  2. docs/superpowers/specs/2026-06-07-trackr-design.md
#  3. adrs/0001-*.md e 0002-*.md
#  4. src/README.md
#  5. src/shared/ e um módulo do Agente A para entender padrão

git checkout -b agent-b/B01-supabase-auth
# implementa B1
npm run lint && npm run typecheck && npm run test
git add . && git commit -m "feat(auth): Supabase Auth integration with RLS policies"
git push -u origin agent-b/B01-supabase-auth
gh pr create --base main --title "[B01] feat(auth): Supabase Auth integration with RLS policies + ADR-004" --body "..."
# seguir para B2 após merge
```

Boa sorte. Cada PR conta na avaliação do "histórico de commits coerente" (critério explícito do edital).
