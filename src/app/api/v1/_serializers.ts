import type { Workspace } from "@/modules/workspaces";
import type { Project } from "@/modules/projects";
import type { Issue } from "@/modules/issues";
import type { Comment } from "@/modules/comments";
import type { Label } from "@/modules/labels";
import type {
  WorkspaceDTO,
  ProjectDTO,
  IssueDTO,
  CommentDTO,
  LabelDTO,
} from "./_schemas";

// Entity -> wire DTO. Keeps Date serialization (ISO 8601 strings) in one place.

export function serializeWorkspace(w: Workspace): WorkspaceDTO {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    ownerId: w.ownerId,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export function serializeProject(p: Project): ProjectDTO {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    slug: p.slug,
    key: p.key,
    description: p.description,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeIssue(i: Issue): IssueDTO {
  return {
    id: i.id,
    projectId: i.projectId,
    number: i.number,
    title: i.title,
    description: i.description,
    status: i.status,
    priority: i.priority,
    assigneeId: i.assigneeId,
    approverId: i.approverId,
    parentId: i.parentId,
    createdBy: i.createdBy,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    closedAt: i.closedAt?.toISOString() ?? null,
    canceledAt: i.canceledAt?.toISOString() ?? null,
  };
}

export function serializeComment(c: Comment): CommentDTO {
  return {
    id: c.id,
    issueId: c.issueId,
    authorId: c.authorId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeLabel(l: Label): LabelDTO {
  return {
    id: l.id,
    projectId: l.projectId,
    name: l.name,
    color: l.color,
    createdAt: l.createdAt.toISOString(),
  };
}
