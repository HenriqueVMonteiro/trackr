import { ok, err, type Result } from "@/shared";
import { ValidationError } from "@/shared";
import { ImportRow } from "../../domain";
import type { Parser } from "./Parser";

// GoF: Strategy (concrete) — parser JSON. Espera um array de objetos; cada
// objeto vira um ImportRow. JSON.parse retorna `any`, então estreitamos com
// Array.isArray e checagens de typeof — sem `as unknown as`.

export class JsonParser implements Parser {
  readonly format = "json" as const;

  parse(raw: string): Result<ImportRow[], ValidationError> {
    if (raw.trim().length === 0) {
      return err(new ValidationError("JSON input is empty", { field: "raw" }));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return err(new ValidationError("JSON input is not valid JSON", { field: "raw" }));
    }

    if (!Array.isArray(parsed)) {
      return err(new ValidationError("JSON input must be an array of objects", { field: "raw" }));
    }

    const rows: ImportRow[] = [];
    for (const entry of parsed) {
      const record = this.toRecord(entry);
      if (!record.ok) return record;
      const row = ImportRow.fromRecord(record.value);
      if (!row.ok) return row;
      rows.push(row.value);
    }

    if (rows.length === 0) {
      return err(new ValidationError("JSON array has no rows", { field: "raw" }));
    }

    return ok(rows);
  }

  // Estreita um elemento desconhecido para Record<string, string | undefined>,
  // coletando apenas valores string (ou string-coercíveis number/boolean).
  private toRecord(
    entry: unknown,
  ): Result<Record<string, string | undefined>, ValidationError> {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return err(
        new ValidationError("Each JSON entry must be an object", { field: "raw" }),
      );
    }

    const record: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (value === null || value === undefined) {
        record[key] = undefined;
      } else if (typeof value === "string") {
        record[key] = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        record[key] = String(value);
      } else {
        return err(
          new ValidationError(`JSON field '${key}' must be a string, number or boolean`, {
            field: key,
          }),
        );
      }
    }
    return ok(record);
  }
}
