import { ok, type Result } from "@/shared";
import { TimeReport } from "../../domain";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";

export interface GetUserSummaryInput {
  userId: string;
}

export interface GetUserSummaryOutput {
  report: TimeReport;
}

// SOLID: SRP — agrega o tempo total de um usuário num TimeReport.
// SOLID: DIP — depende da port TimeEntryRepository.
export class GetUserSummary {
  constructor(private readonly repo: TimeEntryRepository) {}

  async execute(
    input: GetUserSummaryInput,
  ): Promise<Result<GetUserSummaryOutput, never>> {
    const entries = await this.repo.listByUser(input.userId);
    return ok({ report: TimeReport.fromEntries(entries) });
  }
}
