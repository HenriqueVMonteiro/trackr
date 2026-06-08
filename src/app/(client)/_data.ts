import { notFound, redirect } from "next/navigation";

import { container } from "@/app/_bootstrap";
import { unwrap } from "@/shared";
import { getCurrentUser } from "@/modules/auth-rls/interface/getCurrentUser";
import type { UserContext } from "@/modules/auth-rls/domain";
import type { Workspace, WorkspaceMember } from "@/modules/workspaces";
import type { Project } from "@/modules/projects";
import type { Issue, IssuePriority, IssueStatus } from "@/modules/issues";
import type { ActivitySnapshot } from "@/modules/issues/domain/ActivitySnapshot";
import type { Comment } from "@/modules/comments";
import type { Sprint } from "@/modules/sprints";

export type AppWorkspace = {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
};

export type AppProject = {
  id: string;
  slug: string;
  key: string;
  name: string;
  description: string;
  color: string;
  leadName: string;
};

export type AppIssue = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeName: string | null;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: string[];
  comments: number;
};

export type AppActivity = {
  id: string;
  action: string;
  actor: string;
  at: string;
  detail?: string;
};

export type AppComment = {
  id: string;
  authorName: string;
  body: string;
  at: string;
};

export type AppSprint = {
  id: string;
  name: string;
  status: "planned" | "active" | "closed";
  completed: number;
  committed: number;
  startDate: string;
  endDate: string;
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export function statusGroup(status: IssueStatus): "open" | "closed" {
  return status === "done" || status === "canceled" ? "closed" : "open";
}

export function relative(value: string | Date, now: Date = new Date()): string {
  const at = value instanceof Date ? value : new Date(value);
  const ms = now.getTime() - at.getTime();
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min}min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return toAppUser(user);
}

export async function getWorkspaceShell(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspace = await resolveWorkspace(workspaceSlug, user.id);
  return { user, workspace };
}

export async function getWorkspacePageData(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const c = container();
  const projectsResult = await c.projects.listProjectsForWorkspace.execute({
    workspaceId: workspaceEntity.id,
  });
  const members = await c.workspaces.repository.listMembers(workspaceEntity.id);
  const projects = unwrap(projectsResult).map(toAppProject);
  const issueGroups = await Promise.all(
    projects.map((project) => listIssuesForProject(project.id)),
  );
  const issues = issueGroups.flat();

  return {
    user,
    workspace: toAppWorkspace(workspaceEntity, members.length),
    projects,
    team: members.map(toTeamMember),
    issues,
  };
}

export async function getProjectPageData(
  workspaceSlug: string,
  projectSlug: string,
  filter: { status?: string; priority?: string },
) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const projectEntity = await resolveProjectEntity(workspaceEntity.id, projectSlug);
  const status = parseStatusFilter(filter.status);
  const priority = parsePriorityFilter(filter.priority);
  const issueResult = await container().issues.listIssuesForProject.execute({
    projectId: projectEntity.id,
    filter: {
      ...(status.length > 0 ? { status } : {}),
      ...(priority.length > 0 ? { priority } : {}),
    },
    page: { limit: 100 },
  });
  const issues = await mapIssues(unwrap(issueResult).items);

  return {
    user,
    workspace: toAppWorkspace(workspaceEntity),
    project: toAppProject(projectEntity),
    issues,
    statusFilter: status,
  };
}

export async function getIssuePageData(
  workspaceSlug: string,
  projectSlug: string,
  issueId: string,
) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const projectEntity = await resolveProjectEntity(workspaceEntity.id, projectSlug);
  const c = container();
  const issueResult = await c.issues.getIssue.execute({ issueId });
  if (!issueResult.ok || issueResult.value.projectId !== projectEntity.id) notFound();
  const [issue] = await mapIssues([issueResult.value]);
  if (!issue) notFound();
  const activityResult = await c.issues.listActivityForIssue.execute({
    issueId,
    limit: 100,
  });
  const commentsResult = await c.comments.listCommentsForIssue.execute({ issueId });

  return {
    user,
    workspace: toAppWorkspace(workspaceEntity),
    project: toAppProject(projectEntity),
    issue,
    activity: unwrap(activityResult).map(toAppActivity),
    comments: unwrap(commentsResult).map(toAppComment),
  };
}

export async function getDashboardPageData(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const projectsResult = await container().projects.listProjectsForWorkspace.execute({
    workspaceId: workspaceEntity.id,
  });
  const issueGroups = await Promise.all(
    unwrap(projectsResult).map((project) => listIssuesForProject(project.id)),
  );
  const issues = issueGroups.flat();
  const sprints = await listSprintsForWorkspace(workspaceEntity.id);

  return {
    user,
    workspace: toAppWorkspace(workspaceEntity),
    issues,
    sprints,
  };
}

export async function getSprintsPageData(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const projectsResult = await container().projects.listProjectsForWorkspace.execute({
    workspaceId: workspaceEntity.id,
  });
  const issueGroups = await Promise.all(
    unwrap(projectsResult).map((project) => listIssuesForProject(project.id)),
  );

  return {
    user,
    workspace: toAppWorkspace(workspaceEntity),
    sprints: await listSprintsForWorkspace(workspaceEntity.id),
    issues: issueGroups.flat(),
  };
}

export async function getNewProjectPageData(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  return { user, workspace: toAppWorkspace(workspaceEntity) };
}

export async function getNewIssuePageData(workspaceSlug: string, projectSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const projectEntity = await resolveProjectEntity(workspaceEntity.id, projectSlug);
  return {
    user,
    workspace: toAppWorkspace(workspaceEntity),
    project: toAppProject(projectEntity),
  };
}

export async function getNewSprintPageData(workspaceSlug: string) {
  const user = await requireAppUser();
  const workspaceEntity = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const sprints = await listSprintsForWorkspace(workspaceEntity.id);
  return { user, workspace: toAppWorkspace(workspaceEntity), sprints };
}

export async function resolveWorkspace(workspaceSlug: string, actorId: string): Promise<AppWorkspace> {
  return toAppWorkspace(await resolveWorkspaceEntity(workspaceSlug, actorId));
}

export async function resolveWorkspaceEntity(
  workspaceSlug: string,
  actorId: string,
): Promise<Workspace> {
  const c = container();
  const workspace = await c.workspaces.repository.findBySlug(workspaceSlug);
  if (!workspace) notFound();
  const authorized = await c.workspaces.getWorkspace.execute({
    actorId,
    workspaceId: workspace.id,
  });
  if (!authorized.ok) notFound();
  return authorized.value;
}

export async function resolveProjectEntity(
  workspaceId: string,
  projectSlug: string,
): Promise<Project> {
  const project = await container().projects.repository.findByWorkspaceAndSlug(
    workspaceId,
    projectSlug,
  );
  if (!project) notFound();
  return project;
}

function toAppUser(user: UserContext): AppUser {
  const email = user.email.value;
  return {
    id: user.id.value,
    email,
    name: user.name ?? email,
  };
}

function toAppWorkspace(workspace: Workspace, memberCount = 0): AppWorkspace {
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    description: "Workspace conectado ao Supabase Postgres via Drizzle.",
    memberCount,
  };
}

function toAppProject(project: Project): AppProject {
  return {
    id: project.id,
    slug: project.slug,
    key: project.key,
    name: project.name,
    description: project.description ?? "Sem descricao.",
    color: colorFor(project.key),
    leadName: "Workspace team",
  };
}

async function listIssuesForProject(projectId: string): Promise<AppIssue[]> {
  const result = await container().issues.listIssuesForProject.execute({
    projectId,
    page: { limit: 100 },
  });
  return mapIssues(unwrap(result).items);
}

async function mapIssues(issues: Issue[]): Promise<AppIssue[]> {
  return Promise.all(issues.map(toAppIssue));
}

async function toAppIssue(issue: Issue): Promise<AppIssue> {
  const c = container();
  const [labelIds, commentsResult] = await Promise.all([
    c.issues.repository.listLabelIds(issue.id),
    c.comments.listCommentsForIssue.execute({ issueId: issue.id }),
  ]);
  const labels = labelIds.length > 0
    ? await labelsForProject(issue.projectId, labelIds)
    : [];

  return {
    id: issue.id,
    projectId: issue.projectId,
    number: issue.number,
    title: issue.title,
    description: issue.description ?? "",
    status: issue.status,
    priority: issue.priority,
    assigneeId: issue.assigneeId,
    assigneeName: issue.assigneeId ? shortId(issue.assigneeId) : null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    closedAt: issue.closedAt ? issue.closedAt.toISOString() : null,
    labels,
    comments: unwrap(commentsResult).length,
  };
}

async function labelsForProject(projectId: string, labelIds: string[]): Promise<string[]> {
  const labels = await container().labels.listLabelsForProject.execute({ projectId });
  const byId = new Map(unwrap(labels).map((label) => [label.id, label.name]));
  return labelIds.map((id) => byId.get(id)).filter((name): name is string => Boolean(name));
}

function toAppActivity(snapshot: ActivitySnapshot): AppActivity {
  const changed = snapshot.changedFields();
  const detail = changed.length > 0 ? changed.join(", ") : undefined;
  return {
    id: snapshot.id,
    action: snapshot.action,
    actor: shortId(snapshot.actorId),
    at: snapshot.createdAt.toISOString(),
    ...(detail ? { detail } : {}),
  };
}

function toAppComment(comment: Comment): AppComment {
  return {
    id: comment.id,
    authorName: shortId(comment.authorId),
    body: comment.body,
    at: comment.createdAt.toISOString(),
  };
}

async function listSprintsForWorkspace(workspaceId: string): Promise<AppSprint[]> {
  const sprints = await container().sprints.repository.listByWorkspace(workspaceId);
  return Promise.all(sprints.map(toAppSprint));
}

async function toAppSprint(sprint: Sprint): Promise<AppSprint> {
  const issueIds = await container().sprints.repository.listIssueIds(sprint.id);
  const issueResults = await Promise.all(
    issueIds.map((issueId) => container().issues.getIssue.execute({ issueId })),
  );
  const completed = issueResults.filter(
    (result) => result.ok && result.value.status === "done",
  ).length;
  return {
    id: sprint.id,
    name: sprint.name,
    status: sprint.status,
    completed,
    committed: sprint.capacity,
    startDate: sprint.startDate.toISOString(),
    endDate: sprint.endDate.toISOString(),
  };
}

function toTeamMember(member: WorkspaceMember) {
  return {
    id: member.userId,
    name: shortId(member.userId),
    role: member.role,
  };
}

function parseStatusFilter(raw: string | undefined): IssueStatus[] {
  if (!raw) return [];
  const valid: IssueStatus[] = ["backlog", "todo", "in_progress", "in_review", "done", "canceled"];
  return raw
    .split(",")
    .filter((status): status is IssueStatus => valid.includes(status as IssueStatus));
}

function parsePriorityFilter(raw: string | undefined): IssuePriority[] {
  if (!raw) return [];
  const valid: IssuePriority[] = ["none", "low", "medium", "high", "urgent"];
  return raw
    .split(",")
    .filter((priority): priority is IssuePriority => valid.includes(priority as IssuePriority));
}

function colorFor(seed: string): string {
  const palette = ["#0969da", "#1f883d", "#8250df", "#bf8700", "#cf222e", "#d4a72c"] as const;
  const sum = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[sum % palette.length] ?? "#0969da";
}

function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}
