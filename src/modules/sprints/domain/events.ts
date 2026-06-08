import type { DomainEvent } from "@/shared/events";

export const SPRINT_CREATED = "sprint.created" as const;
export const SPRINT_STARTED = "sprint.started" as const;
export const SPRINT_CLOSED = "sprint.closed" as const;

export interface SprintCreatedPayload {
  sprintId: string;
  workspaceId: string;
  name: string;
}

export interface SprintStartedPayload {
  sprintId: string;
  workspaceId: string;
  startedAt: Date;
}

export interface SprintClosedPayload {
  sprintId: string;
  workspaceId: string;
  closedAt: Date;
}

export type SprintCreatedEvent = DomainEvent<SprintCreatedPayload>;
export type SprintStartedEvent = DomainEvent<SprintStartedPayload>;
export type SprintClosedEvent = DomainEvent<SprintClosedPayload>;
