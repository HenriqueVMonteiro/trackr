import type { DomainEvent } from "@/shared/events";

export const TIME_LOGGED = "timetracking.logged" as const;
export const TIME_ENTRY_EDITED = "timetracking.entry_edited" as const;
export const TIME_ENTRY_DELETED = "timetracking.entry_deleted" as const;

export interface TimeLoggedPayload {
  timeEntryId: string;
  issueId: string;
  userId: string;
  durationSeconds: number;
}

export interface TimeEntryEditedPayload {
  timeEntryId: string;
  issueId: string;
  userId: string;
  durationSeconds: number;
}

export interface TimeEntryDeletedPayload {
  timeEntryId: string;
  issueId: string;
  userId: string;
}

export type TimeLoggedEvent = DomainEvent<TimeLoggedPayload>;
export type TimeEntryEditedEvent = DomainEvent<TimeEntryEditedPayload>;
export type TimeEntryDeletedEvent = DomainEvent<TimeEntryDeletedPayload>;
