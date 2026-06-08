import { ok, err, type Result, NotFoundError } from "@/shared";
import type { SprintRepository } from "../ports/SprintRepository";

export interface RemoveIssueFromSprintInput {
  sprintId: string;
  issueId: string;
}

export type RemoveIssueFromSprintError = NotFoundError;

// SOLID: SRP — apenas remove uma issue da membership da sprint.
// SOLID: DIP — depende de SprintRepository (port).
export class RemoveIssueFromSprint {
  constructor(private readonly repo: SprintRepository) {}

  async execute(
    input: RemoveIssueFromSprintInput,
  ): Promise<Result<void, RemoveIssueFromSprintError>> {
    const sprint = await this.repo.findById(input.sprintId);
    if (!sprint) return err(new NotFoundError("Sprint", input.sprintId));

    await this.repo.removeIssue(input.sprintId, input.issueId);
    return ok(undefined);
  }
}
