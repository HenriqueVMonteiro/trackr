import type { RetryStrategy } from "./RetryStrategy";

// GoF: Strategy (concreto) — delay fixo entre tentativas.
export class FixedRetry implements RetryStrategy {
  constructor(
    private readonly maxAttempts: number,
    private readonly delayMs: number,
  ) {}

  nextDelayMs(_attemptNumber: number): number {
    return this.delayMs;
  }

  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxAttempts;
  }
}
