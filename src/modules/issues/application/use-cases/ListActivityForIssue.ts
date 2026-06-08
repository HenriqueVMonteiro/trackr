import { ok, type Result } from "@/shared";
import type { ActivitySnapshot } from "../../domain/ActivitySnapshot";
import type { ActivityRepository } from "../ports/ActivityRepository";

export interface ListActivityForIssueInput {
  issueId: string;
  limit?: number;
}

export class ListActivityForIssue {
  constructor(private readonly repo: ActivityRepository) {}

  async execute(
    input: ListActivityForIssueInput,
  ): Promise<Result<ActivitySnapshot[], never>> {
    return ok(await this.repo.listByIssue(input.issueId, input.limit));
  }
}
