import { ok, type Result } from "@/shared";
import { TimeReport } from "../../domain";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";

export interface GetIssueTotalInput {
  issueId: string;
}

export interface GetIssueTotalOutput {
  report: TimeReport;
}

// SOLID: SRP — agrega o tempo total de uma issue num TimeReport.
// SOLID: DIP — depende da port TimeEntryRepository.
export class GetIssueTotal {
  constructor(private readonly repo: TimeEntryRepository) {}

  async execute(
    input: GetIssueTotalInput,
  ): Promise<Result<GetIssueTotalOutput, never>> {
    const entries = await this.repo.listByIssue(input.issueId);
    return ok({ report: TimeReport.fromEntries(entries) });
  }
}
