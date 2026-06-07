import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError,
  type ValidationError,
} from "@/shared";
import {
  type Comment,
  COMMENT_EDITED,
  type CommentEditedEvent,
} from "../../domain";
import type { CommentRepository } from "../ports/CommentRepository";

export interface EditCommentInput {
  actorId: string;
  commentId: string;
  body: string;
}

export type EditCommentError = NotFoundError | ForbiddenError | ValidationError;

export interface EditCommentDeps {
  repo: CommentRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class EditComment {
  constructor(private readonly deps: EditCommentDeps) {}

  async execute(input: EditCommentInput): Promise<Result<Comment, EditCommentError>> {
    const { repo, clock, ids, events } = this.deps;

    const comment = await repo.findById(input.commentId);
    if (!comment) return err(new NotFoundError("Comment", input.commentId));
    if (!comment.canBeEditedBy(input.actorId)) {
      return err(new ForbiddenError("Only the comment author can edit"));
    }

    const now = clock.now();
    const edited = comment.edit(input.body, now);
    if (!edited.ok) return edited;
    if (edited.value === comment) return ok(comment);

    await repo.save(edited.value);

    const event: CommentEditedEvent = {
      id: ids.generate("evt"),
      type: COMMENT_EDITED,
      aggregateType: "comment",
      aggregateId: comment.id,
      payload: {
        commentId: comment.id,
        issueId: comment.issueId,
        actorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok(edited.value);
  }
}
