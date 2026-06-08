"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { container } from "@/app/_bootstrap";
import { unwrap } from "@/shared";
import { SupabaseAuthProvider } from "@/modules/auth-rls/infrastructure/SupabaseAuthProvider";
import { SignIn, SignOut, SignUp } from "@/modules/auth-rls/application";
import { ISSUE_PRIORITIES, type IssuePriority } from "@/modules/issues/domain/IssuePriority";
import { ISSUE_STATUSES, type IssueStatus } from "@/modules/issues/domain/IssueStatus";
import { requireAppUser, resolveProjectEntity, resolveWorkspaceEntity } from "@/app/(client)/_data";
import { ensureUserMirror } from "@/app/(client)/_user-mirror";

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await new SignIn(new SupabaseAuthProvider()).execute({ email, password });
  if (!result.ok) {
    redirect("/login?error=invalid-credentials");
  }

  const userId = result.value.id.value;
  const workspaces = await container().workspaces.listWorkspacesForUser.execute({ userId });
  const first = unwrap(workspaces)[0];
  redirect(first ? `/${first.slug}` : "/register?error=no-workspace");
}

export async function registerAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const workspaceName = name ? `${name}'s workspace` : "Trackr workspace";

  const authResult = await new SignUp(new SupabaseAuthProvider()).execute({
    email,
    password,
    ...(name ? { name } : {}),
  });
  if (!authResult.ok) {
    redirect(`/register?error=${registerAuthErrorCode(authResult.error)}`);
  }

  const app = container();
  try {
    await ensureUserMirror(app.db, authResult.value);
  } catch {
    redirect("/register?error=user-sync-failed");
  }

  const workspaceResult = await app.workspaces.createWorkspace.execute({
    name: workspaceName,
    slug,
    ownerId: authResult.value.id.value,
  });
  if (!workspaceResult.ok) {
    redirect(`/register?error=${registerWorkspaceErrorCode(workspaceResult.error)}`);
  }

  redirect(`/${workspaceResult.value.workspace.slug}`);
}

export async function transitionIssueAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const issueId = String(formData.get("issueId") ?? "");
  const to = parseIssueStatus(String(formData.get("to") ?? ""));
  if (!issueId || !to) return;

  const result = await container().issues.transitionIssue.execute({
    actorId: user.id,
    issueId,
    to,
  });
  if (!result.ok) return;

  revalidateIssuePaths(formData, issueId);
}

export async function addCommentAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const issueId = String(formData.get("issueId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!issueId || !body) return;

  const result = await container().comments.createComment.execute({
    issueId,
    actorId: user.id,
    body,
  });
  if (!result.ok) return;

  revalidateIssuePaths(formData, issueId);
}

export async function assignIssueAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const issueId = String(formData.get("issueId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
  if (!issueId) return;

  const result = await container().issues.assignIssue.execute({
    actorId: user.id,
    issueId,
    assigneeId,
  });
  if (!result.ok) return;

  revalidateIssuePaths(formData, issueId);
}

export async function createIssueAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  const projectSlug = String(formData.get("projectSlug") ?? "trackr");
  const workspace = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const project = await resolveProjectEntity(workspace.id, projectSlug);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = parseIssuePriority(String(formData.get("priority") ?? "none")) ?? "none";
  if (!title) return;

  const result = await container().issues.createIssue.execute({
    actorId: user.id,
    projectId: project.id,
    title,
    description,
    priority,
  });
  if (!result.ok) return;

  revalidatePath(`/${workspace.slug}/projects/${project.slug}`);
  revalidatePath(`/${workspace.slug}/dashboard`);
  redirect(`/${workspace.slug}/projects/${project.slug}/issues/${result.value.issue.id}`);
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  const workspace = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const key = String(formData.get("key") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !slug || !key) return;

  const result = await container().projects.createProject.execute({
    actorId: user.id,
    workspaceId: workspace.id,
    name,
    slug,
    key,
    description,
  });
  if (!result.ok) return;

  revalidatePath(`/${workspace.slug}`);
  redirect(`/${workspace.slug}/projects/${result.value.project.slug}`);
}

export async function createSprintAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  const workspace = await resolveWorkspaceEntity(workspaceSlug, user.id);
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const capacity = parseInt(String(formData.get("committed") ?? "0"), 10) || 0;
  if (!name || !startDate || !endDate) return;

  const result = await container().sprints.createSprint.execute({
    workspaceId: workspace.id,
    name,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    capacity,
  });
  if (!result.ok) return;

  revalidatePath(`/${workspace.slug}/sprints`);
  redirect(`/${workspace.slug}/sprints`);
}

export async function startSprintAction(formData: FormData): Promise<void> {
  await requireAppUser();
  const sprintId = String(formData.get("sprintId") ?? "");
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  if (!sprintId) return;

  const result = await container().sprints.startSprint.execute({ sprintId });
  if (!result.ok) return;
  revalidatePath(`/${workspaceSlug}/sprints`);
}

export async function closeSprintAction(formData: FormData): Promise<void> {
  await requireAppUser();
  const sprintId = String(formData.get("sprintId") ?? "");
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  if (!sprintId) return;

  const result = await container().sprints.closeSprint.execute({ sprintId });
  if (!result.ok) return;
  revalidatePath(`/${workspaceSlug}/sprints`);
}

export async function deleteIssueAction(formData: FormData): Promise<void> {
  const user = await requireAppUser();
  const issueId = String(formData.get("issueId") ?? "");
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  const projectSlug = String(formData.get("projectSlug") ?? "trackr");
  if (!issueId) return;

  const result = await container().issues.deleteIssue.execute({
    actorId: user.id,
    issueId,
  });
  if (!result.ok) return;

  revalidatePath(`/${workspaceSlug}/projects/${projectSlug}`);
  redirect(`/${workspaceSlug}/projects/${projectSlug}`);
}

export async function signOutAction(): Promise<void> {
  await new SignOut(new SupabaseAuthProvider()).execute();
  redirect("/login");
}

function parseIssueStatus(raw: string): IssueStatus | null {
  return ISSUE_STATUSES.includes(raw as IssueStatus) ? (raw as IssueStatus) : null;
}

function parseIssuePriority(raw: string): IssuePriority | null {
  return ISSUE_PRIORITIES.includes(raw as IssuePriority) ? (raw as IssuePriority) : null;
}

function revalidateIssuePaths(formData: FormData, issueId: string): void {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "trackr");
  const projectSlug = String(formData.get("projectSlug") ?? "trackr");
  revalidatePath(`/${workspaceSlug}/projects/${projectSlug}/issues/${issueId}`);
  revalidatePath(`/${workspaceSlug}/projects/${projectSlug}`);
  revalidatePath(`/${workspaceSlug}/dashboard`);
}

function registerAuthErrorCode(error: unknown): string {
  const code = domainErrorCode(error);
  if (code === "email_taken") return "email-taken";
  if (code === "weak_password") return "weak-password";
  return "signup-failed";
}

function registerWorkspaceErrorCode(error: unknown): string {
  const code = domainErrorCode(error);
  if (code === "conflict") return "workspace-slug-taken";
  if (code === "validation") return "workspace-invalid";
  return "workspace-failed";
}

function domainErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}
