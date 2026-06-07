import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleIssueRepository } from "./infrastructure/DrizzleIssueRepository";
import {
  CreateIssue,
  GetIssue,
  TransitionIssue,
  AssignIssue,
  EditIssue,
  SetPriority,
  ListIssuesForProject,
  type IssueRepository,
} from "./application";
import type { ProjectRepository } from "@/modules/projects/application/ports/ProjectRepository";

export type * from "./domain";
export type {
  IssueRepository,
  IssueFilter,
  PageQuery,
  PageResult,
  CreateIssueInput,
  CreateIssueOutput,
  CreateIssueError,
  GetIssueInput,
  TransitionIssueInput,
  TransitionIssueError,
  AssignIssueInput,
  EditIssueInput,
  EditIssueError,
  SetPriorityInput,
  ListIssuesForProjectInput,
} from "./application";

export interface IssuesModuleDeps {
  db: Database;
  projectRepo: ProjectRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface IssuesModule {
  createIssue: CreateIssue;
  getIssue: GetIssue;
  transitionIssue: TransitionIssue;
  assignIssue: AssignIssue;
  editIssue: EditIssue;
  setPriority: SetPriority;
  listIssuesForProject: ListIssuesForProject;
  repository: IssueRepository;
}

export function createIssuesModule(deps: IssuesModuleDeps): IssuesModule {
  const repository = new DrizzleIssueRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    createIssue: new CreateIssue({
      issueRepo: repository,
      projectRepo: deps.projectRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    getIssue: new GetIssue(repository),
    transitionIssue: new TransitionIssue(sharedDeps),
    assignIssue: new AssignIssue(sharedDeps),
    editIssue: new EditIssue(sharedDeps),
    setPriority: new SetPriority(sharedDeps),
    listIssuesForProject: new ListIssuesForProject(repository),
    repository,
  };
}
