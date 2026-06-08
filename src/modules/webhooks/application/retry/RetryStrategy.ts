// GoF: Strategy — o algoritmo de backoff entre tentativas de entrega é escolhido
// em runtime conforme a RetryPolicy do endpoint. O worker (B3) depende só desta
// interface, nunca da política concreta.
// SOLID: OCP — uma política de retry nova é uma classe nova que implementa
// RetryStrategy; os callers (worker, scheduler) não mudam.
export interface RetryStrategy {
  // Delay (ms) a esperar ANTES da tentativa nº `attemptNumber` (1-based).
  nextDelayMs(attemptNumber: number): number;
  // Ainda vale tentar novamente após `attemptNumber` tentativas já feitas?
  shouldRetry(attemptNumber: number): boolean;
}
