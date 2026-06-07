import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleLabelRepository } from "./infrastructure/DrizzleLabelRepository";
import {
  CreateLabel,
  DeleteLabel,
  ListLabelsForProject,
  AttachLabelToIssue,
  DetachLabelFromIssue,
  type LabelRepository,
} from "./application";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";

export type * from "./domain";
export type {
  LabelRepository,
  CreateLabelInput,
  CreateLabelError,
  DeleteLabelInput,
  ListLabelsForProjectInput,
  AttachLabelToIssueInput,
  AttachLabelToIssueError,
  DetachLabelFromIssueInput,
} from "./application";

export interface LabelsModuleDeps {
  db: Database;
  issueRepo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface LabelsModule {
  createLabel: CreateLabel;
  deleteLabel: DeleteLabel;
  listLabelsForProject: ListLabelsForProject;
  attachLabelToIssue: AttachLabelToIssue;
  detachLabelFromIssue: DetachLabelFromIssue;
  repository: LabelRepository;
}

export function createLabelsModule(deps: LabelsModuleDeps): LabelsModule {
  const repository = new DrizzleLabelRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  const issueDeps = {
    issueRepo: deps.issueRepo,
    labelRepo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    createLabel: new CreateLabel(sharedDeps),
    deleteLabel: new DeleteLabel(sharedDeps),
    listLabelsForProject: new ListLabelsForProject(repository),
    attachLabelToIssue: new AttachLabelToIssue(issueDeps),
    detachLabelFromIssue: new DetachLabelFromIssue(issueDeps),
    repository,
  };
}
