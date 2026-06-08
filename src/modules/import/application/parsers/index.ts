import { CsvParser } from "./CsvParser";
import { JsonParser } from "./JsonParser";
import type { Parser, ParseFormat } from "./Parser";

export type { Parser, ParseFormat } from "./Parser";
export { CsvParser } from "./CsvParser";
export { JsonParser } from "./JsonParser";

// GoF: Strategy — fábrica que seleciona a estratégia concreta pelo formato.
// Switch exaustivo: TypeScript garante (via never) que todo ParseFormat é tratado.
export function parserFor(format: ParseFormat): Parser {
  switch (format) {
    case "csv":
      return new CsvParser();
    case "json":
      return new JsonParser();
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}
