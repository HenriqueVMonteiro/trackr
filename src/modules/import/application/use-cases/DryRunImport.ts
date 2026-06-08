import type { Result } from "@/shared";
import type { ValidationError } from "@/shared";
import { parserFor, type ParseFormat } from "../parsers";
import type { ImportRow } from "../../domain";

export interface DryRunImportInput {
  format: ParseFormat;
  raw: string;
}

// SOLID: SRP — apenas valida/parseia a entrada e devolve as linhas; nunca cria
// issues. Útil para preview antes de confirmar uma importação real.
// GoF: Strategy — reaproveita parserFor(format) como o ImportIssues.
export class DryRunImport {
  async execute(input: DryRunImportInput): Promise<Result<ImportRow[], ValidationError>> {
    return parserFor(input.format).parse(input.raw);
  }
}
