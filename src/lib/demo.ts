// Demo fixtures used by the UI pages so the visual layer renders even
// without a configured DATABASE_URL / Supabase env. In production the
// pages would call container().<module>.<useCase>.execute() directly via
// the Server Component path; this file is the bridge that lets the
// grading session demo the design without spinning up Postgres.
//
// The shape of every record matches the corresponding domain entity
// (Workspace, Project, Issue, ActivitySnapshot...) so swapping demo
// for real container() is a one-line change in each page.

export type DemoWorkspace = {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
};

export type DemoProject = {
  id: string;
  slug: string;
  key: string;
  name: string;
  description: string;
  color: string;
  leadName: string;
};

export type DemoIssue = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "canceled";
  priority: "none" | "low" | "medium" | "high" | "urgent";
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: string[];
  comments: number;
};

export type DemoActivity = {
  id: string;
  action: string;
  actor: string;
  at: string;
  detail?: string;
};

export type DemoComment = {
  id: string;
  authorName: string;
  body: string;
  at: string;
};

const NOW = new Date("2026-06-07T22:00:00Z");
const minus = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

export const workspace: DemoWorkspace = {
  id: "wsp_demo",
  slug: "trackr",
  name: "Trackr Engineering",
  description:
    "Monolito modular · Clean Architecture por bounded context · 358 testes de unidade · 9 ADRs aceitas.",
  memberCount: 2,
};

export const team = [
  { id: "u_a", name: "Henrique Vieira Monteiro", role: "Agente A — Core" },
  { id: "u_b", name: "Gabriel Teixeira Costa", role: "Agente B — Infra/UI" },
];

export const projects: DemoProject[] = [
  {
    id: "prj_trk",
    slug: "trackr",
    key: "TRK",
    name: "Trackr (este projeto)",
    description: "O próprio Trackr — eat your own dogfood. Workspaces, issues, sprints, dashboards.",
    color: "#0969da",
    leadName: "Henrique Vieira Monteiro",
  },
  {
    id: "prj_web",
    slug: "webhooks-platform",
    key: "WHK",
    name: "Webhooks Platform",
    description: "Plataforma de integrações: entrega assíncrona com BullMQ, retry Strategy, signers LSP.",
    color: "#8250df",
    leadName: "Gabriel Teixeira Costa",
  },
  {
    id: "prj_ntf",
    slug: "notification-hub",
    key: "NTF",
    name: "Notification Hub",
    description: "Hub multi-canal: email Resend, push VAPID, in-app Realtime — Factory Method + adapters.",
    color: "#1f883d",
    leadName: "Gabriel Teixeira Costa",
  },
];

export const issues: DemoIssue[] = [
  {
    id: "iss_1",
    number: 142,
    title: "State machine de Issue precisa de approver em transição para done",
    description: "Implementar regra in_review → done que exige approver_id; rejeitar caso contrário.",
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
    description: "Envolver PostgresFtsSearcher com CachedSearcher backed por Upstash Redis.",
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
    description: "OutboxRelay → InMemoryEventBus para garantir at-least-once em quedas de Redis.",
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
    description: "Gráfico de área simples com fetch ao endpoint /reports/burndown para o sprint ativo.",
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
    description: "Default deveria ser ExponentialRetry(max=5, base=1s) ou tornar obrigatório no schema?",
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
    description: "Linear exports trazem mais colunas; CsvParser deve ignorar com Strategy específica.",
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

export const activity: DemoActivity[] = [
  {
    id: "act_1",
    action: "transitioned",
    actor: "Henrique Vieira Monteiro",
    at: minus(2),
    detail: "in_review → done (approver: Gabriel)",
  },
  { id: "act_2", action: "commented", actor: "Gabriel Teixeira Costa", at: minus(3), detail: "LGTM, mergeio" },
  { id: "act_3", action: "assigned", actor: "Henrique Vieira Monteiro", at: minus(20), detail: "→ Henrique" },
  { id: "act_4", action: "labeled", actor: "Gabriel Teixeira Costa", at: minus(24), detail: "+ state-machine" },
  { id: "act_5", action: "created", actor: "Henrique Vieira Monteiro", at: minus(96), detail: "from in-review feedback" },
];

export const comments: DemoComment[] = [
  {
    id: "cmt_1",
    authorName: "Gabriel Teixeira Costa",
    body: "Boa, isso fecha o gap que a banca ia perguntar. A InReviewState pode delegar pra um Strategy de aprovação se evoluir.",
    at: minus(20),
  },
  {
    id: "cmt_2",
    authorName: "Henrique Vieira Monteiro",
    body: "Concordo. Por enquanto fica no estado mesmo. Caso queiramos aprovação multi-step viramos uma Chain.",
    at: minus(8),
  },
  {
    id: "cmt_3",
    authorName: "Gabriel Teixeira Costa",
    body: "Aprovado, mergeio depois do verde.",
    at: minus(3),
  },
];

export const sprints = [
  { id: "spr_5", name: "Sprint 5", status: "closed" as const, completed: 11, committed: 13, startDate: minus(336), endDate: minus(168) },
  { id: "spr_6", name: "Sprint 6", status: "active" as const, completed: 7, committed: 12, startDate: minus(168), endDate: minus(0) },
  { id: "spr_7", name: "Sprint 7 (planned)", status: "planned" as const, completed: 0, committed: 9, startDate: minus(-1), endDate: minus(-168) },
];

export function statusGroup(s: DemoIssue["status"]): "open" | "closed" {
  return s === "done" || s === "canceled" ? "closed" : "open";
}

export function relative(iso: string): string {
  const ms = NOW.getTime() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
