import { beforeEach, describe, expect, it, vi } from "vitest";

const createDbClientMock = vi.fn(() => ({ kind: "db" }));
const createWorkspacesModuleMock = vi.fn(() => ({ kind: "workspaces" }));
const createProjectsModuleMock = vi.fn(() => ({ repository: { kind: "projectRepo" } }));
const createIssuesModuleMock = vi.fn(() => ({ repository: { kind: "issueRepo" } }));
const createCommentsModuleMock = vi.fn(() => ({ kind: "comments" }));
const createLabelsModuleMock = vi.fn(() => ({ kind: "labels" }));
const createWebhooksModuleMock = vi.fn(() => ({ queue: { kind: "queue" } }));
const createNotificationsModuleMock = vi.fn(() => ({
  registerSubscribers: vi.fn(),
}));
const createReportsModuleMock = vi.fn(() => ({ kind: "reports" }));
const createSprintsModuleMock = vi.fn(() => ({ kind: "sprints" }));
const createSearchModuleMock = vi.fn(() => ({ searcher: { kind: "searcher" } }));

vi.mock("@/infrastructure/db/client", () => ({
  createDbClient: createDbClientMock,
}));
vi.mock("@/modules/workspaces", () => ({
  createWorkspacesModule: createWorkspacesModuleMock,
}));
vi.mock("@/modules/projects", () => ({
  createProjectsModule: createProjectsModuleMock,
}));
vi.mock("@/modules/issues", () => ({
  createIssuesModule: createIssuesModuleMock,
}));
vi.mock("@/modules/comments", () => ({
  createCommentsModule: createCommentsModuleMock,
}));
vi.mock("@/modules/labels", () => ({
  createLabelsModule: createLabelsModuleMock,
}));
vi.mock("@/modules/webhooks", () => ({
  createWebhooksModule: createWebhooksModuleMock,
}));
vi.mock("@/modules/notifications", () => ({
  createNotificationsModule: createNotificationsModuleMock,
  buildNotificationChannels: vi.fn(() => []),
}));
vi.mock("@/modules/reports", () => ({
  createReportsModule: createReportsModuleMock,
}));
vi.mock("@/modules/sprints", () => ({
  createSprintsModule: createSprintsModuleMock,
}));
vi.mock("@/modules/search", () => ({
  createSearchModule: createSearchModuleMock,
}));
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation((options: unknown) => ({ kind: "redis", options })),
}));

describe("container", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/trackr";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { setContainer } = await import("./_bootstrap");
    setContainer(null);
  });

  it("wires sprints and search modules into the application container", async () => {
    const { container } = await import("./_bootstrap");

    const app = container() as unknown as {
      sprints?: unknown;
      search?: unknown;
    };

    expect(app.sprints).toEqual({ kind: "sprints" });
    expect(app.search).toEqual({ searcher: { kind: "searcher" } });
    expect(createSprintsModuleMock).toHaveBeenCalledWith(
      expect.objectContaining({ db: { kind: "db" } }),
    );
    expect(createSearchModuleMock).toHaveBeenCalledWith(
      expect.objectContaining({ db: { kind: "db" } }),
    );
  });

  it("passes an Upstash-backed cache to search when REST Redis env vars are set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const { container } = await import("./_bootstrap");

    container();

    expect(createSearchModuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: expect.any(Object),
      }),
    );
  });
});
