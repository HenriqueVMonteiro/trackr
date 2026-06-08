import type { Sprint } from "../../domain";

// SOLID: DIP — Use cases dependem desta port; adapter concreto
// (DrizzleSprintRepository) é injetado no bootstrap.

export interface SprintRepository {
  // ----- sprint
  save(sprint: Sprint): Promise<void>;
  findById(id: string): Promise<Sprint | null>;
  listByWorkspace(workspaceId: string): Promise<Sprint[]>;
  findActiveByWorkspace(workspaceId: string): Promise<Sprint | null>;

  // ----- membership (sprint <-> issue)
  addIssue(sprintId: string, issueId: string): Promise<void>;
  removeIssue(sprintId: string, issueId: string): Promise<void>;
  listIssueIds(sprintId: string): Promise<string[]>;
}
