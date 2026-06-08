import { ok, err, type Result, ValidationError } from "@/shared";
import type { ThroughputBucket } from "../../domain";
import type { ReportReader } from "../ports/ReportReader";

export interface GetProjectThroughputInput {
  projectId: string;
  from: Date;
  to: Date;
}

const MAX_WEEKS = 52;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export class GetProjectThroughput {
  constructor(private readonly reader: ReportReader) {}

  async execute(
    input: GetProjectThroughputInput,
  ): Promise<Result<ThroughputBucket[], ValidationError>> {
    if (input.to.getTime() <= input.from.getTime()) {
      return err(
        new ValidationError("to must be strictly after from", { field: "to" }),
      );
    }
    const weeks = (input.to.getTime() - input.from.getTime()) / MS_PER_WEEK;
    if (weeks > MAX_WEEKS) {
      return err(
        new ValidationError(`Range must be <= ${MAX_WEEKS} weeks`, {
          field: "to",
        }),
      );
    }
    const data = await this.reader.getProjectThroughput(input);
    return ok(data);
  }
}
