import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleWorkspaceRepository } from "./infrastructure/DrizzleWorkspaceRepository";
import {
  CreateWorkspace,
  GetWorkspace,
  ListWorkspacesForUser,
  RenameWorkspace,
  InviteMember,
  RemoveMember,
  type WorkspaceRepository,
} from "./application";

export type * from "./domain";
export type {
  WorkspaceRepository,
  CreateWorkspaceInput,
  CreateWorkspaceOutput,
  CreateWorkspaceError,
  GetWorkspaceInput,
  GetWorkspaceError,
  ListWorkspacesForUserInput,
  RenameWorkspaceInput,
  RenameWorkspaceError,
  InviteMemberInput,
  InviteMemberError,
  RemoveMemberInput,
  RemoveMemberError,
} from "./application";

export interface WorkspacesModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface WorkspacesModule {
  createWorkspace: CreateWorkspace;
  getWorkspace: GetWorkspace;
  listWorkspacesForUser: ListWorkspacesForUser;
  renameWorkspace: RenameWorkspace;
  inviteMember: InviteMember;
  removeMember: RemoveMember;
  repository: WorkspaceRepository;
}

// Composition root for the workspaces module. The Next.js app calls this once
// at bootstrap and uses the returned use cases from server actions / handlers.
export function createWorkspacesModule(deps: WorkspacesModuleDeps): WorkspacesModule {
  const repository = new DrizzleWorkspaceRepository(deps.db);
  const sharedDeps = { repo: repository, clock: deps.clock, ids: deps.ids, events: deps.events };
  return {
    createWorkspace: new CreateWorkspace(sharedDeps),
    getWorkspace: new GetWorkspace(repository),
    listWorkspacesForUser: new ListWorkspacesForUser(repository),
    renameWorkspace: new RenameWorkspace(sharedDeps),
    inviteMember: new InviteMember(sharedDeps),
    removeMember: new RemoveMember(sharedDeps),
    repository,
  };
}
