import { ok, type Result } from "@/shared";
import type { Label } from "../../domain";
import type { LabelRepository } from "../ports/LabelRepository";

export interface ListLabelsForProjectInput {
  projectId: string;
}

export class ListLabelsForProject {
  constructor(private readonly repo: LabelRepository) {}

  async execute(input: ListLabelsForProjectInput): Promise<Result<Label[], never>> {
    return ok(await this.repo.listByProject(input.projectId));
  }
}
