// In-memory mutable store used by the A15 UI. In a real deploy the pages
// would call container().<module>.<useCase>.execute() (the wiring exists
// already in src/app/_bootstrap.ts), but those use cases require
// DATABASE_URL + Supabase env. This store keeps the visual layer 100%
// interactive (state transitions, comments, new issues) without the
// infra dependency. Persists across requests within the same Next.js
// dev process (module-level singleton).

import type {
  DemoActivity,
  DemoComment,
  DemoIssue,
  DemoProject,
  DemoWorkspace,
} from "./demo";

interface Snapshot {
  workspace: DemoWorkspace;
  team: { id: string; name: string; role: string }[];
  projects: DemoProject[];
  issues: DemoIssue[];
  activityByIssue: Record<string, DemoActivity[]>;
  commentsByIssue: Record<string, DemoComment[]>;
  sprints: {
    id: string;
    name: string;
    status: "planned" | "active" | "closed";
    completed: number;
    committed: number;
    startDate: string;
    endDate: string;
  }[];
}

const NOW = new Date("2026-06-07T22:00:00Z");
const minus = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function initialSnapshot(): Snapshot {
  const team = [
    { id: "u_a", name: "Henrique Vieira Monteiro", role: "Agente A — Core" },
    { id: "u_b", name: "Gabriel Teixeira Costa", role: "Agente B — Infra/UI" },
  ];

  const workspace: DemoWorkspace = {
    id: "wsp_demo",
    slug: "trackr",
    name: "Trackr Engineering",
    description:
      "Monolito modular · Clean Architecture por bounded context · 358 testes de unidade · 9 ADRs aceitas.",
    memberCount: 2,
  };

  const projects: DemoProject[] = [
    {
      id: "prj_trk",
      slug: "trackr",
      key: "TRK",
      name: "Trackr (este projeto)",
      description:
        "O próprio Trackr — eat your own dogfood. Workspaces, issues, sprints, dashboards.",
      color: "#0969da",
      leadName: "Henrique Vieira Monteiro",
    },
    {
      id: "prj_web",
      slug: "webhooks-platform",
      key: "WHK",
      name: "Webhooks Platform",
      description:
        "Plataforma de integrações: entrega assíncrona com BullMQ, retry Strategy, signers LSP.",
      color: "#8250df",
      leadName: "Gabriel Teixeira Costa",
    },
    {
      id: "prj_ntf",
      slug: "notification-hub",
      key: "NTF",
      name: "Notification Hub",
      description:
        "Hub multi-canal: email Resend, push VAPID, in-app Realtime — Factory Method + adapters.",
      color: "#1f883d",
      leadName: "Gabriel Teixeira Costa",
    },
  ];

  const issues: DemoIssue[] = [
    {
      id: "iss_1",
      number: 142,
      title: "State machine de Issue precisa de approver em transição para done",
      description:
        "Implementar regra in_review → done que exige approver_id; rejeitar caso contrário.",
      status: "done",
      priority: "high",
      assigneeName: "Henrique Vieira Monteiro",
      createdAt: minus(96),
      updatedAt: minus(2),
      closedAt: minus(2),
      labels: ["domain", "state-machine"],
      comments: 3,
    },
    {
      id: "iss_2",
      number: 158,
      title: "Cache Decorator no IssueSearcher para queries quentes do dashboard",
      description:
        "Envolver PostgresFtsSearcher com CachedSearcher backed por Upstash Redis.",
      status: "in_review",
      priority: "medium",
      assigneeName: "Gabriel Teixeira Costa",
      createdAt: minus(48),
      updatedAt: minus(4),
      closedAt: null,
      labels: ["search", "performance"],
      comments: 5,
    },
    {
      id: "iss_3",
      number: 161,
      title: "Wire OutboxRelay no bootstrap + worker process separado",
      description:
        "OutboxRelay → InMemoryEventBus para garantir at-least-once em quedas de Redis.",
      status: "in_progress",
      priority: "urgent",
      assigneeName: "Henrique Vieira Monteiro",
      createdAt: minus(24),
      updatedAt: minus(1),
      closedAt: null,
      labels: ["infra", "outbox"],
      comments: 2,
    },
    {
      id: "iss_4",
      number: 167,
      title: "Burndown chart no dashboard usando dashboard_burndown view",
      description:
        "Gráfico de área simples com fetch ao endpoint /reports/burndown para o sprint ativo.",
      status: "todo",
      priority: "low",
      assigneeName: "Gabriel Teixeira Costa",
      createdAt: minus(12),
      updatedAt: minus(12),
      closedAt: null,
      labels: ["ui", "dashboards"],
      comments: 0,
    },
    {
      id: "iss_5",
      number: 170,
      title: "Definir política de RetryStrategy default para webhooks",
      description:
        "Default deveria ser ExponentialRetry(max=5, base=1s) ou tornar obrigatório no schema?",
      status: "backlog",
      priority: "medium",
      assigneeName: null,
      createdAt: minus(8),
      updatedAt: minus(8),
      closedAt: null,
      labels: ["webhooks", "design-discussion"],
      comments: 1,
    },
    {
      id: "iss_6",
      number: 173,
      title: "Importação CSV com formato Linear: mapear campos extras",
      description:
        "Linear exports trazem mais colunas; CsvParser deve ignorar com Strategy específica.",
      status: "todo",
      priority: "low",
      assigneeName: null,
      createdAt: minus(6),
      updatedAt: minus(5),
      closedAt: null,
      labels: ["import", "csv"],
      comments: 0,
    },
  ];

  const activityByIssue: Record<string, DemoActivity[]> = {};
  const commentsByIssue: Record<string, DemoComment[]> = {};

  issues.forEach((i) => {
    activityByIssue[i.id] = [
      {
        id: `act_${i.id}_create`,
        action: "created",
        actor: i.assigneeName ?? "Henrique Vieira Monteiro",
        at: i.createdAt,
        detail: `Issue #${i.number} criada`,
      },
    ];
    commentsByIssue[i.id] = [];
  });

  // Add some richer data for iss_1
  activityByIssue["iss_1"]?.push(
    {
      id: "act_iss_1_assigned",
      action: "assigned",
      actor: "Henrique Vieira Monteiro",
      at: minus(72),
      detail: "→ Henrique",
    },
    {
      id: "act_iss_1_transitioned",
      action: "transitioned",
      actor: "Henrique Vieira Monteiro",
      at: minus(2),
      detail: "in_review → done (approver: Gabriel)",
    },
  );
  commentsByIssue["iss_1"] = [
    {
      id: "cmt_iss_1_1",
      authorName: "Gabriel Teixeira Costa",
      body: "Boa, isso fecha o gap que a banca ia perguntar. A InReviewState pode delegar pra um Strategy de aprovação se evoluir.",
      at: minus(20),
    },
    {
      id: "cmt_iss_1_2",
      authorName: "Henrique Vieira Monteiro",
      body: "Concordo. Por enquanto fica no estado mesmo. Caso queiramos aprovação multi-step viramos uma Chain.",
      at: minus(8),
    },
    {
      id: "cmt_iss_1_3",
      authorName: "Gabriel Teixeira Costa",
      body: "Aprovado, mergeio depois do verde.",
      at: minus(3),
    },
  ];

  const sprints: Snapshot["sprints"] = [
    {
      id: "spr_5",
      name: "Sprint 5",
      status: "closed",
      completed: 11,
      committed: 13,
      startDate: minus(336),
      endDate: minus(168),
    },
    {
      id: "spr_6",
      name: "Sprint 6",
      status: "active",
      completed: 7,
      committed: 12,
      startDate: minus(168),
      endDate: minus(0),
    },
    {
      id: "spr_7",
      name: "Sprint 7 (planned)",
      status: "planned",
      completed: 0,
      committed: 9,
      startDate: minus(-1),
      endDate: minus(-168),
    },
  ];

  return { workspace, team, projects, issues, activityByIssue, commentsByIssue, sprints };
}

// Module-level singleton (survives within dev process between requests).
const g = globalThis as unknown as { __trackrSnap?: Snapshot };
const snap: Snapshot = g.__trackrSnap ?? (g.__trackrSnap = initialSnapshot());

function nowIso() {
  return new Date().toISOString();
}

let issueCounter = Math.max(...snap.issues.map((i) => i.number));
let idCounter = 1000;

export const store = {
  workspace: () => snap.workspace,
  team: () => snap.team,
  projects: () => snap.projects,
  projectBySlug: (slug: string) =>
    snap.projects.find((p) => p.slug === slug) ?? snap.projects[0]!,
  issues: () => snap.issues,
  issuesForProject: (projectSlug: string) => {
    // Demo: all issues belong to the trackr project; others get a stable slice
    const proj = snap.projects.find((p) => p.slug === projectSlug);
    if (!proj || proj.slug === "trackr") return snap.issues;
    const offset = proj.slug === "webhooks-platform" ? 2 : 4;
    return snap.issues.slice(offset, offset + 3);
  },
  issue: (id: string) => snap.issues.find((i) => i.id === id),
  activityForIssue: (id: string) => snap.activityByIssue[id] ?? [],
  commentsForIssue: (id: string) => snap.commentsByIssue[id] ?? [],
  sprints: () => snap.sprints,

  transitionIssue(issueId: string, to: DemoIssue["status"], actor: string): void {
    const issue = snap.issues.find((i) => i.id === issueId);
    if (!issue) return;
    const from = issue.status;
    if (from === to) return;
    issue.status = to;
    issue.updatedAt = nowIso();
    if (to === "done") issue.closedAt = nowIso();
    else if (to === "canceled") issue.closedAt = nowIso();
    else issue.closedAt = null;
    (snap.activityByIssue[issueId] ??= []).push({
      id: `act_${++idCounter}`,
      action: "transitioned",
      actor,
      at: nowIso(),
      detail: `${from} → ${to}`,
    });
  },

  addComment(issueId: string, body: string, author: string): void {
    const trimmed = body.trim();
    if (!trimmed) return;
    const issue = snap.issues.find((i) => i.id === issueId);
    if (!issue) return;
    (snap.commentsByIssue[issueId] ??= []).push({
      id: `cmt_${++idCounter}`,
      authorName: author,
      body: trimmed,
      at: nowIso(),
    });
    issue.comments = (snap.commentsByIssue[issueId] ?? []).length;
    issue.updatedAt = nowIso();
    (snap.activityByIssue[issueId] ??= []).push({
      id: `act_${++idCounter}`,
      action: "commented",
      actor: author,
      at: nowIso(),
    });
  },

  createIssue(input: {
    projectSlug: string;
    title: string;
    description: string;
    priority: DemoIssue["priority"];
    actor: string;
  }): DemoIssue {
    const id = `iss_${++idCounter}`;
    const issue: DemoIssue = {
      id,
      number: ++issueCounter,
      title: input.title.trim() || "(no title)",
      description: input.description.trim(),
      status: "backlog",
      priority: input.priority,
      assigneeName: input.actor,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      closedAt: null,
      labels: [],
      comments: 0,
    };
    snap.issues.unshift(issue);
    snap.activityByIssue[id] = [
      {
        id: `act_${++idCounter}`,
        action: "created",
        actor: input.actor,
        at: nowIso(),
        detail: `Issue #${issue.number} criada`,
      },
    ];
    snap.commentsByIssue[id] = [];
    return issue;
  },

  createProject(input: {
    name: string;
    slug: string;
    key: string;
    description: string;
    color: string;
  }): DemoProject {
    const project: DemoProject = {
      id: `prj_${++idCounter}`,
      slug: input.slug,
      key: input.key.toUpperCase(),
      name: input.name,
      description: input.description,
      color: input.color,
      leadName: currentUser,
    };
    snap.projects.push(project);
    return project;
  },

  createSprint(input: {
    name: string;
    startDate: string;
    endDate: string;
    committed: number;
  }): void {
    snap.sprints.push({
      id: `spr_${++idCounter}`,
      name: input.name,
      status: "planned",
      completed: 0,
      committed: input.committed,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },

  startSprint(sprintId: string): void {
    const s = snap.sprints.find((x) => x.id === sprintId);
    if (!s) return;
    snap.sprints.forEach((x) => {
      if (x.status === "active") x.status = "closed";
    });
    s.status = "active";
  },

  closeSprint(sprintId: string): void {
    const s = snap.sprints.find((x) => x.id === sprintId);
    if (s && s.status !== "closed") s.status = "closed";
  },

  deleteIssue(issueId: string): void {
    const idx = snap.issues.findIndex((i) => i.id === issueId);
    if (idx >= 0) snap.issues.splice(idx, 1);
    delete snap.activityByIssue[issueId];
    delete snap.commentsByIssue[issueId];
  },

  assignIssue(issueId: string, assigneeName: string | null, actor: string): void {
    const issue = snap.issues.find((i) => i.id === issueId);
    if (!issue) return;
    if (issue.assigneeName === assigneeName) return;
    issue.assigneeName = assigneeName;
    issue.updatedAt = nowIso();
    (snap.activityByIssue[issueId] ??= []).push({
      id: `act_${++idCounter}`,
      action: "assigned",
      actor,
      at: nowIso(),
      detail: assigneeName ? `→ ${assigneeName}` : "unassigned",
    });
  },
};

export const currentUser = "Henrique Vieira Monteiro";
