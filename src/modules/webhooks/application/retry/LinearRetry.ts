import type { RetryStrategy } from "./RetryStrategy";

// GoF: Strategy (concreto) — backoff linear: step * n.
export class LinearRetry implements RetryStrategy {
  constructor(
    private readonly maxAttempts: number,
    private readonly stepMs: number,
  ) {}

  nextDelayMs(attemptNumber: number): number {
    return this.stepMs * Math.max(1, attemptNumber);
  }

  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxAttempts;
  }
}
