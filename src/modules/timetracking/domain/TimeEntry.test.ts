import { describe, it, expect } from "vitest";
import { TimeEntry } from "./TimeEntry";

describe("TimeEntry", () => {
  const base = {
    id: "tme_0001",
    issueId: "iss_0001",
    userId: "00000000-0000-0000-0000-000000000001",
    createdAt: new Date("2026-06-07T12:00:00Z"),
  };

  it("creates a valid entry and computes durationSeconds from the interval", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:00:00Z"),
      description: "Pairing on the bug",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.durationSeconds).toBe(3600);
    expect(r.value.description).toBe("Pairing on the bug");
    expect(r.value.duration().format()).toBe("1h 0m");
  });

  it("rounds the computed durationSeconds to the nearest second", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T10:00:00.000Z"),
      endedAt: new Date("2026-06-07T10:00:01.499Z"),
      description: null,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.durationSeconds).toBe(1);
  });

  it("rejects endedAt equal to startedAt", () => {
    const at = new Date("2026-06-07T10:00:00Z");
    const r = TimeEntry.create({
      ...base,
      startedAt: at,
      endedAt: at,
      description: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects endedAt before startedAt", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T11:00:00Z"),
      endedAt: new Date("2026-06-07T10:00:00Z"),
      description: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects a description longer than 500 chars", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:00:00Z"),
      description: "x".repeat(501),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("normalizes an empty/blank description to null", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:00:00Z"),
      description: "   ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.description).toBeNull();
  });

  it("is immutable (frozen instance)", () => {
    const r = TimeEntry.create({
      ...base,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:00:00Z"),
      description: null,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
  });
});
