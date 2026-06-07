export type { CommentRepository } from "./ports/CommentRepository";
export {
  CreateComment,
  type CreateCommentInput,
  type CreateCommentError,
  type CreateCommentDeps,
} from "./use-cases/CreateComment";
export {
  EditComment,
  type EditCommentInput,
  type EditCommentError,
  type EditCommentDeps,
} from "./use-cases/EditComment";
export {
  DeleteComment,
  type DeleteCommentInput,
  type DeleteCommentError,
  type DeleteCommentDeps,
} from "./use-cases/DeleteComment";
export {
  ListCommentsForIssue,
  type ListCommentsForIssueInput,
} from "./use-cases/ListCommentsForIssue";
