import { describe, it, expect } from "vitest";

import { RetryPolicy } from "./RetryPolicy";

describe("RetryPolicy", () => {
  it("builds exponential/linear/fixed via factories with defaults", () => {
    expect(RetryPolicy.exponential()).toEqual({
      type: "exponential",
      maxAttempts: 5,
      baseDelayMs: 1000,
      factor: 2,
    });
    expect(RetryPolicy.linear(3, 500)).toEqual({ type: "linear", maxAttempts: 3, stepMs: 500 });
    expect(RetryPolicy.fixed(2, 250)).toEqual({ type: "fixed", maxAttempts: 2, delayMs: 250 });
  });

  it("round-trips through toPersistence / fromPersistence", () => {
    const policy = RetryPolicy.exponential(5, 2000, 3);
    const { type, params } = RetryPolicy.toPersistence(policy);
    expect(type).toBe("exponential");
    expect(params).toEqual({ maxAttempts: 5, baseDelayMs: 2000, factor: 3 });
    const back = RetryPolicy.fromPersistence(type, params);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.value).toEqual(policy);
  });

  it("rejects an unknown policy type", () => {
    const r = RetryPolicy.fromPersistence("quantum", { maxAttempts: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects maxAttempts out of range", () => {
    const r = RetryPolicy.fromPersistence("fixed", { maxAttempts: 99 });
    expect(r.ok).toBe(false);
  });

  it("falls back to defaults for missing/invalid params", () => {
    const r = RetryPolicy.fromPersistence("linear", {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ type: "linear", maxAttempts: 5, stepMs: 1000 });
  });
});
