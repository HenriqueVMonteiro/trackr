import { ok, err, type Result } from "@/shared";
import { ValidationError } from "@/shared";
import { ImportRow } from "../../domain";
import type { Parser } from "./Parser";

// GoF: Strategy (concrete) — parser CSV escrito à mão (sem dependência externa).
// Suporta cabeçalho, campos separados por vírgula e campos entre aspas duplas
// que contêm vírgulas (e aspas escapadas como "").

export class CsvParser implements Parser {
  readonly format = "csv" as const;

  parse(raw: string): Result<ImportRow[], ValidationError> {
    if (raw.trim().length === 0) {
      return err(new ValidationError("CSV input is empty", { field: "raw" }));
    }

    const lines = this.splitLines(raw);
    if (lines.length === 0) {
      return err(new ValidationError("CSV has no content", { field: "raw" }));
    }

    const headerLine = lines[0];
    if (headerLine === undefined) {
      return err(new ValidationError("CSV is missing a header row", { field: "raw" }));
    }
    const headers = this.parseLine(headerLine).map((h) => h.trim());

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined || line.trim().length === 0) continue;

      const cells = this.parseLine(line);
      const record: Record<string, string | undefined> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (key === undefined || key.length === 0) continue;
        record[key] = cells[c];
      }

      const row = ImportRow.fromRecord(record);
      if (!row.ok) return row;
      rows.push(row.value);
    }

    if (rows.length === 0) {
      return err(new ValidationError("CSV has no data rows", { field: "raw" }));
    }

    return ok(rows);
  }

  // Quebra em linhas físicas, normalizando CRLF/CR e removendo uma BOM inicial.
  private splitLines(raw: string): string[] {
    const normalized = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    return normalized.split("\n");
  }

  // Parser de uma linha CSV com suporte a aspas duplas e "" como aspa escapada.
  private parseLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  }
}
