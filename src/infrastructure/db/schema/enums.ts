import { pgEnum } from "drizzle-orm/pg-core";

export const issueStatusEnum = pgEnum("issue_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
]);

export const issuePriorityEnum = pgEnum("issue_priority", [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "member"]);
