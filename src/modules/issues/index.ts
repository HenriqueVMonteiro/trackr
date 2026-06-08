import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleIssueRepository } from "./infrastructure/DrizzleIssueRepository";
import { DrizzleActivityRepository } from "./infrastructure/DrizzleActivityRepository";
import {
  CreateIssue,
  GetIssue,
  TransitionIssue,
  AssignIssue,
  EditIssue,
  SetPriority,
  ListIssuesForProject,
  ListActivityForIssue,
  GetIssueTree,
  DeleteIssue,
  type IssueRepository,
  type ActivityRepository,
} from "./application";
import type { ProjectRepository } from "@/modules/projects/application/ports/ProjectRepository";

export type * from "./domain";
export type {
  IssueRepository,
  ActivityRepository,
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
  ListActivityForIssueInput,
  GetIssueTreeInput,
  DeleteIssueInput,
  DeleteIssueError,
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
  getIssueTree: GetIssueTree;
  transitionIssue: TransitionIssue;
  assignIssue: AssignIssue;
  editIssue: EditIssue;
  setPriority: SetPriority;
  listIssuesForProject: ListIssuesForProject;
  listActivityForIssue: ListActivityForIssue;
  deleteIssue: DeleteIssue;
  repository: IssueRepository;
  activityRepository: ActivityRepository;
}

export function createIssuesModule(deps: IssuesModuleDeps): IssuesModule {
  const repository = new DrizzleIssueRepository(deps.db);
  const activityRepository = new DrizzleActivityRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    activityRepo: activityRepository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    createIssue: new CreateIssue({
      issueRepo: repository,
      activityRepo: activityRepository,
      projectRepo: deps.projectRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    getIssue: new GetIssue(repository),
    getIssueTree: new GetIssueTree(repository),
    transitionIssue: new TransitionIssue(sharedDeps),
    assignIssue: new AssignIssue(sharedDeps),
    editIssue: new EditIssue(sharedDeps),
    setPriority: new SetPriority(sharedDeps),
    listIssuesForProject: new ListIssuesForProject(repository),
    listActivityForIssue: new ListActivityForIssue(activityRepository),
    deleteIssue: new DeleteIssue({
      repo: repository,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    repository,
    activityRepository,
  };
}
