import type { DomainEvent } from "@/shared/events";

export const COMMENT_CREATED = "comment.created" as const;
export const COMMENT_EDITED = "comment.edited" as const;
export const COMMENT_DELETED = "comment.deleted" as const;

export interface CommentCreatedPayload {
  commentId: string;
  issueId: string;
  authorId: string;
}

export interface CommentEditedPayload {
  commentId: string;
  issueId: string;
  actorId: string;
}

export interface CommentDeletedPayload {
  commentId: string;
  issueId: string;
  actorId: string;
}

export type CommentCreatedEvent = DomainEvent<CommentCreatedPayload>;
export type CommentEditedEvent = DomainEvent<CommentEditedPayload>;
export type CommentDeletedEvent = DomainEvent<CommentDeletedPayload>;
