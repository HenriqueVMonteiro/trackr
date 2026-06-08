import {
  SystemClock,
  NanoidGenerator,
  InMemoryEventBus,
  type Clock,
  type IdGenerator,
  type EventBus,
} from "@/shared";
import { Redis } from "@upstash/redis";
import { createDbClient, type Database } from "@/infrastructure/db/client";
import { UpstashRedisCache } from "@/infrastructure/cache/UpstashRedisCache";
import { createWorkspacesModule, type WorkspacesModule } from "@/modules/workspaces";
import { createProjectsModule, type ProjectsModule } from "@/modules/projects";
import { createIssuesModule, type IssuesModule } from "@/modules/issues";
import { createCommentsModule, type CommentsModule } from "@/modules/comments";
import { createLabelsModule, type LabelsModule } from "@/modules/labels";
import { createWebhooksModule, type WebhooksModule } from "@/modules/webhooks";
import {
  createNotificationsModule,
  buildNotificationChannels,
  type NotificationsModule,
} from "@/modules/notifications";
import { createReportsModule, type ReportsModule } from "@/modules/reports";
import { createSprintsModule, type SprintsModule } from "@/modules/sprints";
import { createSearchModule, type SearchModule } from "@/modules/search";
import {
  BullMqDeliveryQueue,
  createRedisConnection,
} from "@/modules/webhooks/infrastructure/queue/BullMqDeliveryQueue";
import type { DeliveryQueue } from "@/modules/webhooks";

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
  webhooks: WebhooksModule;
  notifications: NotificationsModule;
  reports: ReportsModule;
  sprints: SprintsModule;
  search: SearchModule;
}

let _container: AppContainer | null = null;

export function container(): AppContainer {
  if (_container) return _container;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set. Cannot bootstrap container.");
  }
  if (dbUrl.includes("[YOUR-PASSWORD]")) {
    throw new Error("DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with the real Supabase database password.");
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
  const sprints = createSprintsModule({ db, clock, ids, events });

  // Webhooks usa a InMemoryDeliveryQueue por padrão; o processo worker (B3) injeta
  // a BullMqDeliveryQueue sobre Redis TCP. Ver ADR-0006.
  const webhookQueue = createWebhookQueueFromEnv();
  const webhooks = createWebhooksModule({
    db,
    clock,
    ids,
    events,
    ...(webhookQueue ? { queue: webhookQueue } : {}),
  });

  // Notifications: monta os canais a partir do ambiente e registra o subscriber
  // Observer de issue.assigned (GoF: Observer).
  const notifications = createNotificationsModule({
    db,
    clock,
    ids,
    events,
    channels: buildNotificationChannels(),
  });
  notifications.registerSubscribers();

  // Reports: read-only aggregations sobre issues (cycle time, throughput,
  // status distribution). Materialized views planejadas em produção — ver
  // drizzle/sql/views/README.md.
  const reports = createReportsModule({ db });
  const searchCache = createUpstashCacheFromEnv();
  const search = createSearchModule({
    db,
    ...(searchCache ? { cache: searchCache } : {}),
  });

  _container = {
    db,
    clock,
    ids,
    events,
    workspaces,
    projects,
    issues,
    comments,
    labels,
    webhooks,
    notifications,
    reports,
    sprints,
    search,
  };
  return _container;
}

// Test helper — replaces the singleton with a pre-built container.
// Used by integration / E2E suites (A12 / B12).
export function setContainer(c: AppContainer | null): void {
  _container = c;
}

function createUpstashCacheFromEnv(): UpstashRedisCache | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new UpstashRedisCache(new Redis({ url, token }));
}

function createWebhookQueueFromEnv(): DeliveryQueue | null {
  const redisUrl = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
  if (!redisUrl) return null;

  return new BullMqDeliveryQueue(createRedisConnection(redisUrl));
}
