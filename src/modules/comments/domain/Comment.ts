import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

export interface CommentProps {
  readonly id: string;
  readonly issueId: string;
  readonly authorId: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const BODY_MIN = 1;
const BODY_MAX = 10000;

export class Comment {
  private constructor(private readonly props: CommentProps) {
    Object.freeze(this);
  }

  static create(props: CommentProps): Result<Comment, ValidationError> {
    const body = props.body.trim();
    if (body.length < BODY_MIN || body.length > BODY_MAX) {
      return err(
        new ValidationError(`Comment body must be ${BODY_MIN}-${BODY_MAX} chars`, {
          field: "body",
        }),
      );
    }
    return ok(new Comment({ ...props, body }));
  }

  static fromPersistence(props: CommentProps): Comment {
    return new Comment(props);
  }

  edit(newBody: string, at: Date): Result<Comment, ValidationError> {
    const body = newBody.trim();
    if (body.length < BODY_MIN || body.length > BODY_MAX) {
      return err(
        new ValidationError(`Comment body must be ${BODY_MIN}-${BODY_MAX} chars`, {
          field: "body",
        }),
      );
    }
    if (body === this.props.body) return ok(this);
    return ok(new Comment({ ...this.props, body, updatedAt: at }));
  }

  // Authz helper exposed on the entity so use cases stay simple.
  canBeEditedBy(userId: string): boolean {
    return this.props.authorId === userId;
  }

  get id(): string {
    return this.props.id;
  }
  get issueId(): string {
    return this.props.issueId;
  }
  get authorId(): string {
    return this.props.authorId;
  }
  get body(): string {
    return this.props.body;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  toJSON(): CommentProps {
    return { ...this.props };
  }
}
