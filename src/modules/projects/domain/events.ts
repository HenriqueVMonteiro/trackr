import type { DomainEvent } from "@/shared/events";

export const PROJECT_CREATED = "project.created" as const;
export const PROJECT_ARCHIVED = "project.archived" as const;

export interface ProjectCreatedPayload {
  projectId: string;
  workspaceId: string;
  name: string;
  slug: string;
  key: string;
  createdBy: string;
}

export interface ProjectArchivedPayload {
  projectId: string;
  workspaceId: string;
  actorId: string;
}

export type ProjectCreatedEvent = DomainEvent<ProjectCreatedPayload>;
export type ProjectArchivedEvent = DomainEvent<ProjectArchivedPayload>;
