import {
  SystemClock,
  NanoidGenerator,
  InMemoryEventBus,
  type Clock,
  type IdGenerator,
  type EventBus,
} from "@/shared";
import { createDbClient, type Database } from "@/infrastructure/db/client";
import { createWorkspacesModule, type WorkspacesModule } from "@/modules/workspaces";
import { createProjectsModule, type ProjectsModule } from "@/modules/projects";
import { createIssuesModule, type IssuesModule } from "@/modules/issues";
import { createCommentsModule, type CommentsModule } from "@/modules/comments";
import { createLabelsModule, type LabelsModule } from "@/modules/labels";

// Composition root for the entire application. Route handlers + server
// actions import container() and get fully-wired modules. Initialized
// lazily so test code can override via TestContainer (B12 / A12) without
// requiring a real DATABASE_URL.

export interface AppContainer {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
  workspaces: WorkspacesModule;
  projects: ProjectsModule;
  issues: IssuesModule;
  comments: CommentsModule;
  labels: LabelsModule;
}

let _container: AppContainer | null = null;

export function container(): AppContainer {
  if (_container) return _container;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set. Cannot bootstrap container.");
  }

  const db = createDbClient(dbUrl);
  const clock = new SystemClock();
  const ids = new NanoidGenerator();
  const events = new InMemoryEventBus();

  const workspaces = createWorkspacesModule({ db, clock, ids, events });
  const projects = createProjectsModule({ db, clock, ids, events });
  const issues = createIssuesModule({
    db,
    projectRepo: projects.repository,
    clock,
    ids,
    events,
  });
  const comments = createCommentsModule({
    db,
    issueRepo: issues.repository,
    clock,
    ids,
    events,
  });
  const labels = createLabelsModule({
    db,
    issueRepo: issues.repository,
    clock,
    ids,
    events,
  });

  _container = { db, clock, ids, events, workspaces, projects, issues, comments, labels };
  return _container;
}

// Test helper — replaces the singleton with a pre-built container.
// Used by integration / E2E suites (A12 / B12).
export function setContainer(c: AppContainer | null): void {
  _container = c;
}
