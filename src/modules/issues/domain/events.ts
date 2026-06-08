import type { DomainEvent } from "@/shared/events";
import type { IssueStatus } from "./IssueStatus";
import type { IssuePriority } from "./IssuePriority";

export const ISSUE_CREATED = "issue.created" as const;
export const ISSUE_TRANSITIONED = "issue.transitioned" as const;
export const ISSUE_ASSIGNED = "issue.assigned" as const;
export const ISSUE_EDITED = "issue.edited" as const;
export const ISSUE_PRIORITY_CHANGED = "issue.priority_changed" as const;
export const ISSUE_LABELED = "issue.labeled" as const;
export const ISSUE_UNLABELED = "issue.unlabeled" as const;
export const ISSUE_DELETED = "issue.deleted" as const;

export interface IssueCreatedPayload {
  issueId: string;
  projectId: string;
  number: number;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdBy: string;
  parentId: string | null;
}

export interface IssueTransitionedPayload {
  issueId: string;
  projectId: string;
  from: IssueStatus;
  to: IssueStatus;
  actorId: string;
}

export interface IssueAssignedPayload {
  issueId: string;
  projectId: string;
  assigneeId: string | null;
  previousAssigneeId: string | null;
  actorId: string;
}

export interface IssueEditedPayload {
  issueId: string;
  projectId: string;
  actorId: string;
  changedFields: ReadonlyArray<"title" | "description">;
}

export interface IssuePriorityChangedPayload {
  issueId: string;
  projectId: string;
  from: IssuePriority;
  to: IssuePriority;
  actorId: string;
}

export interface IssueLabeledPayload {
  issueId: string;
  projectId: string;
  labelId: string;
  actorId: string;
}

export interface IssueDeletedPayload {
  issueId: string;
  projectId: string;
  number: number;
  actorId: string;
}

export type IssueCreatedEvent = DomainEvent<IssueCreatedPayload>;
export type IssueTransitionedEvent = DomainEvent<IssueTransitionedPayload>;
export type IssueAssignedEvent = DomainEvent<IssueAssignedPayload>;
export type IssueEditedEvent = DomainEvent<IssueEditedPayload>;
export type IssuePriorityChangedEvent = DomainEvent<IssuePriorityChangedPayload>;
export type IssueLabeledEvent = DomainEvent<IssueLabeledPayload>;
export type IssueDeletedEvent = DomainEvent<IssueDeletedPayload>;
