import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// SOLID: SRP — Workspace só conhece suas próprias invariantes (nome, slug,
// owner). Persistência mora no repo; orquestração, no use case.

export interface WorkspaceProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const NAME_MIN = 2;
const NAME_MAX = 50;
const SLUG_REGEX = /^[a-z][a-z0-9-]{1,30}$/;

export class Workspace {
  private constructor(private readonly props: WorkspaceProps) {
    Object.freeze(this);
  }

  // Factory com validação para entradas vindas do mundo externo (use cases).
  static create(props: WorkspaceProps): Result<Workspace, ValidationError> {
    const name = props.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return err(
        new ValidationError(`Workspace name must be ${NAME_MIN}-${NAME_MAX} chars`, {
          field: "name",
        }),
      );
    }
    if (!SLUG_REGEX.test(props.slug)) {
      return err(
        new ValidationError("Workspace slug must be lowercase kebab-case (2-31 chars)", {
          field: "slug",
        }),
      );
    }
    return ok(new Workspace({ ...props, name }));
  }

  // Reconstitui de persistência (já validado quando foi salvo).
  static fromPersistence(props: WorkspaceProps): Workspace {
    return new Workspace(props);
  }

  // Operação de domínio — retorna nova instância (imutabilidade).
  rename(newName: string, at: Date): Result<Workspace, ValidationError> {
    const trimmed = newName.trim();
    if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
      return err(
        new ValidationError(`Workspace name must be ${NAME_MIN}-${NAME_MAX} chars`, {
          field: "name",
        }),
      );
    }
    if (trimmed === this.props.name) return ok(this);
    return ok(new Workspace({ ...this.props, name: trimmed, updatedAt: at }));
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  toJSON(): WorkspaceProps {
    return { ...this.props };
  }
}
