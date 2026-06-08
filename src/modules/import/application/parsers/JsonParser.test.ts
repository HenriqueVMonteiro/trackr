import { describe, it, expect } from "vitest";
import { JsonParser } from "./JsonParser";

describe("JsonParser", () => {
  const parser = new JsonParser();

  it("parses a valid array of objects", () => {
    const raw = JSON.stringify([
      { title: "First", status: "open", assignee_email: "a@acme.com" },
      { title: "Second", priority: "low" },
    ]);

    const r = parser.parse(raw);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(r.value[0]?.title).toBe("First");
    expect(r.value[0]?.status).toBe("open");
    expect(r.value[0]?.assigneeEmail).toBe("a@acme.com");
    expect(r.value[1]?.title).toBe("Second");
    expect(r.value[1]?.priority).toBe("low");
  });

  it("coerces numbers and booleans to strings", () => {
    const raw = JSON.stringify([{ title: "Has numeric status", status: 1, priority: true }]);

    const r = parser.parse(raw);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.status).toBe("1");
    expect(r.value[0]?.priority).toBe("true");
  });

  it("rejects invalid JSON with a ValidationError", () => {
    const r = parser.parse("{ not valid");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("validation");
  });

  it("rejects a non-array JSON value", () => {
    const r = parser.parse(JSON.stringify({ title: "not an array" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("validation");
  });

  it("rejects empty input", () => {
    const r = parser.parse("   ");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("validation");
  });
});
