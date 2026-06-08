import { describe, it, expect } from "vitest";
import { CsvParser } from "./CsvParser";

describe("CsvParser", () => {
  const parser = new CsvParser();

  it("parses a header row and maps columns by name", () => {
    const raw = [
      "title,description,status,priority,assignee_email",
      "Fix bug,Null pointer,open,high,dev@acme.com",
    ].join("\n");

    const r = parser.parse(raw);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    const row = r.value[0];
    expect(row?.title).toBe("Fix bug");
    expect(row?.description).toBe("Null pointer");
    expect(row?.status).toBe("open");
    expect(row?.priority).toBe("high");
    expect(row?.assigneeEmail).toBe("dev@acme.com");
  });

  it("supports double-quoted fields containing commas", () => {
    const raw = ['title,description', '"Migrate, then deploy","Step 1, step 2, done"'].join(
      "\n",
    );

    const r = parser.parse(raw);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = r.value[0];
    expect(row?.title).toBe("Migrate, then deploy");
    expect(row?.description).toBe("Step 1, step 2, done");
  });

  it("leaves optional fields null when absent", () => {
    const raw = ["title", "Only a title"].join("\n");

    const r = parser.parse(raw);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = r.value[0];
    expect(row?.title).toBe("Only a title");
    expect(row?.status).toBeNull();
    expect(row?.priority).toBeNull();
  });

  it("rejects empty / whitespace-only input with a ValidationError", () => {
    const r = parser.parse("   \n  ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("validation");
  });
});
