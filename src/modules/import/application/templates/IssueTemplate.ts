import type { ImportRow } from "../../domain";

// SOLID: SRP — IssueTemplate carrega defaults reutilizáveis e sabe aplicá-los a
// uma ImportRow, preenchendo apenas os campos ausentes (null). Não cria issues.

export interface IssueTemplateDefaults {
  status?: string;
  priority?: string;
  description?: string;
}

export interface NormalizedRow {
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigneeEmail: string | null;
}

export class IssueTemplate {
  constructor(
    readonly name: string,
    readonly defaults: IssueTemplateDefaults = {},
  ) {}

  // Preenche campos ausentes da linha a partir dos defaults do template.
  apply(row: ImportRow): NormalizedRow {
    return {
      title: row.title,
      description: row.description ?? this.defaults.description ?? null,
      status: row.status ?? this.defaults.status ?? null,
      priority: row.priority ?? this.defaults.priority ?? null,
      assigneeEmail: row.assigneeEmail,
    };
  }
}
