import { describe, it, expect } from "vitest";
import { FrozenClock, SystemClock } from "./clock";

describe("SystemClock", () => {
  it("returns a Date close to wall-clock now", () => {
    const clock = new SystemClock();
    const before = Date.now();
    const t = clock.now().getTime();
    const after = Date.now();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});

describe("FrozenClock", () => {
  it("returns the same instant by default", () => {
    const t = new Date("2026-06-07T10:00:00Z");
    const clock = new FrozenClock(t);
    expect(clock.now().toISOString()).toBe(t.toISOString());
    expect(clock.now().toISOString()).toBe(t.toISOString());
  });

  it("advances by the given milliseconds", () => {
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    clock.advance(60_000);
    expect(clock.now().toISOString()).toBe("2026-06-07T10:01:00.000Z");
  });

  it("set replaces the current instant", () => {
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    clock.set("2027-01-01T00:00:00Z");
    expect(clock.now().toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("returns defensive copies (mutation of returned Date does not affect clock)", () => {
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    const t = clock.now();
    t.setFullYear(2099);
    expect(clock.now().getFullYear()).toBe(2026);
  });
});
