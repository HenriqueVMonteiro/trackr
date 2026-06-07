import type { Workspace, WorkspaceMember } from "../../domain";

// SOLID: DIP — Use cases dependem desta port; adapter concreto
// (DrizzleWorkspaceRepository) é injetado no bootstrap.
//
// SOLID: ISP — Em workspaces o read e write andam juntos sem dor.
// Em issues separamos (IssueReader / IssueWriter). Aqui manter coeso é honesto.

export interface WorkspaceRepository {
  // ----- workspace
  save(workspace: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  listByUserId(userId: string): Promise<Workspace[]>;

  // ----- members
  addMember(member: WorkspaceMember): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  findMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  listMembers(workspaceId: string): Promise<WorkspaceMember[]>;

  // ----- composite (used by CreateWorkspace to seed owner member atomically)
  saveWithOwner(workspace: Workspace, owner: WorkspaceMember): Promise<void>;
}
