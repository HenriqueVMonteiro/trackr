import type { Result } from "@/shared";
import type { ValidationError } from "@/shared";
import type { ImportRow } from "../../domain";

// GoF: Strategy — Parser é a abstração; CsvParser e JsonParser são estratégias
// concretas intercambiáveis. O use case escolhe a estratégia via parserFor(format)
// sem conhecer o algoritmo concreto.
// SOLID: OCP — adicionar um novo formato é criar um novo Parser, sem tocar no
// use case que o consome.

export type ParseFormat = "csv" | "json";

export interface Parser {
  readonly format: ParseFormat;
  parse(raw: string): Result<ImportRow[], ValidationError>;
}
