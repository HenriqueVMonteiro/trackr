import { ok, err, type Result, NotFoundError } from "@/shared";
import type { SprintVelocity } from "../../domain";
import type { ReportReader } from "../ports/ReportReader";

export interface GetSprintVelocityInput {
  sprintId: string;
}

export class GetSprintVelocity {
  constructor(private readonly reader: ReportReader) {}

  async execute(
    input: GetSprintVelocityInput,
  ): Promise<Result<SprintVelocity, NotFoundError>> {
    const v = await this.reader.getSprintVelocity(input);
    if (!v) return err(new NotFoundError("Sprint", input.sprintId));
    return ok(v);
  }
}
