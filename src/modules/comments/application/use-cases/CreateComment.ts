import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
  type ValidationError,
} from "@/shared";
import {
  Comment,
  COMMENT_CREATED,
  type CommentCreatedEvent,
} from "../../domain";
import type { CommentRepository } from "../ports/CommentRepository";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";

export interface CreateCommentInput {
  actorId: string;
  issueId: string;
  body: string;
}

export type CreateCommentError = NotFoundError | ValidationError;

export interface CreateCommentDeps {
  commentRepo: CommentRepository;
  issueRepo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class CreateComment {
  constructor(private readonly deps: CreateCommentDeps) {}

  async execute(input: CreateCommentInput): Promise<Result<Comment, CreateCommentError>> {
    const { commentRepo, issueRepo, clock, ids, events } = this.deps;

    const issue = await issueRepo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const now = clock.now();
    const commentId = ids.generate(ID_PREFIXES.comment);

    const created = Comment.create({
      id: commentId,
      issueId: input.issueId,
      authorId: input.actorId,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    });
    if (!created.ok) return created;

    await commentRepo.save(created.value);

    const event: CommentCreatedEvent = {
      id: ids.generate("evt"),
      type: COMMENT_CREATED,
      aggregateType: "comment",
      aggregateId: commentId,
      payload: {
        commentId,
        issueId: input.issueId,
        authorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok(created.value);
  }
}
