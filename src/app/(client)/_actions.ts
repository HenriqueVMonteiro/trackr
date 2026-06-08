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
