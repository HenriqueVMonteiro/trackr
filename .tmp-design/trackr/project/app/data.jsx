/* Trackr sample data + domain logic. Exposed on window.TrackrData */
(function () {
  // ---------- Members ----------
  const members = [
    {
      id: "u_henrique",
      name: "Henrique Monteiro",
      login: "henrique",
      role: "Agente A · domínio & arquitetura",
      color: "#1f883d",
      initials: "HM",
    },
    {
      id: "u_gabriel",
      name: "Gabriel Costa",
      login: "gabriel",
      role: "Agente B · infra & UI",
      color: "#8250df",
      initials: "GC",
    },
    {
      id: "u_andrade",
      name: "Prof. Andrade",
      login: "andrade",
      role: "Revisor · aprovador de merge",
      color: "#bf8700",
      initials: "PA",
    },
    {
      id: "u_lara",
      name: "Lara Nunes",
      login: "lara",
      role: "QA · testes e cobertura",
      color: "#0969da",
      initials: "LN",
    },
  ];
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]));

  // ---------- Workspace ----------
  const workspace = {
    id: "ws_trackr",
    slug: "trackr",
    name: "Trackr",
    description:
      "Issue tracker modular — trabalho final de Arquitetura de Software. Monolito modular, Clean Architecture por bounded context.",
    memberIds: members.map((m) => m.id),
  };

  // ---------- Projects ----------
  const projects = [
    {
      slug: "core-domain",
      name: "Core Domain",
      color: "#1f883d",
      leadId: "u_henrique",
      description:
        "Bounded contexts puros: workspaces, issues, comments, labels. Zero dependências externas no domínio.",
    },
    {
      slug: "platform",
      name: "Platform & Infra",
      color: "#8250df",
      leadId: "u_gabriel",
      description:
        "Webhooks, notificações multi-canal, busca full-text, filas BullMQ e cache Redis.",
    },
    {
      slug: "client-ui",
      name: "Client UI",
      color: "#0969da",
      leadId: "u_gabriel",
      description:
        "Next.js App Router, shadcn/ui, Server Actions e dashboards de relatórios.",
    },
  ];
  const projectsBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));

  // ---------- Labels ----------
  const labels = [
    { id: "domain", name: "domain", color: "#0e8a16" },
    { id: "infra", name: "infra", color: "#5319e7" },
    { id: "ui", name: "ui", color: "#1d76db" },
    { id: "tests", name: "tests", color: "#0052cc" },
    { id: "adr", name: "adr", color: "#bf8700" },
    { id: "auth", name: "auth", color: "#b60205" },
    { id: "schema", name: "schema", color: "#5fb3e8" },
    { id: "blocked", name: "blocked", color: "#b60205" },
    { id: "gof:state", name: "gof:state", color: "#d93f0b" },
    { id: "gof:strategy", name: "gof:strategy", color: "#d93f0b" },
    { id: "gof:factory", name: "gof:factory", color: "#d93f0b" },
    { id: "gof:composite", name: "gof:composite", color: "#d93f0b" },
    { id: "gof:memento", name: "gof:memento", color: "#d93f0b" },
    { id: "gof:observer", name: "gof:observer", color: "#d93f0b" },
    { id: "gof:decorator", name: "gof:decorator", color: "#d93f0b" },
  ];
  const labelsById = Object.fromEntries(labels.map((l) => [l.id, l]));

  // ---------- Status / priority meta ----------
  const STATUS_META = {
    backlog: { label: "Backlog", icon: "dotFill", hue: "#818b98", group: "open" },
    todo: { label: "Todo", icon: "issueOpened", hue: "#0969da", group: "open" },
    in_progress: { label: "In progress", icon: "dotFill", hue: "#bf8700", group: "open" },
    in_review: { label: "In review", icon: "dotFill", hue: "#8250df", group: "open" },
    done: { label: "Done", icon: "issueClosed", hue: "#1a7f37", group: "closed" },
    canceled: { label: "Canceled", icon: "skip", hue: "#6e7781", group: "closed" },
  };
  const PRIORITY_META = {
    none: { label: "No priority", bars: 0 },
    low: { label: "Low", bars: 1 },
    medium: { label: "Medium", bars: 2 },
    high: { label: "High", bars: 3 },
    urgent: { label: "Urgent", bars: 4, urgent: true },
  };

  // GoF: State — transições permitidas espelham IssueState.ts do domínio real.
  const TRANSITIONS = {
    backlog: ["todo", "canceled"],
    todo: ["backlog", "in_progress", "canceled"],
    in_progress: ["todo", "in_review", "canceled"],
    in_review: ["in_progress", "done", "canceled"],
    done: ["todo"],
    canceled: [],
  };

  // in_review -> done requer approver (regra do InReviewState)
  function allowedTransitions(issue) {
    return (TRANSITIONS[issue.status] || []).map((to) => {
      let disabled = false;
      let reason = null;
      if (issue.status === "in_review" && to === "done" && !issue.approverId) {
        disabled = true;
        reason = "Requer um aprovador definido (regra approver_required).";
      }
      return { to, disabled, reason };
    });
  }

  // ---------- Issues ----------
  // helper to build a created event
  const ev = (kind, actorId, at, extra) =>
    Object.assign({ type: "event", kind, actorId, at }, extra || {});
  const cm = (actorId, at, body) => ({ type: "comment", actorId, at, body });

  const issues = [
    // ===== core-domain =====
    {
      id: "i_cd1", projectSlug: "core-domain", number: 1, points: 3,
      title: "Schema Drizzle inicial: outbox + activity tables",
      status: "done", priority: "medium", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-05-24T13:10:00Z",
      labels: ["infra", "schema"],
      description: [
        "Primeira migration com as tabelas base: `users`, `workspaces`, `projects`, `issues`, além das tabelas de suporte `outbox` (entrega confiável de eventos) e `activity` (snapshots Memento).",
        "Índices para paginação cursor-based em `issues(project_id, number)`.",
      ],
      timeline: [
        ev("created", "u_henrique", "2026-05-24T13:10:00Z"),
        ev("status", "u_henrique", "2026-05-24T18:40:00Z", { from: "in_progress", to: "done" }),
      ],
    },
    {
      id: "i_cd2", projectSlug: "core-domain", number: 2, points: 5,
      title: "Foundation: Result, EventBus, Clock e base value objects",
      status: "done", priority: "high", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-05-25T09:00:00Z",
      labels: ["domain", "gof:observer"],
      description: [
        "Camada `src/shared/`: `Result<T,E>` (em vez de `throw` para erros de negócio), porta do `EventBus` (Observer), `Clock` injetável e value objects base.",
        "Tudo TypeScript puro — zero import de Next/Drizzle/Supabase.",
      ],
      timeline: [
        ev("created", "u_henrique", "2026-05-25T09:00:00Z"),
        ev("status", "u_henrique", "2026-05-25T16:20:00Z", { from: "in_review", to: "done" }),
      ],
    },
    {
      id: "i_cd3", projectSlug: "core-domain", number: 3, points: 3,
      title: "Bounded context de workspaces (hexagonal)",
      status: "done", priority: "medium", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-05-26T11:30:00Z",
      labels: ["domain"],
      description: [
        "Primeiro bounded context completo: `domain/` → `application/` (use cases + ports) → `infrastructure/` (DrizzleWorkspaceRepository) → `interface/`.",
        "Factory `createWorkspacesModule(deps)` para DI sem singleton global.",
      ],
      timeline: [ev("created", "u_henrique", "2026-05-26T11:30:00Z"), ev("status", "u_henrique", "2026-05-26T19:05:00Z", { from: "in_review", to: "done" })],
    },
    {
      id: "i_cd4", projectSlug: "core-domain", number: 4, points: 5,
      title: "Workflow de Issue como GoF State",
      status: "done", priority: "high", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-05-27T08:45:00Z",
      labels: ["domain", "gof:state", "adr"],
      description: [
        "Cada estado da issue (`Backlog`, `Todo`, `InProgress`, `InReview`, `Done`, `Canceled`) vira um objeto que conhece suas próprias transições — substitui um `switch` gigante por polimorfismo.",
        "`in_review -> done` exige `approverId`; `canceled` é terminal. Documentado no ADR-0003.",
      ],
      timeline: [
        ev("created", "u_henrique", "2026-05-27T08:45:00Z"),
        cm("u_andrade", "2026-05-27T10:12:00Z", [
          "Boa modelagem. Confirma que `InReviewState.attempt('done')` retorna `InvalidTransitionError` com `reason: 'approver_required'` quando não há aprovador?",
        ]),
        cm("u_henrique", "2026-05-27T10:40:00Z", [
          "Sim — coberto em `IssueState.test.ts`. O `IssueStateMachine` é um registry singleton das instâncias puras.",
        ]),
        ev("labeled", "u_henrique", "2026-05-27T10:41:00Z", { label: "gof:state" }),
        ev("status", "u_henrique", "2026-05-27T15:30:00Z", { from: "in_review", to: "done" }),
      ],
    },
    {
      id: "i_cd5", projectSlug: "core-domain", number: 5, points: 5,
      title: "Issues: use cases, ports e adapter Drizzle",
      status: "done", priority: "high", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-05-28T09:20:00Z",
      labels: ["domain"],
      description: [
        "CRUD + `transitionIssue` no padrão Result. Portas `IssueReader`/`IssueWriter` separadas (ISP). Adapter `DrizzleIssueRepository`.",
      ],
      timeline: [ev("created", "u_henrique", "2026-05-28T09:20:00Z"), ev("status", "u_henrique", "2026-05-28T20:10:00Z", { from: "in_review", to: "done" })],
    },
    {
      id: "i_cd6", projectSlug: "core-domain", number: 6, points: 8,
      title: "Sub-tasks (Composite) + ActivitySnapshot (Memento)",
      status: "in_review", priority: "high", assigneeId: "u_henrique", approverId: "u_andrade",
      createdById: "u_henrique", createdAt: "2026-06-01T10:00:00Z",
      labels: ["domain", "gof:composite", "gof:memento"],
      description: [
        "`IssueTree` trata issue e sub-tasks de forma uniforme (Composite). `ActivitySnapshot` captura o estado em cada mudança e persiste na tabela `activity` (Memento), alimentando o activity log da UI.",
        "Dois padrões GoF num stint só — referenciados no ADR-0007.",
      ],
      timeline: [
        ev("created", "u_henrique", "2026-06-01T10:00:00Z"),
        cm("u_henrique", "2026-06-01T14:30:00Z", [
          "Pronto pra review. O `ActivitySnapshot` é imutável e o `ActivityRepository.append()` só adiciona — nunca sobrescreve. Isso dá a timeline append-only que o detalhe da issue consome.",
        ]),
        ev("status", "u_henrique", "2026-06-01T14:31:00Z", { from: "in_progress", to: "in_review" }),
        cm("u_andrade", "2026-06-02T09:15:00Z", [
          "Revisando os testes do Composite. Recursão de profundidade em `IssueTree.totalPoints()` está coberta?",
        ]),
      ],
    },
    {
      id: "i_cd7", projectSlug: "core-domain", number: 7, points: 5,
      title: "EventBus dispatcher + outbox relay worker",
      status: "in_progress", priority: "high", assigneeId: "u_henrique", approverId: null,
      createdById: "u_henrique", createdAt: "2026-06-03T08:30:00Z",
      labels: ["domain", "gof:observer"],
      description: [
        "Wiring do Observer: use cases publicam eventos de domínio no `EventBus`; o `OutboxRelay` lê a tabela `outbox` e reentrega de forma confiável (ADR-0007).",
        "Subscribers dos outros módulos (ex: `IssueAssignedSubscriber` em notifications) reagem sem acoplamento.",
      ],
      timeline: [
        ev("created", "u_henrique", "2026-06-03T08:30:00Z"),
        ev("status", "u_henrique", "2026-06-03T08:31:00Z", { from: "todo", to: "in_progress" }),
        cm("u_gabriel", "2026-06-03T11:00:00Z", [
          "Quando isso mergear, ligo o `IssueAssignedSubscriber` do meu lado (B5). Mantém o contrato do evento `IssueAssigned { issueId, assigneeId }`?",
        ]),
        cm("u_henrique", "2026-06-03T11:20:00Z", [
          "Mantém. Payload estável, versionado. Só falta o teste de idempotência do relay e subo o PR.",
        ]),
      ],
    },
    {
      id: "i_cd8", projectSlug: "core-domain", number: 8, points: 3,
      title: "Módulos comments + labels",
      status: "todo", priority: "medium", assigneeId: "u_henrique", approverId: null,
      createdById: "u_henrique", createdAt: "2026-06-04T09:00:00Z",
      labels: ["domain"],
      description: ["Dois bounded contexts adicionais, mesmo shape hexagonal: `comments/` e `labels/`."],
      timeline: [ev("created", "u_henrique", "2026-06-04T09:00:00Z"), ev("status", "u_henrique", "2026-06-04T09:01:00Z", { from: "backlog", to: "todo" })],
    },
    {
      id: "i_cd9", projectSlug: "core-domain", number: 9, points: 5,
      title: "OpenAPI 3.1 a partir dos schemas Zod",
      status: "backlog", priority: "medium", assigneeId: null, approverId: null,
      createdById: "u_henrique", createdAt: "2026-06-05T10:15:00Z",
      labels: ["domain", "adr"],
      description: ["Gerar `openapi/trackr.json` a partir dos schemas Zod, com REST handlers e RFC 7807 para erros. ADR-0005 (REST vs GraphQL)."],
      timeline: [ev("created", "u_henrique", "2026-06-05T10:15:00Z")],
    },
    {
      id: "i_cd10", projectSlug: "core-domain", number: 10, points: 3,
      title: "Testes unitários do domínio (cobertura 80%+)",
      status: "backlog", priority: "low", assigneeId: "u_lara", approverId: null,
      createdById: "u_henrique", createdAt: "2026-06-05T10:20:00Z",
      labels: ["tests"],
      description: ["Fechar a cobertura do `domain/` em 80%+ e gerar diagrama de classes (Mermaid) + diagrama de sequência da transição de issue."],
      timeline: [ev("created", "u_henrique", "2026-06-05T10:20:00Z"), ev("assigned", "u_henrique", "2026-06-05T10:21:00Z", { who: "u_lara" })],
    },

    // ===== platform =====
    {
      id: "i_pf1", projectSlug: "platform", number: 1, points: 5,
      title: "Supabase Auth + políticas RLS",
      status: "done", priority: "high", assigneeId: "u_gabriel", approverId: "u_andrade",
      createdById: "u_gabriel", createdAt: "2026-05-26T09:00:00Z",
      labels: ["auth", "adr", "infra"],
      description: [
        "Login email/senha via Supabase Auth, middleware Next.js que injeta `currentUser`, e políticas RLS em SQL por tabela. Port `AuthProvider` (DIP) com adapter `SupabaseAuthProvider`. ADR-0004.",
      ],
      timeline: [ev("created", "u_gabriel", "2026-05-26T09:00:00Z"), ev("status", "u_gabriel", "2026-05-26T21:30:00Z", { from: "in_review", to: "done" })],
    },
    {
      id: "i_pf2", projectSlug: "platform", number: 2, points: 5,
      title: "Webhooks: bounded context de entrega",
      status: "done", priority: "medium", assigneeId: "u_gabriel", approverId: "u_andrade",
      createdById: "u_gabriel", createdAt: "2026-05-28T10:00:00Z",
      labels: ["infra"],
      description: ["Entidades `WebhookEndpoint` e `WebhookDelivery` (event, attempts, status). Use cases de gestão e fila de entrega."],
      timeline: [ev("created", "u_gabriel", "2026-05-28T10:00:00Z"), ev("status", "u_gabriel", "2026-05-28T19:40:00Z", { from: "in_review", to: "done" })],
    },
    {
      id: "i_pf3", projectSlug: "platform", number: 3, points: 8,
      title: "Strategy de retry + signers HMAC",
      status: "done", priority: "high", assigneeId: "u_gabriel", approverId: "u_andrade",
      createdById: "u_gabriel", createdAt: "2026-05-30T09:30:00Z",
      labels: ["infra", "gof:strategy"],
      description: [
        "`RetryStrategy` trocável por endpoint (Exponential, Linear, Fixed) — OCP: nova política não toca callers. Signers HMAC-SHA256/SHA1/Ed25519 demonstram LSP. Worker BullMQ consome a fila.",
      ],
      timeline: [
        ev("created", "u_gabriel", "2026-05-30T09:30:00Z"),
        cm("u_andrade", "2026-05-30T15:00:00Z", ["O `WebhookSigner` como interface substituível é um bom exemplo de LSP pro relatório. Aprovado."]),
        ev("status", "u_gabriel", "2026-05-30T18:10:00Z", { from: "in_review", to: "done" }),
      ],
    },
    {
      id: "i_pf4", projectSlug: "platform", number: 4, points: 5,
      title: "Notifications: Factory Method multi-canal",
      status: "in_progress", priority: "high", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-02T08:50:00Z",
      labels: ["infra", "gof:factory"],
      description: [
        "`NotificationFactory` (Factory Method) cria a `Notification` concreta por canal: `EmailNotification`, `PushNotification`, `InAppNotification`, `WebhookNotification`.",
        "Depende do EventBus (i_cd7) para reagir a `IssueAssigned`.",
      ],
      timeline: [
        ev("created", "u_gabriel", "2026-06-02T08:50:00Z"),
        ev("status", "u_gabriel", "2026-06-02T08:51:00Z", { from: "todo", to: "in_progress" }),
        cm("u_gabriel", "2026-06-03T12:00:00Z", ["Bloqueado parcialmente no EventBus do Henrique (#7 core-domain) pra ligar o subscriber de verdade. A factory em si já está testada."]),
        ev("labeled", "u_gabriel", "2026-06-03T12:01:00Z", { label: "gof:factory" }),
      ],
    },
    {
      id: "i_pf5", projectSlug: "platform", number: 5, points: 5,
      title: "Adapters de canal: email, push e in-app",
      status: "todo", priority: "medium", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-04T09:10:00Z",
      labels: ["infra"],
      description: ["Três adapters de `NotificationChannel`: Resend (email), web-push, Supabase Realtime (in-app). OCP: adicionar Slack é só uma classe nova."],
      timeline: [ev("created", "u_gabriel", "2026-06-04T09:10:00Z"), ev("status", "u_gabriel", "2026-06-04T09:11:00Z", { from: "backlog", to: "todo" })],
    },
    {
      id: "i_pf6", projectSlug: "platform", number: 6, points: 5,
      title: "Sprints: ciclos com capacity e velocity",
      status: "todo", priority: "medium", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-04T09:20:00Z",
      labels: ["infra"],
      description: ["Sprints com nome, datas, status (planned/active/closed), capacity (story points) e lista de issues. Use cases: criar, iniciar, fechar, add/remove issue."],
      timeline: [ev("created", "u_gabriel", "2026-06-04T09:20:00Z"), ev("status", "u_gabriel", "2026-06-04T09:21:00Z", { from: "backlog", to: "todo" })],
    },
    {
      id: "i_pf7", projectSlug: "platform", number: 7, points: 8,
      title: "Busca FTS + cache Redis (Decorator) + ADR de reversão",
      status: "in_review", priority: "high", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-05T08:00:00Z",
      labels: ["infra", "gof:decorator", "adr", "blocked"],
      description: [
        "Busca full-text de issues com Postgres `tsvector`/`tsquery`. `RankingStrategy` (relevance/date/priority). `CachedSearcher` decora `PostgresFtsSearcher` com cache Upstash Redis.",
        "ADR-0008 documenta a REVERSÃO: o grupo havia escolhido MeiliSearch e reverteu para FTS Postgres (custo + simplicidade operacional).",
      ],
      timeline: [
        ev("created", "u_gabriel", "2026-06-05T08:00:00Z"),
        cm("u_gabriel", "2026-06-05T17:45:00Z", [
          "PR no ar. Falta alguém aprovar pra fechar — não setei `approverId` ainda, então o botão `Mark as done` fica bloqueado de propósito (regra do InReviewState).",
        ]),
        ev("status", "u_gabriel", "2026-06-05T17:46:00Z", { from: "in_progress", to: "in_review" }),
        ev("labeled", "u_gabriel", "2026-06-05T17:47:00Z", { label: "blocked" }),
      ],
    },
    {
      id: "i_pf8", projectSlug: "platform", number: 8, points: 3,
      title: "Templates de issue + import CSV (parser Strategy)",
      status: "backlog", priority: "low", assigneeId: null, approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-06T10:00:00Z",
      labels: ["infra", "gof:strategy"],
      description: ["Templates que preenchem campos default + import de issues via CSV/JSON com `Parser` Strategy por formato."],
      timeline: [ev("created", "u_gabriel", "2026-06-06T10:00:00Z")],
    },
    {
      id: "i_pf9", projectSlug: "platform", number: 9, points: 5,
      title: "Time tracking com agregação",
      status: "backlog", priority: "low", assigneeId: null, approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-06T10:05:00Z",
      labels: ["infra"],
      description: ["`TimeEntry` por issue (start/end + descrição). Aggregator soma por issue, sprint, usuário e projeto."],
      timeline: [ev("created", "u_gabriel", "2026-06-06T10:05:00Z")],
    },
    {
      id: "i_pf10", projectSlug: "platform", number: 10, points: 2,
      title: "Spike: PoC MeiliSearch para busca",
      status: "canceled", priority: "none", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-05-29T09:00:00Z",
      labels: ["infra"],
      description: ["Prova de conceito de busca gerenciada com MeiliSearch."],
      timeline: [
        ev("created", "u_gabriel", "2026-05-29T09:00:00Z"),
        cm("u_gabriel", "2026-06-05T08:05:00Z", ["Revertido em favor de FTS Postgres — custo operacional e mais um serviço pra hospedar não compensam na escala do trabalho. Decisão registrada no ADR-0008. Fechando como canceled."]),
        ev("status", "u_gabriel", "2026-06-05T08:06:00Z", { from: "todo", to: "canceled" }),
      ],
    },

    // ===== client-ui =====
    {
      id: "i_ui1", projectSlug: "client-ui", number: 1, points: 8,
      title: "Páginas cliente: workspace, issues e detalhe",
      status: "in_progress", priority: "urgent", assigneeId: "u_gabriel", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-06T09:00:00Z",
      labels: ["ui"],
      description: [
        "UI Next.js funcional em `src/app/(client)/`: workspace home, lista de issues com filtros, e detalhe da issue com transições (Server Actions), comentários, assignee e priority.",
        "Server Components por padrão; `\"use client\"` só onde há estado. Forms com react-hook-form + zod reusando os schemas existentes.",
      ],
      timeline: [
        ev("created", "u_gabriel", "2026-06-06T09:00:00Z"),
        ev("status", "u_gabriel", "2026-06-06T09:01:00Z", { from: "todo", to: "in_progress" }),
        ev("priority", "u_gabriel", "2026-06-06T09:02:00Z", { to: "urgent" }),
        cm("u_henrique", "2026-06-06T19:30:00Z", ["Deadline 23:59. Foca no fluxo funcional: lista → detalhe → transição. Polimento depois. Eu pego o dashboard (#3)."]),
        cm("u_gabriel", "2026-06-07T10:15:00Z", ["Workspace home e lista já navegando. Agora wirando o `transitionIssueAction` no detalhe via `container().issues.transitionIssue`."]),
      ],
    },
    {
      id: "i_ui2", projectSlug: "client-ui", number: 2, points: 2,
      title: "Polir página de login com Tailwind",
      status: "done", priority: "low", assigneeId: "u_gabriel", approverId: "u_andrade",
      createdById: "u_gabriel", createdAt: "2026-06-06T09:05:00Z",
      labels: ["ui"],
      description: ["A `/login` já existe do B1 (Supabase Auth). Só aplicar Tailwind/shadcn e centralizar o card."],
      timeline: [ev("created", "u_gabriel", "2026-06-06T09:05:00Z"), ev("status", "u_gabriel", "2026-06-07T11:00:00Z", { from: "in_review", to: "done" })],
    },
    {
      id: "i_ui3", projectSlug: "client-ui", number: 3, points: 5,
      title: "Dashboard: cards numéricos + gráficos",
      status: "todo", priority: "high", assigneeId: "u_henrique", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-06T09:10:00Z",
      labels: ["ui"],
      description: ["Consome `reports.getProjectThroughput`, `getProjectCycleTime` e `getProjectStatusDistribution`. Cards numéricos OK; gráficos simples sem lib se faltar tempo."],
      timeline: [ev("created", "u_gabriel", "2026-06-06T09:10:00Z"), ev("assigned", "u_gabriel", "2026-06-06T09:11:00Z", { who: "u_henrique" }), ev("status", "u_henrique", "2026-06-06T20:00:00Z", { from: "backlog", to: "todo" })],
    },
    {
      id: "i_ui4", projectSlug: "client-ui", number: 4, points: 3,
      title: "Página de sprints (ativas e planejadas)",
      status: "backlog", priority: "medium", assigneeId: null, approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-07T08:30:00Z",
      labels: ["ui"],
      description: ["Lista sprints se `container().sprints` existir (depende do #6 platform); senão mostra \"em breve\"."],
      timeline: [ev("created", "u_gabriel", "2026-06-07T08:30:00Z")],
    },
    {
      id: "i_ui5", projectSlug: "client-ui", number: 5, points: 5,
      title: "Testes de integração + E2E Playwright",
      status: "backlog", priority: "medium", assigneeId: "u_lara", approverId: null,
      createdById: "u_gabriel", createdAt: "2026-06-07T08:35:00Z",
      labels: ["tests", "ui"],
      description: ["Fluxo E2E crítico: login → criar workspace → criar projeto → criar issue → transicionar backlog→done → verificar activity log + notificação in-app."],
      timeline: [ev("created", "u_gabriel", "2026-06-07T08:35:00Z"), ev("assigned", "u_gabriel", "2026-06-07T08:36:00Z", { who: "u_lara" })],
    },
  ];

  // ---------- Sprints ----------
  const sprints = [
    {
      id: "sp5", name: "Sprint 5 — Domain Core", status: "closed",
      goal: "Fechar workspaces, issues (State machine) e a foundation compartilhada.",
      startDate: "2026-05-19", endDate: "2026-06-01", capacityPoints: 34,
      issueIds: ["i_cd1", "i_cd2", "i_cd3", "i_cd4", "i_cd5", "i_pf1", "i_pf2"],
      velocity: 31,
    },
    {
      id: "sp6", name: "Sprint 6 — Platform & Auth", status: "active",
      goal: "Webhooks (Strategy), notificações (Factory) e busca (Decorator + ADR de reversão).",
      startDate: "2026-06-01", endDate: "2026-06-15", capacityPoints: 42,
      issueIds: ["i_cd6", "i_cd7", "i_pf3", "i_pf4", "i_pf5", "i_pf7", "i_ui1"],
    },
    {
      id: "sp7", name: "Sprint 7 — Client UI & Polish", status: "planned",
      goal: "Dashboards, sprints na UI, OpenAPI e cobertura E2E.",
      startDate: "2026-06-15", endDate: "2026-06-29", capacityPoints: 36,
      issueIds: ["i_cd8", "i_cd9", "i_cd10", "i_ui3", "i_ui4", "i_ui5", "i_pf6"],
    },
  ];

  // ---------- Reports ----------
  const reports = {
    all: {
      throughput: [
        { week: "May 4", closed: 2, canceled: 0 },
        { week: "May 11", closed: 4, canceled: 0 },
        { week: "May 18", closed: 6, canceled: 1 },
        { week: "May 25", closed: 9, canceled: 0 },
        { week: "Jun 1", closed: 6, canceled: 1 },
      ],
      cycleTime: { sampleSize: 23, avgDays: 2.8, p50Days: 2.1, p90Days: 5.4 },
    },
    "core-domain": {
      throughput: [
        { week: "May 4", closed: 1, canceled: 0 },
        { week: "May 11", closed: 2, canceled: 0 },
        { week: "May 18", closed: 3, canceled: 0 },
        { week: "May 25", closed: 4, canceled: 0 },
        { week: "Jun 1", closed: 1, canceled: 0 },
      ],
      cycleTime: { sampleSize: 11, avgDays: 2.3, p50Days: 1.8, p90Days: 4.6 },
    },
    platform: {
      throughput: [
        { week: "May 4", closed: 1, canceled: 0 },
        { week: "May 11", closed: 2, canceled: 0 },
        { week: "May 18", closed: 2, canceled: 1 },
        { week: "May 25", closed: 4, canceled: 0 },
        { week: "Jun 1", closed: 3, canceled: 1 },
      ],
      cycleTime: { sampleSize: 9, avgDays: 3.4, p50Days: 2.6, p90Days: 6.1 },
    },
    "client-ui": {
      throughput: [
        { week: "May 25", closed: 0, canceled: 0 },
        { week: "Jun 1", closed: 2, canceled: 0 },
      ],
      cycleTime: { sampleSize: 3, avgDays: 1.2, p50Days: 0.9, p90Days: 2.0 },
    },
  };

  // ---------- Derived helpers ----------
  function issuesForProject(slug) {
    return issues.filter((i) => i.projectSlug === slug);
  }
  function getIssue(slug, number) {
    return issues.find((i) => i.projectSlug === slug && i.number === Number(number));
  }
  function statusDistribution(slug) {
    const pool = slug === "all" ? issues : issuesForProject(slug);
    const counts = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 };
    pool.forEach((i) => (counts[i.status] += 1));
    return { counts, total: pool.length };
  }

  // ---------- Time helpers ----------
  const NOW = new Date("2026-06-07T16:00:00Z");
  function relativeTime(iso) {
    const d = new Date(iso);
    const diff = (NOW - d) / 1000;
    const abs = Math.abs(diff);
    const fut = diff < 0;
    const f = (n, u) => `${fut ? "in " : ""}${n} ${u}${n > 1 ? "s" : ""}${fut ? "" : " ago"}`;
    if (abs < 60) return "just now";
    if (abs < 3600) return f(Math.round(abs / 60), "minute");
    if (abs < 86400) return f(Math.round(abs / 3600), "hour");
    if (abs < 86400 * 30) return f(Math.round(abs / 86400), "day");
    return f(Math.round(abs / (86400 * 30)), "month");
  }
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function formatShort(iso) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  window.TrackrData = {
    members, membersById, workspace, projects, projectsBySlug,
    labels, labelsById, issues, sprints, reports,
    STATUS_META, PRIORITY_META, TRANSITIONS,
    allowedTransitions, issuesForProject, getIssue, statusDistribution,
    relativeTime, formatDate, formatShort, NOW,
  };
})();
