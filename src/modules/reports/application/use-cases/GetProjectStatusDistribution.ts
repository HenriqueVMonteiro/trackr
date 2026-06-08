import { ok, type Result } from "@/shared";
import type { StatusDistribution } from "../../domain";
import type { ReportReader } from "../ports/ReportReader";

export interface GetProjectStatusDistributionInput {
  projectId: string;
}

export class GetProjectStatusDistribution {
  constructor(private readonly reader: ReportReader) {}

  async execute(
    input: GetProjectStatusDistributionInput,
  ): Promise<Result<StatusDistribution, never>> {
    return ok(await this.reader.getProjectStatusDistribution(input));
  }
}
