import { ok, type Result } from "@/shared";
import type { Comment } from "../../domain";
import type { CommentRepository } from "../ports/CommentRepository";

export interface ListCommentsForIssueInput {
  issueId: string;
}

export class ListCommentsForIssue {
  constructor(private readonly repo: CommentRepository) {}

  async execute(input: ListCommentsForIssueInput): Promise<Result<Comment[], never>> {
    return ok(await this.repo.listByIssue(input.issueId));
  }
}
