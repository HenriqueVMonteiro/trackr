import { describe, it, expect } from "vitest";

import {
  retryStrategyFor,
  ExponentialRetry,
  LinearRetry,
  FixedRetry,
} from "./index";
import { RetryPolicy } from "../../domain";

describe("retry strategies", () => {
  it("ExponentialRetry: base * factor^(n-1) and stops at maxAttempts", () => {
    const s = new ExponentialRetry(5, 1000, 2);
    expect(s.nextDelayMs(1)).toBe(1000);
    expect(s.nextDelayMs(2)).toBe(2000);
    expect(s.nextDelayMs(3)).toBe(4000);
    expect(s.shouldRetry(4)).toBe(true);
    expect(s.shouldRetry(5)).toBe(false);
  });

  it("LinearRetry: step * n", () => {
    const s = new LinearRetry(3, 500);
    expect(s.nextDelayMs(1)).toBe(500);
    expect(s.nextDelayMs(2)).toBe(1000);
    expect(s.shouldRetry(2)).toBe(true);
    expect(s.shouldRetry(3)).toBe(false);
  });

  it("FixedRetry: constant delay", () => {
    const s = new FixedRetry(2, 250);
    expect(s.nextDelayMs(1)).toBe(250);
    expect(s.nextDelayMs(9)).toBe(250);
    expect(s.shouldRetry(1)).toBe(true);
    expect(s.shouldRetry(2)).toBe(false);
  });

  it("retryStrategyFor maps each RetryPolicy variant to its concrete strategy", () => {
    expect(retryStrategyFor(RetryPolicy.exponential())).toBeInstanceOf(ExponentialRetry);
    expect(retryStrategyFor(RetryPolicy.linear())).toBeInstanceOf(LinearRetry);
    expect(retryStrategyFor(RetryPolicy.fixed())).toBeInstanceOf(FixedRetry);
  });
});
