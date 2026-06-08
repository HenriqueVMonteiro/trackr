import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { z } from "zod";
import {
  WorkspaceResource,
  ProjectResource,
  IssueResource,
  CommentResource,
  LabelResource,
  ActivityResource,
  CreateWorkspaceBody,
  CreateProjectBody,
  CreateIssueBody,
  EditIssueBody,
  TransitionIssueBody,
  CreateCommentBody,
  CreateLabelBody,
  WorkspaceListEnvelope,
  ProjectListEnvelope,
  IssueListEnvelope,
  CommentListEnvelope,
  LabelListEnvelope,
  ActivityListEnvelope,
  ProblemSchema,
  Cursor,
  Limit,
} from "../src/app/api/v1/_schemas";

const registry = new OpenAPIRegistry();

// Components
registry.register("Problem", ProblemSchema);
registry.register("Workspace", WorkspaceResource);
registry.register("Project", ProjectResource);
registry.register("Issue", IssueResource);
registry.register("Comment", CommentResource);
registry.register("Label", LabelResource);
registry.register("Activity", ActivityResource);
registry.register("CreateWorkspaceBody", CreateWorkspaceBody);
registry.register("CreateProjectBody", CreateProjectBody);
registry.register("CreateIssueBody", CreateIssueBody);
registry.register("EditIssueBody", EditIssueBody);
registry.register("TransitionIssueBody", TransitionIssueBody);
registry.register("CreateCommentBody", CreateCommentBody);
registry.register("CreateLabelBody", CreateLabelBody);

// Security
const bearer = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const problemResponse = {
  description: "Problem Details (RFC 7807)",
  content: { "application/problem+json": { schema: ProblemSchema } },
};

// ---------- workspaces
registry.registerPath({
  method: "get",
  path: "/api/v1/workspaces",
  summary: "List workspaces the current user is a member of",
  tags: ["workspaces"],
  security: [{ [bearer.name]: [] }],
  responses: {
    200: {
      description: "List of workspaces",
      content: { "application/json": { schema: WorkspaceListEnvelope } },
    },
    401: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/workspaces",
  summary: "Create a new workspace",
  tags: ["workspaces"],
  security: [{ [bearer.name]: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateWorkspaceBody } } },
  },
  responses: {
    201: {
      description: "Workspace created",
      content: {
        "application/json": {
          schema: z.object({ workspace: WorkspaceResource }),
        },
      },
    },
    401: problemResponse,
    409: problemResponse,
    422: problemResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/workspaces/{workspaceId}",
  summary: "Get a workspace by id",
  tags: ["workspaces"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ workspaceId: z.string() }),
  },
  responses: {
    200: {
      description: "Workspace",
      content: {
        "application/json": { schema: z.object({ workspace: WorkspaceResource }) },
      },
    },
    401: problemResponse,
    403: problemResponse,
    404: problemResponse,
  },
});

// ---------- projects
registry.registerPath({
  method: "get",
  path: "/api/v1/workspaces/{workspaceId}/projects",
  summary: "List projects in a workspace",
  tags: ["projects"],
  security: [{ [bearer.name]: [] }],
  request: { params: z.object({ workspaceId: z.string() }) },
  responses: {
    200: {
      description: "List of projects",
      content: { "application/json": { schema: ProjectListEnvelope } },
    },
    401: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/workspaces/{workspaceId}/projects",
  summary: "Create a project in a workspace",
  tags: ["projects"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ workspaceId: z.string() }),
    body: { content: { "application/json": { schema: CreateProjectBody } } },
  },
  responses: {
    201: {
      description: "Project created",
      content: { "application/json": { schema: z.object({ project: ProjectResource }) } },
    },
    401: problemResponse,
    409: problemResponse,
    422: problemResponse,
  },
});

// ---------- issues
registry.registerPath({
  method: "get",
  path: "/api/v1/projects/{projectId}/issues",
  summary: "List issues in a project, cursor-paginated",
  tags: ["issues"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ projectId: z.string() }),
    query: z.object({
      cursor: Cursor,
      limit: Limit,
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
    }),
  },
  responses: {
    200: {
      description: "Issue page",
      content: { "application/json": { schema: IssueListEnvelope } },
    },
    401: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/projects/{projectId}/issues",
  summary: "Create an issue in a project",
  tags: ["issues"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ projectId: z.string() }),
    body: { content: { "application/json": { schema: CreateIssueBody } } },
  },
  responses: {
    201: {
      description: "Issue created",
      content: { "application/json": { schema: z.object({ issue: IssueResource }) } },
    },
    401: problemResponse,
    404: problemResponse,
    422: problemResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/issues/{issueId}",
  summary: "Get an issue by id",
  tags: ["issues"],
  security: [{ [bearer.name]: [] }],
  request: { params: z.object({ issueId: z.string() }) },
  responses: {
    200: {
      description: "Issue",
      content: { "application/json": { schema: z.object({ issue: IssueResource }) } },
    },
    401: problemResponse,
    404: problemResponse,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/issues/{issueId}",
  summary: "Edit issue fields (title, description)",
  tags: ["issues"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ issueId: z.string() }),
    body: { content: { "application/json": { schema: EditIssueBody } } },
  },
  responses: {
    200: {
      description: "Issue updated",
      content: { "application/json": { schema: z.object({ issue: IssueResource }) } },
    },
    401: problemResponse,
    404: problemResponse,
    422: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/issues/{issueId}/transitions",
  summary: "Transition the issue to a new status. Validates the state machine",
  tags: ["issues"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ issueId: z.string() }),
    body: { content: { "application/json": { schema: TransitionIssueBody } } },
  },
  responses: {
    200: {
      description: "Transitioned",
      content: { "application/json": { schema: z.object({ issue: IssueResource }) } },
    },
    401: problemResponse,
    404: problemResponse,
    422: problemResponse,
  },
});

// ---------- comments
registry.registerPath({
  method: "get",
  path: "/api/v1/issues/{issueId}/comments",
  summary: "List comments on an issue",
  tags: ["comments"],
  security: [{ [bearer.name]: [] }],
  request: { params: z.object({ issueId: z.string() }) },
  responses: {
    200: {
      description: "Comments",
      content: { "application/json": { schema: CommentListEnvelope } },
    },
    401: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/issues/{issueId}/comments",
  summary: "Post a new comment",
  tags: ["comments"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ issueId: z.string() }),
    body: { content: { "application/json": { schema: CreateCommentBody } } },
  },
  responses: {
    201: {
      description: "Comment created",
      content: { "application/json": { schema: z.object({ comment: CommentResource }) } },
    },
    401: problemResponse,
    404: problemResponse,
    422: problemResponse,
  },
});

// ---------- activity
registry.registerPath({
  method: "get",
  path: "/api/v1/issues/{issueId}/activity",
  summary: "List activity log entries for an issue (Memento snapshots, newest first)",
  tags: ["issues", "activity"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ issueId: z.string() }),
    query: z.object({ limit: Limit }),
  },
  responses: {
    200: {
      description: "Activity entries",
      content: { "application/json": { schema: ActivityListEnvelope } },
    },
    401: problemResponse,
  },
});

// ---------- labels
registry.registerPath({
  method: "get",
  path: "/api/v1/projects/{projectId}/labels",
  summary: "List labels in a project",
  tags: ["labels"],
  security: [{ [bearer.name]: [] }],
  request: { params: z.object({ projectId: z.string() }) },
  responses: {
    200: {
      description: "Labels",
      content: { "application/json": { schema: LabelListEnvelope } },
    },
    401: problemResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/projects/{projectId}/labels",
  summary: "Create a label in a project",
  tags: ["labels"],
  security: [{ [bearer.name]: [] }],
  request: {
    params: z.object({ projectId: z.string() }),
    body: { content: { "application/json": { schema: CreateLabelBody } } },
  },
  responses: {
    201: {
      description: "Label created",
      content: { "application/json": { schema: z.object({ label: LabelResource }) } },
    },
    401: problemResponse,
    409: problemResponse,
    422: problemResponse,
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Trackr API",
    version: "1.0.0",
    description:
      "Issue tracker REST API. Spec generated from Zod schemas (single source of truth). Errors follow RFC 7807 Problem Details with content-type application/problem+json.",
    contact: { name: "Trackr Team" },
    license: { name: "MIT" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local dev" },
    { url: "https://trackr.example.com", description: "Production (placeholder)" },
  ],
});

const outPath = resolve(process.cwd(), "openapi/trackr.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n");
// eslint-disable-next-line no-console
console.log(`OpenAPI 3.1 spec written to ${outPath}`);
