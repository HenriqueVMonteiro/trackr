import { describe, it, expect } from "vitest";
import { Duration } from "./Duration";

describe("Duration", () => {
  it("creates from a valid non-negative integer of seconds", () => {
    const r = Duration.fromSeconds(3661);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.seconds).toBe(3661);
    expect(r.value.minutes).toBeCloseTo(61.0167, 3);
    expect(r.value.hours).toBeCloseTo(1.0169, 3);
  });

  it("allows zero seconds", () => {
    const r = Duration.fromSeconds(0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.seconds).toBe(0);
  });

  it("rejects negative seconds with ValidationError", () => {
    const r = Duration.fromSeconds(-1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects non-integer seconds with ValidationError", () => {
    const r = Duration.fromSeconds(1.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects non-finite seconds with ValidationError", () => {
    const r = Duration.fromSeconds(Number.POSITIVE_INFINITY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("formats as 'Hh Mm'", () => {
    const r = Duration.fromSeconds(3661);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.format()).toBe("1h 1m");
  });

  it("formats zero as '0h 0m'", () => {
    expect(Duration.zero().format()).toBe("0h 0m");
  });

  it("formats sub-minute durations as '0h 0m'", () => {
    const r = Duration.fromSeconds(59);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.format()).toBe("0h 0m");
  });

  it("compares equality by seconds", () => {
    const a = Duration.fromSeconds(120);
    const b = Duration.fromSeconds(120);
    const c = Duration.fromSeconds(121);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(a.value.equals(b.value)).toBe(true);
    expect(a.value.equals(c.value)).toBe(false);
  });
});
