import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleProjectRepository } from "./infrastructure/DrizzleProjectRepository";
import {
  CreateProject,
  GetProject,
  ListProjectsForWorkspace,
  type ProjectRepository,
} from "./application";

export type * from "./domain";
export type {
  ProjectRepository,
  CreateProjectInput,
  CreateProjectOutput,
  CreateProjectError,
  GetProjectInput,
  ListProjectsForWorkspaceInput,
} from "./application";

export interface ProjectsModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface ProjectsModule {
  createProject: CreateProject;
  getProject: GetProject;
  listProjectsForWorkspace: ListProjectsForWorkspace;
  repository: ProjectRepository;
}

export function createProjectsModule(deps: ProjectsModuleDeps): ProjectsModule {
  const repository = new DrizzleProjectRepository(deps.db);
  return {
    createProject: new CreateProject({
      repo: repository,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    getProject: new GetProject(repository),
    listProjectsForWorkspace: new ListProjectsForWorkspace(repository),
    repository,
  };
}
