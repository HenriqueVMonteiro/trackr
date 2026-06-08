# Trackr — Trabalho Final da Disciplina de Arquitetura de Software

> **Status:** rascunho consolidado pelo Agente A; seções marcadas `[B]` aguardam contribuição do Agente B (stints B1–B12).
> **Repositório:** https://github.com/HenriqueVMonteiro/trackr
> **Data:** Junho de 2026
> **Grupo 1:**
> - Henrique Vieira Monteiro — RA 20045324 (Agente A)
> - Gabriel Teixeira Costa — RA 20123097 (Agente B)

---

## 1. Introdução

### 1.1. Apresentação e justificativa

O **Trackr** é um sistema de gerenciamento de issues (acompanhamento de tarefas) modular, inspirado em ferramentas como Linear e Jira. Permite que workspaces multitenant organizem projetos contendo issues com um workflow de estados (`backlog → todo → in_progress → in_review → done | canceled`), sub-tarefas, comentários, labels, sprints, dashboards, busca full-text, time tracking, e integrações externas via webhooks e notificações multi-canal (email, push, in-app).

A justificativa da escolha é estritamente didática: o domínio é **não-trivial** (atende ao critério do edital), tem **múltiplos bounded contexts** que se prestam a separação modular, e provoca decisões arquiteturais reais (state machine, sub-tarefas hierárquicas, side-effects externos, agregações sobre histórico) que permitem demonstrar SOLID, Clean Code e GoF de forma **objetivamente auditável** pela banca.

### 1.2. Objetivos

**Gerais:**

1. Demonstrar a aplicação consciente de uma arquitetura modular com hexagonal interna a cada bounded context.
2. Evidenciar SOLID, Clean Code e múltiplos padrões GoF resolvendo problemas reais do projeto.
3. Documentar decisões arquiteturais via ADRs no formato Nygard, incluindo ao menos uma decisão revertida (recomendação explícita do edital).

**Específicos:**

1. Construir o núcleo de domínio (workspaces, projetos, issues, comentários, labels) em TypeScript puro testável sem framework.
2. Expor o sistema via API REST formalmente especificada com OpenAPI 3.1 gerada a partir de schemas Zod.
3. Garantir entrega confiável de eventos externos via Outbox Pattern.
4. Implementar pelo menos seis padrões GoF (mínimo do edital: 3), distribuídos coerentemente.

### 1.3. Caracterização do problema

Times de desenvolvimento de software (público-alvo) precisam de uma ferramenta leve para organizar trabalho, priorizar tarefas, rastrear estados, capturar histórico de mudanças, comunicar progresso via integrações externas, e prever entregas (sprints + dashboards). Ferramentas comerciais (Jira, Linear) atendem o caso mas são pesadas, caras ou fechadas; o Trackr é o equivalente acadêmico minimalista, com escopo bem definido e suficiente para evidenciar os conceitos da disciplina.

---

## 2. Atributos de Qualidade e Decisões Arquiteturais

### 2A. Atributos de qualidade prioritários (ISO/IEC 25010:2023)

Foram identificados **três atributos prioritários** com justificativa específica ao contexto do projeto, junto com as decisões arquiteturais correspondentes e métricas observáveis.

#### 2A.1. Manutenibilidade (Maintainability — Modifiability, Testability)

**Por quê é prioritário aqui:** este é trabalho acadêmico cujo critério explícito é a **demonstração** de SOLID, Clean Code e GoF. A banca avaliadora lerá código em profundidade, e o domínio precisa ser facilmente alterável para que futuras evoluções (sprints, integrações, novos canais de notificação) caibam sem reescrita.

**Decisões arquiteturais correspondentes:**

- Clean Architecture com quatro camadas por módulo (`domain/`, `application/`, `infrastructure/`, `interface/`) — [ADR-0002](../adrs/0002-hexagonal-clean-architecture-per-module.md)
- Ports & Adapters explícitos (DIP via interfaces em `application/ports/`)
- TypeScript estrito sem `any`, sem `@ts-ignore`
- Repository pattern com adapter Drizzle injetado via factory function
- Result pattern (`Result<T, DomainError>`) em vez de exceptions para erros previsíveis

**Métricas observáveis:**

- Trocar provedor de auth (Supabase → Lucia, por exemplo) toca **≤2 arquivos** de `infrastructure/auth-rls/`
- Domínio testável **sem subir framework** (vitest puro: 133 testes em ~700ms)
- Complexidade ciclomática ≤10 por função (lint rule planejado)

#### 2A.2. Confiabilidade (Reliability — Maturity, Fault tolerance, Recoverability)

**Por quê é prioritário aqui:** webhooks e notificações são side-effects externos cuja perda gera incidente percebido pelo usuário (assignee não foi notificado de issue urgente; Slack integration silenciosamente parou). Integrações externas falham aleatoriamente; o serviço de fila pode estar indisponível.

**Decisões arquiteturais correspondentes:**

- **Outbox Pattern** — toda mudança de estado de aggregate persiste o evento na mesma transação SQL ([ADR-0007](../adrs/0007-outbox-pattern.md))
- **Strategy** para políticas de retry de webhook (Exponential, Linear, Fixed) configuráveis por endpoint — Agente B (B3)
- Idempotency keys nas requisições
- BullMQ + Upstash Redis para fila durável ([ADR-0006](../adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md), Agente B)

**Métricas observáveis:**

- Taxa de entrega de webhook **≥99% em 24h** após 5 retries
- **Zero perda** em quedas de Redis (outbox persiste)
- MTTR para reprocessamento manual **≤1h** via `drizzle-kit studio` + script de relay forçado

#### 2A.3. Performance Efficiency (Time-behaviour, Resource utilization)

**Por quê é prioritário aqui:** dashboards e listagens precisam de UX snappy (devs comparam ao Linear); consultas crescem linearmente com volume de issues; Vercel cobra por compute, então caching reduz custo direto.

**Decisões arquiteturais correspondentes:**

- Cache em camadas: **Upstash Redis** para queries quentes (via Decorator — Agente B B7), **materialized views** Postgres para agregados de dashboard (Agente B B10)
- Índices via Drizzle migrations em colunas de FK e `(project_id, status)`, `(project_id, updated_at)`
- Paginação cursor-based com `(updatedAt DESC, id ASC)` como tiebreaker (`DrizzleIssueRepository.listByProject`)

**Métricas observáveis:**

- p95 listagem de issues **≤200ms** (com índice acionado)
- p95 dashboard agregado **≤500ms**
- Hit rate cache busca **≥70%**

### 2B. Registro de Decisões Arquiteturais (ADRs)

Os ADRs vivem em `/adrs` no repositório. Foram registradas **9 ADRs** (mínimo do edital: 5), uma das quais (ADR-0008) documenta uma **decisão revertida** conforme recomendação explícita do edital.

| # | Título | Status | Autor |
|---|--------|--------|-------|
| [0001](../adrs/0001-modular-monolith-vs-microservices.md) | Modular Monolith vs Microservices | Accepted | Agente A |
| [0002](../adrs/0002-hexagonal-clean-architecture-per-module.md) | Hexagonal / Clean Architecture per Module | Accepted | Agente A |
| [0003](../adrs/0003-drizzle-vs-prisma-vs-raw-sql.md) | Drizzle ORM vs Prisma vs raw SQL | Accepted | Agente A |
| [0004](../adrs/0004-supabase-auth-vs-nextauth-lucia.md) | Supabase Auth vs NextAuth vs Lucia | Accepted | Agente B |
| [0005](../adrs/0005-rest-openapi-vs-graphql.md) | REST + OpenAPI vs GraphQL vs gRPC | Accepted | Agente A |
| [0006](../adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md) | BullMQ + Upstash vs Inngest vs Vercel Cron | Accepted | Agente B |
| [0007](../adrs/0007-outbox-pattern.md) | Outbox Pattern para entrega confiável de eventos | Accepted | Agente A |
| [0008](../adrs/0008-fts-postgres-vs-meilisearch.md) | FTS Postgres vs MeiliSearch (**reversão**) | Accepted (supersedes earlier MeiliSearch proposal) | Agente B |
| [0009](../adrs/0009-activity-log-inline-capture.md) | Activity Log inline capture per use case (Memento) | Accepted | Agente A |

Cada ADR contém: contexto, decisão, consequências (positivas/negativas/neutras), e alternativas consideradas. ADR-0008 (a ser escrita pelo Agente B no stint B7) documentará a reversão: inicialmente a equipe considerou MeiliSearch como motor de busca dedicado, e revertou para Full-Text Search do Postgres ao reavaliar o custo operacional vs ganho.

---

## 3. Estilo Arquitetural

### 3A. Plano macro — Monolito Modular

O sistema é um **monolito modular** com bounded contexts explícitos em `src/modules/<contexto>/`. A justificativa completa está em [ADR-0001](../adrs/0001-modular-monolith-vs-microservices.md). Em síntese:

- Equipe pequena (2 agentes) — overhead operacional de microsserviços (network, observabilidade distribuída, contratos versionados, deploys independentes) não se paga
- Sem requisito real de escalar módulos independentemente
- Vercel hospeda Next.js bem; runtime único simplifica deploy
- Fronteiras explícitas (via barrel `index.ts`) permitem extrair microsserviços no futuro sem reescrita

Os módulos atuais:

```
src/modules/
├── workspaces/    (Agente A — A5)
├── projects/      (Agente A — A7)
├── issues/        (Agente A — A6/A7/A8)
├── comments/      (Agente A — A10)
├── labels/        (Agente A — A10)
├── auth-rls/      (Agente B — B1)
├── webhooks/      (Agente B — B2/B3)
├── notifications/ (Agente B — B4/B5)
├── sprints/       (Agente B — B6)
├── search/        (Agente B — B7)
├── timetracking/  (Agente B — B9)
├── reports/       (Agente B — B10)
└── import/        (Agente B — B8)
```

Diagrama C4 nível 1 (contexto) em [`diagrams/c4-context.puml`](../diagrams/c4-context.puml).

### 3B. Plano interno — Hexagonal + Clean Architecture por módulo

Cada bounded context segue Hexagonal (Cockburn) combinado com Clean Architecture (Martin):

```
src/modules/<contexto>/
├── domain/           # TypeScript puro: entities, value objects, eventos
├── application/
│   ├── use-cases/    # 1 use case = 1 arquivo (SRP)
│   ├── ports/        # interfaces (DIP)
│   └── dto/          # input/output dos use cases
├── infrastructure/   # adapters concretos (Drizzle, Supabase, Redis)
├── interface/        # Next.js handlers + server actions
└── index.ts          # public barrel + factory createXxxModule(deps)
```

Regras de dependência:

1. `domain/` nunca importa `application/`, `infrastructure/`, ou framework
2. `application/` importa só `domain/` e ports locais (DIP)
3. `infrastructure/` implementa ports; importa libs externas
4. `interface/` delega imediatamente a use cases (sem regra de negócio)

Justificativa em [ADR-0002](../adrs/0002-hexagonal-clean-architecture-per-module.md).

Diagrama C4 nível 2 (containers) em [`diagrams/c4-container.puml`](../diagrams/c4-container.puml).

---

## 4. Aplicação dos Princípios SOLID

Cada princípio é demonstrado com **trecho real de código do repositório**, junto com explicação técnica e análise do efeito.

### 4.1. SRP — Single Responsibility Principle

> *"Uma classe deve ter apenas uma razão para mudar."* — Robert C. Martin

Cada use case tem uma única responsabilidade. Exemplo: `IssueStateMachine` em `src/modules/issues/domain/state/IssueStateMachine.ts` apenas decide se uma transição é válida — não persiste, não autoriza, não publica eventos.

```ts
// src/modules/issues/domain/state/IssueStateMachine.ts
export const IssueStateMachine = {
  of(status: IssueStatus): IssueState { return STATES[status]; },
  canTransition(from, to, ctx): boolean { return STATES[from].attempt(to, ctx).ok; },
  transition(from, to, ctx): Result<IssueStatus, InvalidTransitionError> {
    return STATES[from].attempt(to, ctx);
  },
} as const;
```

**Efeito:** mudanças no workflow (adicionar estado, regra de transição) não tocam persistência, eventos ou autorização. Mudanças em persistência (mudar Drizzle por outro ORM) não tocam o state machine.

### 4.2. OCP — Open-Closed Principle

> *"Entidades de software devem estar abertas para extensão, fechadas para modificação."* — Bertrand Meyer

Demonstrado pela port `RetryStrategy` (Agente B, B3) e pelo registry de estados em `IssueStateMachine`:

```ts
// src/modules/issues/domain/state/IssueState.ts
export interface IssueState {
  readonly name: IssueStatus;
  attempt(next: IssueStatus, ctx: IssueStateContext): Result<IssueStatus, InvalidTransitionError>;
}

// Adicionar um novo estado (ex: BlockedState) cria classe + entrada no registry,
// SEM alterar IssueStateMachine ou TransitionIssue use case.
```

**Efeito:** novos canais de notificação, novas políticas de retry, novos estados podem ser plugados sem alterar callers.

### 4.3. LSP — Liskov Substitution Principle

> *"Subtipos devem ser substituíveis por seus tipos base."* — Barbara Liskov

`WebhookSigner` (Agente B, B3) tem implementações `HmacSha256Signer`, `HmacSha1Signer` e `Ed25519Signer`. Todas honram o mesmo contrato (`sign(payload, secret): string`) e são substituíveis sem que os callers percebam diferença. O contrato é deliberadamente minimalista — uma propriedade `algo` para introspecção e um único método puro `sign()`:

```ts
// src/modules/webhooks/infrastructure/sign/WebhookSigner.ts
export interface WebhookSigner {
  readonly algo: string;
  // Assina o payload (corpo serializado) com o segredo/chave do endpoint e
  // devolve a assinatura codificada (o header X-Trackr-Signature do B3 worker).
  sign(payload: string, secret: string): string;
}
```

O ponto central do LSP é que o worker de entrega **não conhece** o algoritmo: ele apenas resolve o signer pela configuração do endpoint e invoca `sign()`. A seleção é encapsulada na função `signerFor`, e o worker usa o resultado de forma opaca — `signerFor(endpoint.signatureAlgo).sign(body, endpoint.secret)`:

```ts
// src/modules/webhooks/infrastructure/queue/workers/webhook-worker.ts
const body = JSON.stringify({ event: delivery.eventType, data: delivery.payload });
const signature = signerFor(endpoint.signatureAlgo).sign(body, endpoint.secret);
```

**Análise.** Cada implementação preserva o contrato sem fortalecer pré-condições nem enfraquecer pós-condições: todas aceitam qualquer `payload`/`secret` em `string` e devolvem sempre uma `string` de assinatura prefixada (`sha256=`, `sha1=`, `ed25519=`). A `HmacSha256Signer` e a `HmacSha1Signer` diferem apenas no algoritmo de hash interno; a `Ed25519Signer` muda inclusive a semântica do `secret` (passa a ser uma chave privada PEM em vez de um segredo simétrico) e a codificação de saída (base64), mas **isso permanece invisível ao caller** porque o contrato exige só `(string, string) → string`. Justamente por isso qualquer um dos três é um *drop-in*: trocar o algoritmo de um endpoint não toca uma linha do worker. Esse é o LSP em sua forma mais útil — substituibilidade comportamental que torna o caller imune à proliferação de implementações, complementando o OCP da §4.2 (um algoritmo novo é uma classe nova mais um `case` em `signerFor`, sem alterar consumidores).

### 4.4. ISP — Interface Segregation Principle

> *"Clientes não devem ser forçados a depender de interfaces que não usam."* — Robert C. Martin

Demonstrado em `src/shared/outbox/Outbox.ts`: os papéis de escrita e leitura do Outbox são **ports separadas**, mesmo sendo implementados pelo mesmo adapter (`DrizzleOutboxStore`).

```ts
// src/shared/outbox/Outbox.ts
export interface OutboxWriter {
  enqueue(event: DomainEvent): Promise<void>;
}
export interface OutboxReader {
  fetchUnpublished(limit: number): Promise<OutboxRecord[]>;
  markPublished(ids: ReadonlyArray<string>, at: Date): Promise<void>;
}
export interface OutboxStore extends OutboxWriter, OutboxReader {}
```

**Efeito:** use cases recebem apenas `OutboxWriter`; o `OutboxRelay` recebe apenas `OutboxReader`. Nenhum cliente é forçado a conhecer métodos que não usa.

O mesmo princípio reaparece no módulo de busca (Agente B, B7). A leitura de issues para pesquisa é exposta por uma port read-only — `IssueSearcher` — deliberadamente separada das ports de escrita/repositório do módulo `issues`. Quem só pesquisa depende apenas de um método:

```ts
// src/modules/search/application/ports/IssueSearcher.ts
import type { SearchQuery, SearchResult } from "../../domain";

// SOLID: ISP — port read-only de busca, deliberadamente separada das ports de
// escrita/repositório (IssueWriter/Repository). Quem só pesquisa depende apenas
// disto; o adapter de FTS implementa só esta operação.
export interface IssueSearcher {
  search(query: SearchQuery): Promise<SearchResult>;
}
```

**Análise.** A `IssueSearcher` é uma interface de um método só. Um cliente que apenas consulta — o use case de busca, o handler HTTP, o `CachedSearcher` decorador da §6.7 — não é forçado a depender de `save`, `findById`, `listChildren` ou qualquer operação de mutação do repositório de issues. Isso traz três ganhos concretos: (1) o adapter de FTS sobre Postgres (`PostgresFtsSearcher`) implementa **só** `search()`, sem stubs vazios para métodos de escrita que não fazem sentido num motor de busca; (2) o decorador de cache pode embrulhar a port inteira porque ela tem uma superfície mínima e coesa; (3) a fronteira de dependência entre os módulos `search` e `issues` fica nítida — o `search` lê o read-model, não comanda o ciclo de vida das issues. Em conjunto com a separação `OutboxWriter`/`OutboxReader` acima, esses dois exemplos mostram o ISP atuando tanto sobre um adapter de papel duplo (Outbox) quanto sobre a divisão leitura/escrita entre módulos (search vs. issues).

### 4.5. DIP — Dependency Inversion Principle

> *"Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações."* — Robert C. Martin

Demonstrado em **todos os use cases**: dependem de `XxxRepository` (interface em `application/ports/`), nunca de `DrizzleXxxRepository` (em `infrastructure/`). Exemplo:

```ts
// src/modules/workspaces/application/use-cases/CreateWorkspace.ts
export interface CreateWorkspaceDeps {
  repo: WorkspaceRepository;   // port, não DrizzleWorkspaceRepository
  clock: Clock;                 // port
  ids: IdGenerator;             // port
  events: EventBus;             // port
}

export class CreateWorkspace {
  constructor(private readonly deps: CreateWorkspaceDeps) {}
  async execute(input: CreateWorkspaceInput): Promise<Result<...>> {
    // usa this.deps.repo sem saber qual adapter concreto
  }
}
```

A injeção dos adapters concretos acontece no composition root (`src/app/_bootstrap.ts`).

**Efeito:** trocar adapter (Drizzle → outro ORM) ou stub para teste (FakeRepository em vitest) é trivial; testes unitários rodam sem subir Postgres.

---

## 5. Clean Code

### 5.1. Nomes claros e descritivos

Identificadores são autoexplicativos e refletem o domínio: `IssueStateMachine`, `WorkspaceMember.isOwner()`, `Project.allocateNextIssueNumber`. Funções sem prefixos genéricos como `do*` ou `process*`.

### 5.2. Funções pequenas, com responsabilidade única

Use cases têm método único `execute()` com ≤30 linhas em média. Métodos de entidade (`Workspace.rename`, `Issue.transitionTo`) operam sobre 1 invariante.

### 5.3. Ausência de duplicação significativa

Validações comuns (formato de slug, datas) encapsuladas em factories estáticas (`Workspace.create`, `Project.create`). Pattern de use case (auth → validate → execute → persist → publish event) é replicado mas instanciado pela factory `createXxxModule`.

### 5.4. Baixo acoplamento, alta coesão

Cada módulo (`workspaces/`, `issues/`) é um bounded context isolado. Cross-module imports só via barrel (`index.ts`). Domínios não compartilham entidades — apenas IDs como strings.

### 5.5. Comentários reservados para o "porquê"

Comentários explicam **decisão**, não **mecânica**. Exemplos:

```ts
// SOLID: DIP — depende de port WorkspaceRepository, não de adapter.
// ADR-0007 acknowledges this cross-table touch within IssueRepository.
// GoF: Composite — Issue é tanto Leaf quanto parte de composição.
```

Não há comentários do tipo `// increment i by 1`.

### 5.6. Tratamento de erros explícito

`Result<T, DomainError>` em vez de `throw` para erros previsíveis. Cada erro tem `code` e `meta` estruturados, mapeados a `application/problem+json` pelo helper `domainErrorToProblem`.

### 5.7. Testabilidade

133 testes unitários (vitest), executando em < 1s. Domínio inteiramente testável sem framework.

---

## 6. Padrões de Projeto GoF

**Mínimo do edital:** 3. **Implementados:** 7. Cada padrão resolve **problema real** do projeto, não preenche checklist.

### 6.1. State (Comportamental) — Agente A

**Problema:** as transições de Issue têm regras específicas por estado (ex: `in_review → done` exige `approver`, `canceled` é terminal). Um switch/if gigante seria frágil.

**Implementação:** `src/modules/issues/domain/state/`. Cada estado é uma classe (`BacklogState`, `TodoState`, `InProgressState`, `InReviewState`, `DoneState`, `CanceledState`) que conhece suas transições válidas.

```ts
export class InReviewState implements IssueState {
  readonly name: IssueStatus = "in_review";
  attempt(next, ctx) {
    if (next === "done") {
      if (!ctx.approverId) return err(new InvalidTransitionError(this.name, next, { reason: "approver_required" }));
      return ok(next);
    }
    if (next === "in_progress" || next === "canceled") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}
```

**Benefício:** novos estados ou regras (ex: `blocked` com regras próprias) são classes novas. **Custo:** mais arquivos pequenos vs. um switch único — aceito.

### 6.2. Composite (Estrutural) — Agente A

**Problema:** Issues têm sub-tasks recursivas. Operações como cálculo de progresso, listagem de árvore e visitação precisam tratar leaf e composite uniformemente.

**Implementação:** `src/modules/issues/domain/IssueTree.ts`. `IssueTree` envolve um Issue root + filhos (recursivos) e expõe `size()`, `depth()`, `walk(visitor)`, `progressPercent()`.

```ts
export class IssueTree {
  constructor(public readonly root: Issue, public readonly children: ReadonlyArray<IssueTree>) {}
  progressPercent(): number { /* recursivo */ }
  walk(visitor: (i: Issue, depth: number) => void): void { /* pre-order */ }
}
```

**Benefício:** cliente trata árvore inteira ou folha com a mesma interface. **Custo:** carregar a árvore exige varredura adicional no repo (`listChildren`).

### 6.3. Memento (Comportamental) — Agente A

**Problema:** Activity Log precisa capturar o estado completo da Issue antes e depois de cada mudança, com diff legível, sem acoplar a lógica de captura ao Issue.

**Implementação:**

- Entity: `src/modules/issues/domain/ActivitySnapshot.ts` — `ActivitySnapshot.capture(before, after, ...)` produz um Memento imutável com `before`, `after`, `diff` estrutural e `action`.
- Persistência: `ActivityRepository` port + `DrizzleActivityRepository` adapter. Cada use case que altera estado (`CreateIssue`, `TransitionIssue`, `AssignIssue`, `EditIssue`, `SetPriority`) persiste o snapshot inline na mesma transação lógica do save da entity — decisão registrada em [ADR-0009](../adrs/0009-activity-log-inline-capture.md).
- API: `GET /api/v1/issues/{id}/activity?limit=` retorna a timeline (newest first).

**Benefício:** time-travel debug, UI rica ("Maria mudou prioridade Low → High"), audit log. Atomicidade trivial (Drizzle transação cobre save+activity). **Custo:** payload de cada activity é grande (snapshot completo) — aceito porque mudanças são pouco frequentes.

### 6.4. Observer (Comportamental) — Agente A

**Problema:** mudanças de estado disparam side-effects independentes: activity log, notificação ao assignee, webhook de saída, broadcast realtime. Cada um pode falhar sem afetar os outros.

**Implementação:** `src/shared/events/EventBus.ts` (port) + `InMemoryEventBus` (adapter). Use cases publicam `DomainEvent`s; subscribers se registram por tipo.

**Benefício:** desacoplamento total entre quem muda estado e quem reage. **Custo:** fluxo distribuído é mais difícil de depurar — mitigado por `correlation_id` nos logs.

### 6.5. Strategy (Comportamental) — Agente B

**Problema:** políticas de retry de webhook variam por endpoint (Exponential, Linear, Fixed). Ranking de busca varia por contexto.

**Implementação:** o padrão Strategy aparece em **três** pontos independentes do trabalho do Agente B, sempre com a mesma forma: uma interface de estratégia + estratégias concretas intercambiáveis + uma função seletora exaustiva que mapeia um *dado* de configuração para o *comportamento*.

1. `src/modules/webhooks/application/retry/RetryStrategy.ts` (B3) — `ExponentialRetry`, `LinearRetry`, `FixedRetry`, selecionadas por `retryStrategyFor(policy)`.
2. `src/modules/search/application/ranking/RankingStrategy.ts` (B7) — `RelevanceRanking`, `DateRanking`, `PriorityRanking`, selecionadas por `rankingFor(key)`.
3. `src/modules/import/application/parsers/Parser.ts` (B8) — `CsvParser`, `JsonParser`, selecionadas por `parserFor(format)`.

O exemplo abaixo mostra a interface de ranking e a função seletora correspondente:

```ts
// src/modules/search/application/ranking/RankingStrategy.ts
export interface RankingStrategy {
  readonly key: RankingKey;
  sort(hits: SearchHit[]): SearchHit[]; // PURO: retorna novo array, nunca muta
}

// src/modules/search/application/ranking/index.ts
export function rankingFor(key: RankingKey): RankingStrategy {
  switch (key) {
    case "relevance": return new RelevanceRanking();
    case "date":      return new DateRanking();
    case "priority":  return new PriorityRanking();
  }
}
```

**Análise.** Os três casos resolvem problemas distintos — backoff de retry, ordenação de resultados, parsing de formatos de importação — mas compartilham a mesma estrutura GoF: o caller depende apenas da abstração (`RetryStrategy`, `RankingStrategy`, `Parser`) e a estratégia concreta é resolvida em runtime a partir de um dado configurável (a `RetryPolicy` do endpoint, a `RankingKey` da query, o `ParseFormat` do upload). Isso liga o Strategy diretamente ao OCP da §4.2: cada `switch` seletor é **exaustivo** sobre uma *union* de TypeScript, de modo que acrescentar uma estratégia nova é criar uma classe e um `case` — o compilador acusa o `case` faltante, e nenhum caller existente muda. A escolha do Strategy em vez de condicionais espalhadas pelos callers evita o anti-padrão de `if (policy === "exponential") … else if …` duplicado no worker, no scheduler e nos testes; a lógica de cada algoritmo fica isolada, testável em separado (cada estratégia tem seu `*.test.ts`) e reutilizável. O custo é o de sempre no Strategy: mais arquivos pequenos e uma indireção a mais — aceito, dado o ganho de extensibilidade e a cobertura de teste granular.

### 6.6. Factory Method (Criação) — Agente B

**Problema:** `Notification` tem subtipos por canal (Email, Push, InApp, Webhook) com payloads diferentes.

**Implementação:** `src/modules/notifications/application/NotificationFactory.ts` (B4). Um Creator abstrato declara o factory method `create`; cada Creator concreto fabrica o `Notification` do seu canal:

```ts
// src/modules/notifications/application/NotificationFactory.ts
export abstract class NotificationFactory {
  abstract create(payload: NotificationPayload): Notification;
}

export class EmailNotificationFactory extends NotificationFactory {
  create(payload: NotificationPayload): Notification {
    return new EmailNotification(payload);
  }
}
// PushNotificationFactory, InAppNotificationFactory, WebhookNotificationFactory: idem

export function notificationFactoryFor(channel: Channel): NotificationFactory {
  switch (channel) {
    case "email":   return new EmailNotificationFactory();
    case "push":    return new PushNotificationFactory();
    case "in_app":  return new InAppNotificationFactory();
    case "webhook": return new WebhookNotificationFactory();
  }
}
```

**Análise.** Este é o Factory Method canônico do GoF: a classe-base `NotificationFactory` define o método-fábrica abstrato `create`, e cada subclasse concreta decide qual Product instanciar — `EmailNotification`, `PushNotification`, `InAppNotification` ou `WebhookNotification` — sem que o cliente conheça o construtor concreto. O cliente trabalha sobre o tipo `Notification` (o Product abstrato) e delega a instanciação ao Creator, o que mantém o ponto de criação único e localizado. Vale a distinção em relação ao Strategy da §6.5: lá as funções `xxxFor` selecionam um *algoritmo* (comportamento) já implementado; aqui a hierarquia de `NotificationFactory` existe para **construir** objetos por canal, com payloads diferentes. A função `notificationFactoryFor` apenas resolve o Creator concreto a partir do `Channel`, novamente com `switch` exaustivo sobre a union — então adicionar um canal (por exemplo SMS) é criar um par Product+Creator e um `case`, sem tocar nos callers (SOLID: OCP). O benefício prático é que o use case `SendNotification` permanece agnóstico ao canal; o custo é a clássica explosão de classes paralelas (um Creator por Product), aceitável dado o número pequeno e estável de canais.

### 6.7. Decorator (Estrutural) — Agente B

**Problema:** Cache de busca precisa ser opcional e composável sobre o searcher real.

**Implementação:** `src/modules/search/infrastructure/CachedSearcher.ts` (B7). O `CachedSearcher` implementa a mesma port `IssueSearcher` e embrulha um `inner` searcher, interpondo uma camada de cache:

```ts
// src/modules/search/infrastructure/CachedSearcher.ts
export class CachedSearcher implements IssueSearcher {
  constructor(
    private readonly inner: IssueSearcher,
    private readonly cache: Cache,
    private readonly ttlSeconds: number,
  ) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const key = cacheKey(query);
    const cached = await this.cache.get<SearchResult>(key);
    if (cached !== null) return cached;            // cache hit
    const result = await this.inner.search(query); // miss -> delega ao inner
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }
}
```

**Análise.** O Decorator adiciona responsabilidade (caching) a um objeto **transparentemente**: como o `CachedSearcher` implementa `IssueSearcher` e recebe outro `IssueSearcher` por composição, ele é indistinguível do searcher real do ponto de vista do caller, que continua dependendo só da port. O componente embrulhado — o `PostgresFtsSearcher` — não sabe que está sendo decorado, e a decisão de cachear ou não é tomada no composition root: em `createSearchModule`, o searcher de FTS só é embrulhado quando há um `Cache` disponível (`deps.cache ? new CachedSearcher(base, …) : base`). Isso é a vantagem central do Decorator sobre herança: o comportamento extra é **composável e opcional** em runtime, sem subclasses do searcher concreto e sem condicionais de cache vazando para dentro do FTS. A função `cacheKey` normaliza a query (campos em ordem fixa, defaults explícitos) para que consultas equivalentes colidam na mesma chave, sustentando o atributo de Performance Efficiency da §2A.3 (hit rate de cache ≥70%). O custo é a indireção extra por chamada e a necessidade de invalidação/TTL coerente — mitigado pelo `ttlSeconds` configurável e por chaves determinísticas.

---

## 7. Design de API

### 7.1. Estilo e justificativa

**REST + OpenAPI 3.1**, com spec gerada de schemas Zod via `@asteasolutions/zod-to-openapi`. Justificativa completa em [ADR-0005](../adrs/0005-rest-openapi-vs-graphql.md): tooling universal, auth Supabase simples, OpenAPI = código (sem drift), Next.js App Router nativo.

### 7.2. Especificação

Arquivo: [`openapi/trackr.json`](../openapi/trackr.json). Gerado por `npm run openapi:generate` (`scripts/generate-openapi.ts`). Visualizável em [editor.swagger.io](https://editor.swagger.io).

### 7.3. Versionamento

**URL** (`/api/v1/...`). Próximas major versions: `/api/v2/...` em paralelo até depreciação completa do `/v1/`.

### 7.4. Convenções

| Aspecto | Convenção |
|---------|-----------|
| Status codes | 2xx sucesso; 4xx cliente (validação 422, auth 401, autorização 403); 5xx servidor |
| Erros | RFC 7807 Problem Details (`application/problem+json`) com `type`, `title`, `status`, `detail`, e campos extra |
| Paginação | Cursor opaco (base64 de `(updatedAt, id)`); query `?cursor=&limit=` (default 50, max 200); resposta `{ items, next_cursor }` |
| Auth | `Authorization: Bearer <JWT-Supabase>` em todos endpoints exceto health |
| Idempotência | Header `Idempotency-Key` opcional em mutações (futuro) |

### 7.5. Endpoints implementados (Agente A)

| Método | Path | Descrição |
|--------|------|-----------|
| GET / POST | `/api/v1/workspaces` | Listar / criar workspace |
| GET | `/api/v1/workspaces/{workspaceId}` | Detalhe |
| GET / POST | `/api/v1/workspaces/{workspaceId}/projects` | Listar / criar projeto |
| GET / POST | `/api/v1/projects/{projectId}/issues` | Listar (filtro + cursor) / criar issue |
| GET / PATCH | `/api/v1/issues/{issueId}` | Detalhe / editar |
| POST | `/api/v1/issues/{issueId}/transitions` | Transição de estado (state machine) |
| GET / POST | `/api/v1/issues/{issueId}/comments` | Listar / criar comentário |
| GET | `/api/v1/issues/{issueId}/activity` | Timeline de mudanças (Memento snapshots, newest first) |
| GET / POST | `/api/v1/projects/{projectId}/labels` | Listar / criar label |

### 7.6. Capacidades dos módulos do Agente B (webhooks, notifications, sprints, timetracking, search)

Os módulos entregues pelo Agente B (webhooks, notifications, sprints, timetracking, search) foram construídos como **use cases por trás de factories de composição** (`createXxxModule(deps)`), seguindo a mesma Hexagonal/Clean dos módulos do Agente A. Sendo honesto quanto à superfície HTTP: dentre esses módulos, **apenas reports já tem rota REST publicada** sob `/api/v1/projects/{projectId}/reports/*`; os demais expõem suas capacidades como use cases consumidos pela UI cliente (B11) via **server actions** em sessão separada. As tabelas abaixo documentam o que cada módulo expõe (sua factory + use cases), sem inventar endpoints que não existem.

**Endpoints REST efetivamente publicados (módulo reports, B10):**

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/v1/projects/{projectId}/reports/throughput` | Throughput (issues concluídas por período) |
| GET | `/api/v1/projects/{projectId}/reports/cycle-time` | Cycle time agregado do projeto |
| GET | `/api/v1/projects/{projectId}/reports/status-distribution` | Distribuição de issues por status |

**Capacidades expostas como use cases (factory por módulo, consumo via server actions em B11):**

| Módulo (factory) | Use cases / capacidades | Adapter principal |
|------------------|-------------------------|-------------------|
| `createWebhooksModule` | `CreateEndpoint`, `ListEndpoints`, `DeleteEndpoint`, `EnqueueDelivery`, `RecordAttempt` | `DrizzleWebhookRepository`, `DeliveryQueue` (BullMQ/InMemory) |
| `createNotificationsModule` | `SendNotification`, `UpdatePreferences`, `SubscribeUserToTopic`, `registerSubscribers()` (Observer) | `DrizzleNotificationRepository`, mapa de canais |
| `createSprintsModule` | `CreateSprint`, `StartSprint`, `CloseSprint`, `AddIssueToSprint`, `RemoveIssueFromSprint`, `GetActiveSprint` | `DrizzleSprintRepository` |
| `createTimetrackingModule` | `LogTime`, `EditEntry`, `DeleteEntry`, `GetUserSummary`, `GetIssueTotal` | `DrizzleTimeEntryRepository` |
| `createSearchModule` | `searcher.search(query)` (FTS + cache opcional via Decorator) | `PostgresFtsSearcher` (+ `CachedSearcher`) |
| `createReportsModule` | `GetProjectThroughput`, `GetProjectCycleTime`, `GetProjectStatusDistribution`, `GetSprintVelocity`, `GetSprintBurndown` | `DrizzleReportReader` |
| `createImportModule` | `ImportIssues`, `DryRunImport` (Strategy de parser CSV/JSON) | sem schema próprio — escreve via port `IssueCreator` |

Cada factory é o composition root do módulo (SOLID: DIP) — liga os adapters Drizzle/queue aos use cases num único lugar, sem singleton global. O contrato de cada use case é um `execute(input): Promise<Result<Output, Error>>`, pronto para ser invocado tanto por um futuro route handler quanto pela server action que a UI cliente (B11) consome. A superfície HTTP/UI dos módulos webhooks, notifications, sprints, timetracking e search é entregue em **B11**; até lá, esses módulos são exercitados pelos seus testes unitários e pela factory diretamente.

---

## 8. Diagramas e Modelos

### 8.1. C4 nível 1 — Contexto

Fonte: [`diagrams/c4-context.puml`](../diagrams/c4-context.puml). Mostra Trackr como sistema central, atores (Dev, PM, Admin) e sistemas externos (Supabase, Upstash, Resend, Web Push, integrações).

Versão Mermaid embutida para renderização GitHub:

```mermaid
flowchart TB
    classDef person fill:#08427B,stroke:#073B6F,color:#fff,stroke-width:2px
    classDef system fill:#1168BD,stroke:#0E5BA6,color:#fff,stroke-width:2px
    classDef external fill:#999999,stroke:#6B6B6B,color:#fff,stroke-width:2px

    Dev(["👤 Desenvolvedor<br/>resolve issues"]):::person
    PM(["👤 PM / Tech Lead<br/>planeja sprints"]):::person
    Admin(["👤 Workspace Owner<br/>configura webhooks"]):::person

    Trackr["🟦 Trackr<br/>Issue tracker modular<br/>Workspaces · Projects · Issues<br/>Sprints · Dashboards · Webhooks"]:::system

    Supabase[("Supabase<br/>Auth + Postgres + Realtime")]:::external
    Upstash[("Upstash Redis<br/>Cache + Filas BullMQ")]:::external
    Resend["Resend<br/>Email transacional"]:::external
    WebPush["Web Push<br/>Browser vendors (VAPID)"]:::external
    Integ["Integrações externas<br/>Slack · Discord · GitHub"]:::external

    Dev -->|HTTPS| Trackr
    PM -->|HTTPS| Trackr
    Admin -->|HTTPS| Trackr

    Trackr -->|JWT + SQL + WS| Supabase
    Trackr -->|REST| Upstash
    Trackr -->|REST| Resend
    Trackr -->|HTTPS + VAPID| WebPush
    Trackr -->|HTTPS + HMAC-SHA256| Integ
```

### 8.2. C4 nível 2 — Containers

Fonte: [`diagrams/c4-container.puml`](../diagrams/c4-container.puml). Detalha a fronteira interna do Trackr: Web App (Next.js), Background Workers (Node + BullMQ), Postgres e Redis.

Versão Mermaid embutida:

```mermaid
flowchart TB
    classDef user fill:#08427B,stroke:#073B6F,color:#fff
    classDef container fill:#438DD5,stroke:#3678B7,color:#fff
    classDef db fill:#438DD5,stroke:#3678B7,color:#fff,stroke-dasharray: 5 5
    classDef external fill:#999999,stroke:#6B6B6B,color:#fff

    User(["👤 Usuário"]):::user

    subgraph Trackr["🟦 Trackr"]
        direction TB
        Web["Web Application<br/>Next.js 15 + React 19<br/>UI + Server Actions + Route Handlers"]:::container
        Workers["Background Workers<br/>Node.js + BullMQ<br/>Webhook delivery, notifications, outbox relay"]:::container
        DB[("Postgres<br/>Supabase<br/>Schemas por módulo + RLS + outbox + materialized views")]:::db
        Redis[("Redis<br/>Upstash<br/>Cache + filas BullMQ")]:::db
    end

    SupaAuth["Supabase Auth<br/>JWT + RLS"]:::external
    SupaRT["Supabase Realtime"]:::external
    Resend["Resend"]:::external
    WebPush["Web Push"]:::external
    Integ["Integrações externas"]:::external

    User -->|HTTPS| Web
    Web -->|JWT verify| SupaAuth
    Web -->|SQL via Drizzle| DB
    Web -->|REST cache| Redis
    Web -->|Publish events| SupaRT

    Workers -->|Read outbox, write attempts| DB
    Workers -->|Consume queues| Redis
    Workers -->|Send| Resend
    Workers -->|Send| WebPush
    Workers -->|HMAC-signed| Integ

    SupaRT -.->|WebSocket| User
```

### 8.3. Diagrama de classes — GoF aplicados

Fonte: [`diagrams/classes-gof.puml`](../diagrams/classes-gof.puml). Mostra State, Composite, Memento, Observer no contexto de issues (versão Mermaid abaixo para renderização em GitHub).

```mermaid
classDiagram
  class IssueState {
    <<interface>>
    +name: IssueStatus
    +attempt(next, ctx): Result
  }
  class BacklogState
  class TodoState
  class InProgressState
  class InReviewState {
    +attempt(): requires approver for done
  }
  class DoneState
  class CanceledState {
    +attempt(): always Err (terminal)
  }
  IssueState <|.. BacklogState
  IssueState <|.. TodoState
  IssueState <|.. InProgressState
  IssueState <|.. InReviewState
  IssueState <|.. DoneState
  IssueState <|.. CanceledState

  class IssueStateMachine {
    <<static>>
    +of(status): IssueState
    +transition(from, to, ctx): Result
  }
  IssueStateMachine ..> IssueState

  class Issue {
    -props: IssueProps
    +transitionTo(next, at): Result
    +assign(userId, at): Issue
  }
  Issue ..> IssueStateMachine

  class IssueTree {
    +size(): number
    +walk(visitor): void
    +progressPercent(): number
  }
  IssueTree "1" o-- "*" Issue

  class ActivitySnapshot {
    +before: IssueProps?
    +after: IssueProps
    +diff: IssueDiff
  }
  ActivitySnapshot ..> Issue : captures
```

### 8.4. Diagrama de sequência — Transição de issue

Fonte: [`diagrams/sequence-issue-transition.puml`](../diagrams/sequence-issue-transition.puml). Mostra o fluxo end-to-end de `POST /api/v1/issues/{id}/transitions`: auth → validação Zod → use case → state machine → repo → eventos → resposta (sucesso ou Problem Details).

Versão Mermaid embutida para renderização nativa no GitHub:

```mermaid
sequenceDiagram
    autonumber
    participant U as User<br/>(Dev/PM)
    participant H as Next.js<br/>route handler
    participant Auth as requireAuth
    participant UC as TransitionIssue<br/>use case
    participant Repo as IssueRepository
    participant Issue as Issue<br/>entity
    participant SM as IssueStateMachine<br/>(GoF: State)
    participant ActR as ActivityRepository<br/>(ADR-0009)
    participant Bus as EventBus<br/>(GoF: Observer)

    U->>H: POST /transitions { to: in_progress }<br/>Bearer JWT
    H->>Auth: requireAuth(request)
    Auth-->>H: { ok, user }
    H->>UC: execute({ actorId, issueId, to })
    UC->>Repo: findById(issueId)
    Repo-->>UC: Issue
    UC->>Issue: transitionTo(to, now)
    Issue->>SM: transition(from, to, { approverId })
    alt allowed
        SM-->>Issue: Ok(status)
        Issue-->>UC: Ok(newIssue)
        UC->>Repo: save(newIssue)
        UC->>ActR: save(ActivitySnapshot.capture(before, after))
        Note over ActR: GoF: Memento
        UC->>Bus: publish(IssueTransitioned)
        Note right of Bus: subscribers: webhooks (B3),<br/>notifications (B5),<br/>realtime (B5)
        UC-->>H: Ok(issue)
        H-->>U: 200 { issue }
    else rejected
        SM-->>Issue: Err(InvalidTransitionError)
        Issue-->>UC: Err
        UC-->>H: Err
        H-->>U: 422 application/problem+json
    end
```

O diagrama acima evidencia, em uma só passagem, quatro padrões GoF (State na transição, Memento na captura, Observer no EventBus, Adapter implícito no Repository) e o atributo Reliability via Activity Log + ADR-0009.

### 8.5. Diagrama de sequência — Entrega de webhook (Outbox)

Fonte: [`diagrams/sequence-webhook-delivery.puml`](../diagrams/sequence-webhook-delivery.puml). Mostra o fluxo assíncrono: use case escreve no Outbox em transação → OutboxRelay despacha ao EventBus → WebhookSubscriber enfileira no BullMQ → worker aplica RetryStrategy + WebhookSigner → entrega ao endpoint externo.

Versão Mermaid embutida para renderização nativa no GitHub:

```mermaid
sequenceDiagram
    autonumber
    participant UC as Use case<br/>(ex: TransitionIssue)
    participant DB as Postgres<br/>(Outbox + tabelas)
    participant Relay as OutboxRelay
    participant ED as EnqueueDelivery<br/>use case
    participant Q as DeliveryQueue<br/>(BullMQ / Upstash)
    participant W as webhook-worker
    participant Sign as signerFor(algo)<br/>(GoF: LSP/Strategy)
    participant Ext as Endpoint externo<br/>(HTTPS)
    participant RA as RecordAttempt<br/>use case

    UC->>DB: BEGIN tx: save(aggregate) + outbox.enqueue(event)
    Note over UC,DB: Outbox Pattern — evento persiste na MESMA transação<br/>(zero perda se Redis cair — ADR-0007)
    DB-->>UC: COMMIT

    Relay->>DB: fetchUnpublished(limit)
    DB-->>Relay: OutboxRecord[]
    Relay->>ED: execute({ endpointId, eventType, payload })
    ED->>DB: deliveryRepo.save(WebhookDelivery)
    ED->>Q: enqueue(delivery)
    Relay->>DB: markPublished(ids, now)

    Q->>W: job { deliveryId }
    W->>DB: findById(delivery) + findById(endpoint)
    DB-->>W: delivery, endpoint
    W->>Sign: sign(body, endpoint.secret)
    Sign-->>W: x-trackr-signature
    W->>Ext: POST HTTPS { event, data } + assinatura
    alt 2xx
        Ext-->>W: 200 OK
        W->>RA: execute({ deliveryId, statusCode })
        Note over RA: delivery.status = delivered
    else falha (timeout / 5xx / 4xx)
        Ext-->>W: erro / status != 2xx
        W->>RA: execute({ deliveryId, statusCode, error })
        RA-->>W: delivery.status = failed
        Note over W,RA: GoF: Strategy — retryStrategyFor(endpoint.retryPolicy)
        alt strategy.shouldRetry(attempt)
            W->>Q: enqueueRetry(delivery, attempt+1,<br/>strategy.nextDelayMs(attempt+1))
        else maxAttempts atingido
            Note over W: dead-letter — não re-enfileira
        end
    end
```

O diagrama evidencia, numa só passagem, o **Outbox Pattern** (evento persistido na mesma transação do aggregate, garantindo zero perda — §2A.2 e ADR-0007), o **LSP** na assinatura (`signerFor(algo).sign()` chamado sem o worker conhecer o algoritmo — §4.3) e o **Strategy** no backoff (`retryStrategyFor(policy)` re-enfileirando com `nextDelayMs` ou fazendo *dead-letter* ao atingir `maxAttempts` — §6.5).

---

## 9. Conclusões

### 9.1. Resultados obtidos

`[parcial — completar após B12]`

A primeira metade do trabalho (stints A1–A12) entregou:

- **Núcleo de domínio** completo: 6 bounded contexts (workspaces, projects, issues, comments, labels, shared) com 6 use cases por módulo, todos hexagonais
- **3 ADRs base** (001, 002, 003) + **3 ADRs específicos** (005, 007, e estrutura para 004/006/008)
- **4 padrões GoF** implementados pelo Agente A (State, Composite, Memento, Observer) — já superando o mínimo de 3 do edital
- **133 testes unitários** verde, executando em < 1s sem subir framework
- **OpenAPI 3.1** gerada do código, com 14+ paths documentados
- **Outbox pattern** com ports separadas (ISP), adapter Drizzle, e relay com isolamento de falha por registro

### 9.2. Avaliação crítica da efetividade das práticas

Com os módulos do Agente B integrados (webhooks, notifications, sprints, timetracking, search, reports, import), é possível avaliar criticamente — e de forma balanceada — a efetividade das práticas adotadas, separando os ganhos reais dos custos pagos.

**Hexagonal/Clean por módulo: o maior acerto, com um imposto de boilerplate.** Repetir a estrutura `domain/application/infrastructure/interface` em cada bounded context provou seu valor justamente na fase B: módulos novos (search, sprints, timetracking) puderam ser escritos, testados e validados isoladamente, sem subir framework nem banco, porque o domínio só depende de ports. O `createSearchModule` ilustra o benefício composicional — embrulhar ou não o `PostgresFtsSearcher` num `CachedSearcher` é uma decisão de uma linha no composition root. O custo é honesto: cada módulo carrega uma camada de ports, DTOs e uma factory de composição que, para use cases simples (por exemplo `GetActiveSprint`, que é quase um *passthrough* para o repositório), beira o overengineering. A relação ports/lógica-de-negócio é alta em módulos finos.

**Result pattern vs. exceptions: corretude às custas de verbosidade.** Padronizar `Result<T, DomainError>` em todos os use cases (em vez de `throw`) força o tratamento explícito de cada erro previsível e elimina a classe de bugs de propagação esquecida — o `EnqueueDelivery`, por exemplo, encadeia `if (!created.ok) return created` em vez de confiar em try/catch distante. O preço é uma API mais cerimoniosa: cada chamada exige checagem de `.ok` antes de acessar `.value`, e os tipos de erro de cada use case (`CreateEndpointError`, `EnqueueDeliveryError`, …) multiplicam-se. É um trade-off favorável para um domínio que valoriza Reliability, mas inegavelmente mais verboso que exceptions.

**SOLID e os 7 padrões GoF: coerentes, não cosméticos — porém com risco de padrão por padrão.** Os princípios e padrões aqui resolvem problemas reais e se reforçam mutuamente: o Strategy (retry, ranking, parsers) é a materialização do OCP; o LSP dos signers torna o worker imune ao algoritmo; o Decorator de cache e o Factory Method de notificações isolam, respectivamente, *cross-cutting concern* e construção por canal. A repetição da forma "interface + concretas + seletor exaustivo sobre union" nos três Strategies é uma vantagem de consistência, mas também sinaliza um risco: a tentação de aplicar o mesmo molde mesmo quando um par de funções bastaria. A disciplina de só introduzir um padrão diante de um eixo de variação concreto (e não para preencher checklist) foi mantida, mas é um equilíbrio que exige vigilância.

**DI por factory: explícita e testável, ao custo de duplicação de wiring.** Resolver a injeção de dependência via `createXxxModule(deps)` em vez de um contêiner de IoC mágico mantém o grafo de dependências legível e sem singletons globais — cada factory mostra, num lugar só, quais adapters alimentam quais use cases. A contrapartida é que o padrão de wiring (`new DrizzleXxxRepository(db)` + `sharedDeps` + instanciação de cada use case) se repete quase idêntico entre módulos; é duplicação estrutural que um contêiner reduziria, à custa de magia e perda de rastreabilidade — uma troca que o trabalho fez conscientemente a favor da clareza.

**Custos honestos e dívidas reconhecidas.** Alguns pontos merecem crítica explícita. (1) **Placeholders de infraestrutura:** o `InMemoryDeliveryQueue` é um adapter-stub até o BullMQ real entrar em produção, e os use cases ainda publicam no `InMemoryEventBus` em vez de gravarem no `OutboxStore` — a integração Outbox→worker está estruturalmente pronta (ports separadas, relay, signer, strategy), mas o *refactor* das use cases para o fluxo transacional completo permanece no backlog (ADR-0007). (2) **Autorização potencialmente duplicada:** a segurança vive tanto nas RLS do Postgres quanto em verificações de domínio nos use cases; essa redundância é defensável como *defense-in-depth*, mas é dívida cognitiva — uma regra de acesso pode precisar mudar em dois lugares. (3) **Testes de integração adiados:** a cobertura forte é unitária (domínio testável via fakes); os adapters Drizzle e a entrega real de webhook sobre Redis ainda dependem de testes de integração com Postgres/Redis reais, planejados mas não concluídos. No saldo, as práticas entregaram o que prometeram — testabilidade via fakes, adapters trocáveis, extensibilidade por padrão — e os custos pagos (boilerplate, verbosidade do Result, wiring duplicado, placeholders) são proporcionais e, em sua maioria, conscientes e documentados.

Observações preliminares do Agente A:

- **Hexagonal por módulo** mostrou-se a decisão mais valiosa: testabilidade do domínio sem framework + trocabilidade de adapter é diferencial visível em cada teste de use case (cada um roda em < 1ms).
- **Result pattern em vez de throw** evita erros de propagação esquecida e força tratamento explícito. Custo: API mais verbosa que `try/catch`.
- **GoF State sobre Issue** eliminou um switch de 6 casos × 6 transições = 36 linhas de if/else e o substituiu por 6 classes pequenas testáveis.

### 9.3. Limitações e próximos passos

- Use cases ainda publicam direto ao `InMemoryEventBus`; a integração com `OutboxStore` está infraestruturalmente pronta mas o **refactor das use cases para gravar no Outbox em vez do bus** ficou no backlog (ADR-0007 aponta o caminho).
- Cobertura por feature: domínio ≥80%; adapters Drizzle exigem testes de integração com Postgres real (planejado em B12).
- A UI Next.js cliente entra em B11. Até lá, o sistema é exercitado pela API REST + curl.
- Não há ainda observabilidade (logs estruturados, traces). Para produção real, adicionar `pino` + correlation_id no middleware.

Observações do Agente B (infraestrutura periférica + features):

- **Superfície HTTP/UI pendente:** os módulos do Agente B (webhooks, notifications, sprints, timetracking, search) entregam casos de uso atrás de factories (`createXxxModule`); a exposição via rotas REST/server actions e a UI cliente são fechadas no stint **B11**. Até lá, são exercitados por testes unitários e (com credenciais) integração.
- **Dependências de serviço externo são plugáveis, não obrigatórias:** o worker BullMQ requer Redis **TCP** (`rediss://`, não o endpoint REST do Upstash); os canais de notificação (Resend/web-push/Realtime) só são registrados quando há credencial — sem ela, `SendNotification` grava status `failed` em vez de quebrar. Isso mantém o núcleo testável sem infraestrutura.
- **RLS como defesa em profundidade:** as policies impõem o isolamento multi-tenant no banco, mas o caminho user-scoped efetivo (transação injetando o JWT + `set role authenticated`) depende do cliente Drizzle base; está documentado no ADR-0004 e fica como próximo passo de fiação.
- **Testes de adapter:** os repositórios Drizzle têm testes de integração que **pulam** sem `DATABASE_URL`; o fluxo crítico E2E (Playwright) exige a aplicação rodando + browsers instalados. Ambos são scaffolding pronto, executável quando a infra de CI estiver disponível.

---

## 10. Referências Bibliográficas

(ABNT NBR 6023)

- COCKBURN, A. **Hexagonal Architecture**. 2005. Disponível em: <https://alistair.cockburn.us/hexagonal-architecture/>. Acesso em: jun. 2026.

- FIELDING, R. T. **Architectural Styles and the Design of Network-based Software Architectures**. 2000. Tese (Doutorado) — University of California, Irvine.

- FOWLER, M. **Patterns of Enterprise Application Architecture**. Boston: Addison-Wesley, 2002.

- FOWLER, M.; JOHNSON, R. **Software Architecture: The important stuff (according to me) and the things that change**. 2003.

- GAMMA, E.; HELM, R.; JOHNSON, R.; VLISSIDES, J. **Design Patterns: Elements of Reusable Object-Oriented Software**. Addison-Wesley, 1994.

- INTERNATIONAL ORGANIZATION FOR STANDARDIZATION. **ISO/IEC 25010:2023 — Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model**. 2023.

- KLEPPMANN, M. **Designing Data-Intensive Applications**. O'Reilly, 2017.

- MARTIN, R. C. **Clean Architecture: A Craftsman's Guide to Software Structure and Design**. Prentice Hall, 2017.

- MARTIN, R. C. **Clean Code: A Handbook of Agile Software Craftsmanship**. Prentice Hall, 2008.

- MEYER, B. **Object-Oriented Software Construction**. Prentice Hall, 1988.

- NYGARD, M. **Documenting Architecture Decisions**. cognitect.com, 2011. Disponível em: <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>. Acesso em: jun. 2026.

- VERNON, V. **Implementing Domain-Driven Design**. Addison-Wesley, 2013.

- IETF. **RFC 7807 — Problem Details for HTTP APIs**. 2016. Disponível em: <https://datatracker.ietf.org/doc/html/rfc7807>.

- OpenAPI Initiative. **OpenAPI Specification v3.1.0**. 2021. Disponível em: <https://spec.openapis.org/oas/v3.1.0>.

Referências específicas das seções do Agente B (Auth/RLS, filas, busca, padrões):

- SUPABASE. **Server-Side Auth for Next.js** e **Row Level Security**. Disponível em: <https://supabase.com/docs/guides/auth/server-side/nextjs> e <https://supabase.com/docs/guides/database/postgres/row-level-security>. Acesso em: jun. 2026.

- TASKFORCE (BullMQ). **BullMQ — Premium Message Queue for NodeJS**. Disponível em: <https://docs.bullmq.io>. Acesso em: jun. 2026.

- UPSTASH. **Upstash Redis Documentation**. Disponível em: <https://upstash.com/docs/redis>. Acesso em: jun. 2026.

- POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL Documentation — Chapter 12: Full Text Search** (`tsvector`, `tsquery`, `ts_rank`, índices GIN). Disponível em: <https://www.postgresql.org/docs/current/textsearch.html>. Acesso em: jun. 2026.

- RESEND. **Resend Documentation**. Disponível em: <https://resend.com/docs>. Acesso em: jun. 2026.

- MOZILLA DEVELOPER NETWORK. **Web Push API / VAPID**. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/Push_API>. Acesso em: jun. 2026.

---

**Anexos:**

- Repositório Git: https://github.com/HenriqueVMonteiro/trackr
- Pasta `/adrs` — ADRs em arquivos separados (markdown, formato Nygard)
- Pasta `/diagrams` — fontes dos diagramas (PlantUML) versionadas
- `/openapi/trackr.json` — especificação REST formal
- `/README.md` — instruções de instalação e execução
- `/HANDOFF.md` — contrato entre os agentes paralelos
