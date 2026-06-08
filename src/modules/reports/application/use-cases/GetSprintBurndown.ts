import { ok, err, type Result, NotFoundError } from "@/shared";
import type { BurndownReport } from "../../domain";
import type { ReportReader } from "../ports/ReportReader";

export interface GetSprintBurndownInput {
  sprintId: string;
}

export class GetSprintBurndown {
  constructor(private readonly reader: ReportReader) {}

  async execute(
    input: GetSprintBurndownInput,
  ): Promise<Result<BurndownReport, NotFoundError>> {
    const b = await this.reader.getSprintBurndown(input);
    if (!b) return err(new NotFoundError("Sprint", input.sprintId));
    return ok(b);
  }
}
