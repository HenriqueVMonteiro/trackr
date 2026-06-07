import { ok, err, type Result, NotFoundError } from "@/shared";
import type { Issue } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";

export interface GetIssueInput {
  issueId: string;
}

export class GetIssue {
  constructor(private readonly repo: IssueRepository) {}

  async execute(input: GetIssueInput): Promise<Result<Issue, NotFoundError>> {
    const issue = await this.repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));
    return ok(issue);
  }
}
