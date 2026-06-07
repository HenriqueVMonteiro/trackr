import type { DomainEvent } from "@/shared/events";

export const LABEL_CREATED = "label.created" as const;
export const LABEL_DELETED = "label.deleted" as const;

export interface LabelCreatedPayload {
  labelId: string;
  projectId: string;
  name: string;
  color: string;
  actorId: string;
}

export interface LabelDeletedPayload {
  labelId: string;
  projectId: string;
  actorId: string;
}

export type LabelCreatedEvent = DomainEvent<LabelCreatedPayload>;
export type LabelDeletedEvent = DomainEvent<LabelDeletedPayload>;
