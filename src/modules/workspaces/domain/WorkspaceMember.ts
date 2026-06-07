export type WorkspaceRole = "owner" | "member";

export interface WorkspaceMemberProps {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly joinedAt: Date;
}

export class WorkspaceMember {
  private constructor(private readonly props: WorkspaceMemberProps) {
    Object.freeze(this);
  }

  static create(props: WorkspaceMemberProps): WorkspaceMember {
    return new WorkspaceMember(props);
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get role(): WorkspaceRole {
    return this.props.role;
  }
  get joinedAt(): Date {
    return new Date(this.props.joinedAt);
  }

  isOwner(): boolean {
    return this.props.role === "owner";
  }

  toJSON(): WorkspaceMemberProps {
    return { ...this.props };
  }
}
