import type { Comment } from "../../domain";

export interface CommentRepository {
  save(comment: Comment): Promise<void>;
  findById(id: string): Promise<Comment | null>;
  listByIssue(issueId: string): Promise<Comment[]>;
  delete(id: string): Promise<void>;
}
