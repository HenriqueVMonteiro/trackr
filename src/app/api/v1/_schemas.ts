import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ---------- shared
export const ProblemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string(),
    instance: z.string().optional(),
  })
  .passthrough()
  .openapi("Problem", {
    description: "RFC 7807 Problem Details",
  });

export const Cursor = z.string().optional().openapi({
  description: "Opaque base64 cursor returned by a previous list response",
});

export const Limit = z.coerce.number().int().min(1).max(200).default(50).openapi({
  description: "Page size, capped at 200",
});

// ---------- enums shared with domain
export const IssueStatusEnum = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
]);
export const IssuePriorityEnum = z.enum(["none", "low", "medium", "high", "urgent"]);
export const WorkspaceRoleEnum = z.enum(["owner", "member"]);

// ---------- resources (response shapes)
export const WorkspaceResource = z
  .object({
    id: z.string().openapi({ example: "wsp_4kFvCYTGFTwUhKKxOIPa1" }),
    name: z.string(),
    slug: z.string(),
    ownerId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Workspace");

export const ProjectResource = z
  .object({
    id: z.string().openapi({ example: "prj_OXVTjsTpZuxlMhPyaC0fM" }),
    workspaceId: z.string(),
    name: z.string(),
    slug: z.string(),
    key: z.string(),
    description: z.string().nullable(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Project");

export const IssueResource = z
  .object({
    id: z.string().openapi({ example: "iss_dJfXxa2bnzm5Y8Pq6r1JN" }),
    projectId: z.string(),
    number: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    status: IssueStatusEnum,
    priority: IssuePriorityEnum,
    assigneeId: z.string().nullable(),
    approverId: z.string().nullable(),
    parentId: z.string().nullable(),
    createdBy: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    closedAt: z.string().datetime().nullable(),
    canceledAt: z.string().datetime().nullable(),
  })
  .openapi("Issue");

export const CommentResource = z
  .object({
    id: z.string(),
    issueId: z.string(),
    authorId: z.string().uuid(),
    body: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Comment");

export const LabelResource = z
  .object({
    id: z.string(),
    projectId: z.string(),
    name: z.string(),
    color: z.string().regex(/^#[0-9a-f]{6}$/),
    createdAt: z.string().datetime(),
  })
  .openapi("Label");

// ---------- request bodies
export const CreateWorkspaceBody = z
  .object({
    name: z.string().min(2).max(50),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
  })
  .openapi("CreateWorkspaceBody");

export const CreateProjectBody = z
  .object({
    name: z.string().min(2).max(100),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
    key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/),
    description: z.string().max(2000).optional(),
  })
  .openapi("CreateProjectBody");

export const CreateIssueBody = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(50_000).nullable().optional(),
    priority: IssuePriorityEnum.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    parentId: z.string().nullable().optional(),
  })
  .openapi("CreateIssueBody");

export const EditIssueBody = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(50_000).nullable().optional(),
  })
  .openapi("EditIssueBody");

export const TransitionIssueBody = z
  .object({
    to: IssueStatusEnum,
  })
  .openapi("TransitionIssueBody");

export const CreateCommentBody = z
  .object({
    body: z.string().min(1).max(10000),
  })
  .openapi("CreateCommentBody");

export const CreateLabelBody = z
  .object({
    name: z.string().min(1).max(50),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "must be #RRGGBB"),
  })
  .openapi("CreateLabelBody");

// ---------- list envelopes
export const WorkspaceListEnvelope = z
  .object({
    items: z.array(WorkspaceResource),
    next_cursor: z.string().nullable(),
  })
  .openapi("WorkspaceList");

export const ProjectListEnvelope = z
  .object({
    items: z.array(ProjectResource),
    next_cursor: z.string().nullable(),
  })
  .openapi("ProjectList");

export const IssueListEnvelope = z
  .object({
    items: z.array(IssueResource),
    next_cursor: z.string().nullable(),
  })
  .openapi("IssueList");

export const CommentListEnvelope = z
  .object({
    items: z.array(CommentResource),
  })
  .openapi("CommentList");

export const LabelListEnvelope = z
  .object({
    items: z.array(LabelResource),
  })
  .openapi("LabelList");

export type WorkspaceDTO = z.infer<typeof WorkspaceResource>;
export type ProjectDTO = z.infer<typeof ProjectResource>;
export type IssueDTO = z.infer<typeof IssueResource>;
export type CommentDTO = z.infer<typeof CommentResource>;
export type LabelDTO = z.infer<typeof LabelResource>;
