import { ok, type Result, type Clock, type IdGenerator } from "@/shared";
import type { ValidationError } from "@/shared";
import { parserFor, type ParseFormat } from "../parsers";
import type { IssueTemplate } from "../templates/IssueTemplate";
import type { IssueCreator, CreateIssueInput } from "../ports/IssueCreator";

export interface ImportIssuesInput {
  projectId: string;
  format: ParseFormat;
  raw: string;
  template?: IssueTemplate;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export interface ImportIssuesDeps {
  issueCreator: IssueCreator;
  clock: Clock;
  ids: IdGenerator;
}

// SOLID: SRP — uma única razão para mudar: orquestrar a importação de issues.
// SOLID: DIP — depende de IssueCreator (port) e de Parser (Strategy), nunca do
// módulo issues nem de um formato concreto.
// GoF: Strategy — parserFor(format) seleciona o algoritmo de parsing.
export class ImportIssues {
  constructor(private readonly deps: ImportIssuesDeps) {}

  async execute(input: ImportIssuesInput): Promise<Result<ImportResult, ValidationError>> {
    const { issueCreator } = this.deps;

    const parsed = parserFor(input.format).parse(input.raw);
    if (!parsed.ok) return parsed;

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of parsed.value) {
      const normalized = input.template ? input.template.apply(row) : row;
      const createInput: CreateIssueInput = {
        projectId: input.projectId,
        title: normalized.title,
        description: normalized.description,
        status: normalized.status,
        priority: normalized.priority,
      };

      const result = await issueCreator.createIssue(createInput);
      if (result.ok) {
        created++;
      } else {
        failed++;
        errors.push(`${normalized.title}: ${result.error.message}`);
      }
    }

    return ok({ created, failed, errors });
  }
}
