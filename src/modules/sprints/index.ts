import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleSprintRepository } from "./infrastructure/DrizzleSprintRepository";
import {
  CreateSprint,
  StartSprint,
  CloseSprint,
  AddIssueToSprint,
  RemoveIssueFromSprint,
  GetActiveSprint,
  type SprintRepository,
} from "./application";

export type * from "./domain";
export type {
  SprintRepository,
  CreateSprintInput,
  CreateSprintOutput,
  CreateSprintError,
  StartSprintInput,
  StartSprintOutput,
  StartSprintError,
  CloseSprintInput,
  CloseSprintOutput,
  CloseSprintError,
  AddIssueToSprintInput,
  AddIssueToSprintError,
  RemoveIssueFromSprintInput,
  RemoveIssueFromSprintError,
  GetActiveSprintInput,
} from "./application";

export interface SprintsModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface SprintsModule {
  createSprint: CreateSprint;
  startSprint: StartSprint;
  closeSprint: CloseSprint;
  addIssueToSprint: AddIssueToSprint;
  removeIssueFromSprint: RemoveIssueFromSprint;
  getActiveSprint: GetActiveSprint;
  repository: SprintRepository;
}

// Composition root for the sprints module. The Next.js app calls this once
// at bootstrap and uses the returned use cases from server actions / handlers.
export function createSprintsModule(deps: SprintsModuleDeps): SprintsModule {
  const repository = new DrizzleSprintRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    createSprint: new CreateSprint(sharedDeps),
    startSprint: new StartSprint(sharedDeps),
    closeSprint: new CloseSprint(sharedDeps),
    addIssueToSprint: new AddIssueToSprint(repository),
    removeIssueFromSprint: new RemoveIssueFromSprint(repository),
    getActiveSprint: new GetActiveSprint(repository),
    repository,
  };
}
