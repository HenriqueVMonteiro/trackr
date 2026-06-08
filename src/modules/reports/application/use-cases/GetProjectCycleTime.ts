import { ok, type Result } from "@/shared";
import type { CycleTimeReport } from "../../domain";
import type { ReportReader } from "../ports/ReportReader";

export interface GetProjectCycleTimeInput {
  projectId: string;
}

export class GetProjectCycleTime {
  constructor(private readonly reader: ReportReader) {}

  async execute(
    input: GetProjectCycleTimeInput,
  ): Promise<Result<CycleTimeReport, never>> {
    return ok(await this.reader.getProjectCycleTime(input));
  }
}
