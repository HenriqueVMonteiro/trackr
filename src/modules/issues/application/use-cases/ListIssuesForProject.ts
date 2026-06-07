import { ok, type Result } from "@/shared";
import type { Issue } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { IssueFilter, PageQuery, PageResult } from "../dto";

export interface ListIssuesForProjectInput {
  projectId: string;
  filter?: IssueFilter;
  page?: PageQuery;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class ListIssuesForProject {
  constructor(private readonly repo: IssueRepository) {}

  async execute(
    input: ListIssuesForProjectInput,
  ): Promise<Result<PageResult<Issue>, never>> {
    const limit = Math.min(input.page?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const result = await this.repo.listByProject(input.projectId, input.filter ?? {}, {
      cursor: input.page?.cursor,
      limit,
    });
    return ok(result);
  }
}
