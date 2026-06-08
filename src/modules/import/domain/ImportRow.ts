import { ok, err, type Result } from "@/shared";
import { ValidationError } from "@/shared";

// SOLID: SRP — ImportRow é um Value Object: conhece apenas as invariantes de
// uma linha importada (título obrigatório; demais campos opcionais). Parsing
// de formato (CSV/JSON) mora nos Parsers; criação de issue, no use case.

export interface ImportRowProps {
  readonly title: string;
  readonly description: string | null;
  readonly status: string | null;
  readonly priority: string | null;
  readonly assigneeEmail: string | null;
}

export class ImportRow {
  private constructor(private readonly props: ImportRowProps) {
    Object.freeze(this);
  }

  // Factory com validação para registros vindos de um parser (CSV/JSON).
  static fromRecord(
    record: Record<string, string | undefined>,
  ): Result<ImportRow, ValidationError> {
    const title = (record.title ?? "").trim();
    if (title.length === 0) {
      return err(new ValidationError("Import row requires a non-empty title", { field: "title" }));
    }
    return ok(
      new ImportRow({
        title,
        description: ImportRow.optional(record.description),
        status: ImportRow.optional(record.status),
        priority: ImportRow.optional(record.priority),
        assigneeEmail: ImportRow.optional(record.assignee_email),
      }),
    );
  }

  private static optional(value: string | undefined): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  get title(): string {
    return this.props.title;
  }
  get description(): string | null {
    return this.props.description;
  }
  get status(): string | null {
    return this.props.status;
  }
  get priority(): string | null {
    return this.props.priority;
  }
  get assigneeEmail(): string | null {
    return this.props.assigneeEmail;
  }

  toJSON(): ImportRowProps {
    return { ...this.props };
  }
}
