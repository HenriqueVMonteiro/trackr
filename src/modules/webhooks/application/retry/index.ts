import type { RetryPolicy } from "../../domain/RetryPolicy";
import type { RetryStrategy } from "./RetryStrategy";
import { ExponentialRetry } from "./ExponentialRetry";
import { LinearRetry } from "./LinearRetry";
import { FixedRetry } from "./FixedRetry";

export type { RetryStrategy } from "./RetryStrategy";
export { ExponentialRetry } from "./ExponentialRetry";
export { LinearRetry } from "./LinearRetry";
export { FixedRetry } from "./FixedRetry";

// GoF: Strategy + SOLID: OCP — mapeia o DADO (RetryPolicy do B2) para o
// COMPORTAMENTO (estratégia concreta). Adicionar uma política nova é um case novo
// aqui + uma classe; nenhum caller muda. O switch é exaustivo sobre a union.
export function retryStrategyFor(policy: RetryPolicy): RetryStrategy {
  switch (policy.type) {
    case "exponential":
      return new ExponentialRetry(policy.maxAttempts, policy.baseDelayMs, policy.factor);
    case "linear":
      return new LinearRetry(policy.maxAttempts, policy.stepMs);
    case "fixed":
      return new FixedRetry(policy.maxAttempts, policy.delayMs);
  }
}
