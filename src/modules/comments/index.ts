import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleCommentRepository } from "./infrastructure/DrizzleCommentRepository";
import {
  CreateComment,
  EditComment,
  DeleteComment,
  ListCommentsForIssue,
  type CommentRepository,
} from "./application";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";

export type * from "./domain";
export type {
  CommentRepository,
  CreateCommentInput,
  CreateCommentError,
  EditCommentInput,
  EditCommentError,
  DeleteCommentInput,
  DeleteCommentError,
  ListCommentsForIssueInput,
} from "./application";

export interface CommentsModuleDeps {
  db: Database;
  issueRepo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface CommentsModule {
  createComment: CreateComment;
  editComment: EditComment;
  deleteComment: DeleteComment;
  listCommentsForIssue: ListCommentsForIssue;
  repository: CommentRepository;
}

export function createCommentsModule(deps: CommentsModuleDeps): CommentsModule {
  const repository = new DrizzleCommentRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    createComment: new CreateComment({
      commentRepo: repository,
      issueRepo: deps.issueRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    editComment: new EditComment(sharedDeps),
    deleteComment: new DeleteComment(sharedDeps),
    listCommentsForIssue: new ListCommentsForIssue(repository),
    repository,
  };
}
