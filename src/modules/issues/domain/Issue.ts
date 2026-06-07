import { ok, err, type Result } from "@/shared/result";
import { ValidationError, type InvalidTransitionError } from "@/shared/errors";
import type { IssueStatus } from "./IssueStatus";
import type { IssuePriority } from "./IssuePriority";
import { IssueStateMachine } from "./state/IssueStateMachine";

export interface IssueProps {
  readonly id: string;
  readonly projectId: string;
  readonly number: number;
  readonly title: string;
  readonly description: string | null;
  readonly status: IssueStatus;
  readonly priority: IssuePriority;
  readonly assigneeId: string | null;
  readonly approverId: string | null;
  readonly parentId: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly closedAt: Date | null;
  readonly canceledAt: Date | null;
}

const TITLE_MIN = 1;
const TITLE_MAX = 200;

// SOLID: SRP — Issue conhece suas invariantes e suas transições de estado.
// Persistência (DrizzleIssueRepository), autorização (use case) e eventos
// (use case) ficam em outras camadas.
export class Issue {
  private constructor(private readonly props: IssueProps) {
    Object.freeze(this);
  }

  static create(props: IssueProps): Result<Issue, ValidationError> {
    const title = props.title.trim();
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return err(
        new ValidationError(`Issue title must be ${TITLE_MIN}-${TITLE_MAX} chars`, {
          field: "title",
        }),
      );
    }
    if (props.number < 1) {
      return err(new ValidationError("Issue number must be >= 1", { field: "number" }));
    }
    return ok(new Issue({ ...props, title }));
  }

  static fromPersistence(props: IssueProps): Issue {
    return new Issue(props);
  }

  // GoF: State — delega regra de transição ao IssueStateMachine que escolhe
  // o IssueState concreto e aplica a regra polimórfica.
  transitionTo(next: IssueStatus, at: Date): Result<Issue, InvalidTransitionError> {
    const result = IssueStateMachine.transition(this.props.status, next, {
      approverId: this.props.approverId,
    });
    if (!result.ok) return result;

    const base: IssueProps = { ...this.props, status: next, updatedAt: at };
    let closedAt = this.props.closedAt;
    let canceledAt = this.props.canceledAt;
    if (next === "done") closedAt = at;
    if (next === "canceled") canceledAt = at;
    if (this.props.status === "done" && next === "todo") closedAt = null;
    if (this.props.status === "canceled" && next === "todo") canceledAt = null;

    return ok(new Issue({ ...base, closedAt, canceledAt }));
  }

  assign(assigneeId: string | null, at: Date): Issue {
    if (assigneeId === this.props.assigneeId) return this;
    return new Issue({ ...this.props, assigneeId, updatedAt: at });
  }

  setApprover(approverId: string | null, at: Date): Issue {
    if (approverId === this.props.approverId) return this;
    return new Issue({ ...this.props, approverId, updatedAt: at });
  }

  setPriority(priority: IssuePriority, at: Date): Issue {
    if (priority === this.props.priority) return this;
    return new Issue({ ...this.props, priority, updatedAt: at });
  }

  edit(
    fields: { title?: string; description?: string | null },
    at: Date,
  ): Result<Issue, ValidationError> {
    let title = this.props.title;
    if (fields.title !== undefined) {
      const trimmed = fields.title.trim();
      if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) {
        return err(
          new ValidationError(`Issue title must be ${TITLE_MIN}-${TITLE_MAX} chars`, {
            field: "title",
          }),
        );
      }
      title = trimmed;
    }
    const description = fields.description !== undefined ? fields.description : this.props.description;
    if (title === this.props.title && description === this.props.description) {
      return ok(this);
    }
    return ok(new Issue({ ...this.props, title, description, updatedAt: at }));
  }

  get id(): string {
    return this.props.id;
  }
  get projectId(): string {
    return this.props.projectId;
  }
  get number(): number {
    return this.props.number;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string | null {
    return this.props.description;
  }
  get status(): IssueStatus {
    return this.props.status;
  }
  get priority(): IssuePriority {
    return this.props.priority;
  }
  get assigneeId(): string | null {
    return this.props.assigneeId;
  }
  get approverId(): string | null {
    return this.props.approverId;
  }
  get parentId(): string | null {
    return this.props.parentId;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }
  get closedAt(): Date | null {
    return this.props.closedAt ? new Date(this.props.closedAt) : null;
  }
  get canceledAt(): Date | null {
    return this.props.canceledAt ? new Date(this.props.canceledAt) : null;
  }

  toJSON(): IssueProps {
    return { ...this.props };
  }
}
