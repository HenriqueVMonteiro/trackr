import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleTimeEntryRepository } from "./infrastructure/DrizzleTimeEntryRepository";
import {
  LogTime,
  EditEntry,
  DeleteEntry,
  GetUserSummary,
  GetIssueTotal,
  type TimeEntryRepository,
} from "./application";

export type * from "./domain";
export type {
  TimeEntryRepository,
  LogTimeInput,
  LogTimeOutput,
  LogTimeError,
  EditEntryInput,
  EditEntryOutput,
  EditEntryError,
  DeleteEntryInput,
  DeleteEntryError,
  GetUserSummaryInput,
  GetUserSummaryOutput,
  GetIssueTotalInput,
  GetIssueTotalOutput,
} from "./application";

export interface TimetrackingModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export interface TimetrackingModule {
  logTime: LogTime;
  editEntry: EditEntry;
  deleteEntry: DeleteEntry;
  getUserSummary: GetUserSummary;
  getIssueTotal: GetIssueTotal;
  repository: TimeEntryRepository;
}

// Composition root for the timetracking module. The Next.js app calls this once
// at bootstrap and uses the returned use cases from server actions / handlers.
export function createTimetrackingModule(deps: TimetrackingModuleDeps): TimetrackingModule {
  const repository = new DrizzleTimeEntryRepository(deps.db);
  const sharedDeps = {
    repo: repository,
    clock: deps.clock,
    ids: deps.ids,
    events: deps.events,
  };
  return {
    logTime: new LogTime(sharedDeps),
    editEntry: new EditEntry(sharedDeps),
    deleteEntry: new DeleteEntry(sharedDeps),
    getUserSummary: new GetUserSummary(repository),
    getIssueTotal: new GetIssueTotal(repository),
    repository,
  };
}
