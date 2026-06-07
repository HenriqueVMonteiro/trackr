import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError,
} from "@/shared";
import {
  COMMENT_DELETED,
  type CommentDeletedEvent,
} from "../../domain";
import type { CommentRepository } from "../ports/CommentRepository";

export interface DeleteCommentInput {
  actorId: string;
  commentId: string;
}

export type DeleteCommentError = NotFoundError | ForbiddenError;

export interface DeleteCommentDeps {
  repo: CommentRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class DeleteComment {
  constructor(private readonly deps: DeleteCommentDeps) {}

  async execute(input: DeleteCommentInput): Promise<Result<void, DeleteCommentError>> {
    const { repo, clock, ids, events } = this.deps;

    const comment = await repo.findById(input.commentId);
    if (!comment) return err(new NotFoundError("Comment", input.commentId));
    if (!comment.canBeEditedBy(input.actorId)) {
      return err(new ForbiddenError("Only the comment author can delete"));
    }

    await repo.delete(comment.id);

    const event: CommentDeletedEvent = {
      id: ids.generate("evt"),
      type: COMMENT_DELETED,
      aggregateType: "comment",
      aggregateId: comment.id,
      payload: {
        commentId: comment.id,
        issueId: comment.issueId,
        actorId: input.actorId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(undefined);
  }
}
