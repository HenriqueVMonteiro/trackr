"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser, store } from "@/lib/demo-store";
import type { DemoIssue } from "@/lib/demo";

const VALID_STATUSES: ReadonlyArray<DemoIssue["status"]> = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
];

const VALID_PRIORITIES: ReadonlyArray<DemoIssue["priority"]> = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
];

export async function transitionIssueAction(formData: FormData): Promise<void> {
  const issueId = String(formData.get("issueId") ?? "");
  const to = String(formData.get("to") ?? "") as DemoIssue["status"];
  if (!VALID_STATUSES.includes(to)) return;
  store.transitionIssue(issueId, to, currentUser);
  const project = String(formData.get("projectSlug") ?? "trackr");
  revalidatePath(`/trackr/projects/${project}/issues/${issueId}`);
  revalidatePath(`/trackr/projects/${project}`);
  revalidatePath(`/trackr/dashboard`);
}

export async function addCommentAction(formData: FormData): Promise<void> {
  const issueId = String(formData.get("issueId") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!body.trim()) return;
  store.addComment(issueId, body, currentUser);
  const project = String(formData.get("projectSlug") ?? "trackr");
  revalidatePath(`/trackr/projects/${project}/issues/${issueId}`);
}

export async function assignIssueAction(formData: FormData): Promise<void> {
  const issueId = String(formData.get("issueId") ?? "");
  const assigneeName = String(formData.get("assigneeName") ?? "").trim() || null;
  store.assignIssue(issueId, assigneeName, currentUser);
  const project = String(formData.get("projectSlug") ?? "trackr");
  revalidatePath(`/trackr/projects/${project}/issues/${issueId}`);
}

export async function createIssueAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "trackr");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "none") as DemoIssue["priority"];
  const priority = VALID_PRIORITIES.includes(priorityRaw) ? priorityRaw : "none";
  if (!title) return;
  const issue = store.createIssue({
    projectSlug,
    title,
    description,
    priority,
    actor: currentUser,
  });
  revalidatePath(`/trackr/projects/${projectSlug}`);
  revalidatePath(`/trackr/dashboard`);
  redirect(`/trackr/projects/${projectSlug}/issues/${issue.id}`);
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const key = String(formData.get("key") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#0969da");
  if (!name || !slug || !key) return;
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) return;
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) return;
  store.createProject({ name, slug, key, description, color });
  revalidatePath("/trackr");
  redirect(`/trackr/projects/${slug}`);
}

export async function createSprintAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const committed = parseInt(String(formData.get("committed") ?? "0"), 10) || 0;
  if (!name || !startDate || !endDate) return;
  store.createSprint({
    name,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    committed,
  });
  revalidatePath("/trackr/sprints");
  redirect("/trackr/sprints");
}

export async function startSprintAction(formData: FormData): Promise<void> {
  store.startSprint(String(formData.get("sprintId") ?? ""));
  revalidatePath("/trackr/sprints");
}

export async function closeSprintAction(formData: FormData): Promise<void> {
  store.closeSprint(String(formData.get("sprintId") ?? ""));
  revalidatePath("/trackr/sprints");
}

export async function deleteIssueAction(formData: FormData): Promise<void> {
  const issueId = String(formData.get("issueId") ?? "");
  const projectSlug = String(formData.get("projectSlug") ?? "trackr");
  store.deleteIssue(issueId);
  revalidatePath(`/trackr/projects/${projectSlug}`);
  redirect(`/trackr/projects/${projectSlug}`);
}

export async function signOutAction(): Promise<void> {
  redirect("/login");
}
