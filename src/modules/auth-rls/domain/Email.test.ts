import { describe, it, expect } from "vitest";

import { Email } from "./Email";

describe("Email", () => {
  it("accepts and normalizes a valid address (trim + lowercase)", () => {
    const r = Email.create("  User@Example.COM ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe("user@example.com");
  });

  it("rejects malformed addresses with a ValidationError", () => {
    const invalid = ["", "   ", "no-at", "a@b", "a@b.", "@b.com", "a @b.com"];
    for (const raw of invalid) {
      const r = Email.create(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("validation");
    }
  });

  it("rejects addresses longer than 254 chars", () => {
    const r = Email.create(`${"a".repeat(250)}@b.com`);
    expect(r.ok).toBe(false);
  });

  it("compares by value after normalization", () => {
    const a = Email.create("x@y.com");
    const b = Email.create("X@Y.COM");
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
