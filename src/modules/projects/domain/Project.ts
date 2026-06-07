import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

export interface ProjectProps {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly key: string;
  readonly description: string | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const NAME_RE = /^.{2,100}$/;
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const KEY_RE = /^[A-Z][A-Z0-9]{1,9}$/;

export class Project {
  private constructor(private readonly props: ProjectProps) {
    Object.freeze(this);
  }

  static create(props: ProjectProps): Result<Project, ValidationError> {
    const name = props.name.trim();
    if (!NAME_RE.test(name)) {
      return err(new ValidationError("Project name must be 2-100 chars", { field: "name" }));
    }
    if (!SLUG_RE.test(props.slug)) {
      return err(
        new ValidationError("Project slug must be lowercase kebab-case (2-31 chars)", {
          field: "slug",
        }),
      );
    }
    if (!KEY_RE.test(props.key)) {
      return err(
        new ValidationError("Project key must be UPPERCASE alphanumeric (2-10 chars)", {
          field: "key",
        }),
      );
    }
    return ok(new Project({ ...props, name }));
  }

  static fromPersistence(props: ProjectProps): Project {
    return new Project(props);
  }

  archive(at: Date): Project {
    if (this.props.archivedAt) return this;
    return new Project({ ...this.props, archivedAt: at, updatedAt: at });
  }

  rename(name: string, at: Date): Result<Project, ValidationError> {
    const trimmed = name.trim();
    if (!NAME_RE.test(trimmed)) {
      return err(new ValidationError("Project name must be 2-100 chars", { field: "name" }));
    }
    if (trimmed === this.props.name) return ok(this);
    return ok(new Project({ ...this.props, name: trimmed, updatedAt: at }));
  }

  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get key(): string {
    return this.props.key;
  }
  get description(): string | null {
    return this.props.description;
  }
  get archivedAt(): Date | null {
    return this.props.archivedAt ? new Date(this.props.archivedAt) : null;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  toJSON(): ProjectProps {
    return { ...this.props };
  }
}
