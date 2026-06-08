import { ok, err, type Result, NotFoundError } from "@/shared";
import type { SprintRepository } from "../ports/SprintRepository";

export interface AddIssueToSprintInput {
  sprintId: string;
  issueId: string;
}

export type AddIssueToSprintError = NotFoundError;

// SOLID: SRP — apenas adiciona uma issue à membership da sprint.
// SOLID: DIP — depende de SprintRepository (port).
export class AddIssueToSprint {
  constructor(private readonly repo: SprintRepository) {}

  async execute(
    input: AddIssueToSprintInput,
  ): Promise<Result<void, AddIssueToSprintError>> {
    const sprint = await this.repo.findById(input.sprintId);
    if (!sprint) return err(new NotFoundError("Sprint", input.sprintId));

    await this.repo.addIssue(input.sprintId, input.issueId);
    return ok(undefined);
  }
}
