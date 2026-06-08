import type { RetryStrategy } from "./RetryStrategy";

// GoF: Strategy (concreto) — backoff exponencial: base * factor^(n-1).
export class ExponentialRetry implements RetryStrategy {
  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly factor: number,
  ) {}

  nextDelayMs(attemptNumber: number): number {
    const exp = Math.max(0, attemptNumber - 1);
    return Math.round(this.baseDelayMs * Math.pow(this.factor, exp));
  }

  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxAttempts;
  }
}
