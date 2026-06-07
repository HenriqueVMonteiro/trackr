import type { Project } from "../../domain";

export interface ProjectRepository {
  save(project: Project): Promise<void>;
  findById(id: string): Promise<Project | null>;
  findByWorkspaceAndSlug(workspaceId: string, slug: string): Promise<Project | null>;
  findByWorkspaceAndKey(workspaceId: string, key: string): Promise<Project | null>;
  listByWorkspace(workspaceId: string): Promise<Project[]>;

  // Allocates the next sequential issue number for this project atomically.
  // Used by issues/CreateIssue. The counter lives in the projects row to keep
  // it transactionally bound to project existence.
  allocateNextIssueNumber(projectId: string): Promise<number>;
}
