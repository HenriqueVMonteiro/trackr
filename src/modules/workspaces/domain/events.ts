import type { DomainEvent } from "@/shared/events";
import type { WorkspaceRole } from "./WorkspaceMember";

export const WORKSPACE_CREATED = "workspace.created" as const;
export const WORKSPACE_RENAMED = "workspace.renamed" as const;
export const WORKSPACE_MEMBER_INVITED = "workspace.member_invited" as const;
export const WORKSPACE_MEMBER_REMOVED = "workspace.member_removed" as const;

export interface WorkspaceCreatedPayload {
  workspaceId: string;
  ownerId: string;
  name: string;
  slug: string;
}

export interface WorkspaceRenamedPayload {
  workspaceId: string;
  actorId: string;
  oldName: string;
  newName: string;
}

export interface MemberInvitedPayload {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy: string;
}

export interface MemberRemovedPayload {
  workspaceId: string;
  userId: string;
  removedBy: string;
}

export type WorkspaceCreatedEvent = DomainEvent<WorkspaceCreatedPayload>;
export type WorkspaceRenamedEvent = DomainEvent<WorkspaceRenamedPayload>;
export type MemberInvitedEvent = DomainEvent<MemberInvitedPayload>;
export type MemberRemovedEvent = DomainEvent<MemberRemovedPayload>;
