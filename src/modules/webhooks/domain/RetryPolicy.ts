import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// GoF: Strategy (implementação em B3) — aqui RetryPolicy é só o DADO da política
// (qual algoritmo + parâmetros). A seleção do algoritmo de backoff em runtime
// (Exponential/Linear/Fixed calculando o próximo delay) entra no stint B3 como
// um Strategy concreto por endpoint. Manter como union discriminada agora deixa
// o B3 "adicionar comportamento sem mudar o dado" (OCP).

export type RetryPolicy =
  | { readonly type: "exponential"; readonly maxAttempts: number; readonly baseDelayMs: number; readonly factor: number }
  | { readonly type: "linear"; readonly maxAttempts: number; readonly stepMs: number }
  | { readonly type: "fixed"; readonly maxAttempts: number; readonly delayMs: number };

export type RetryPolicyType = RetryPolicy["type"];

const MAX_ATTEMPTS_CEILING = 10;

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function paramOr(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return isPositiveInt(v) ? v : fallback;
}

// Declaration merging: o `const RetryPolicy` é o "namespace de valor" com as
// factories, e o `type RetryPolicy` acima é o tipo. Permite RetryPolicy.exponential(5).
//
// As factories (exponential/linear/fixed) recebem DADO INTERNO confiável (com
// defaults sãos) e retornam o objeto direto — por isso a assinatura limpa pedida
// no HANDOFF. A validação de bounds vive em `fromPersistence`, que reconstitui
// DADO EXTERNO (linha do banco) e retorna Result.
export const RetryPolicy = {
  exponential(maxAttempts = 5, baseDelayMs = 1000, factor = 2): RetryPolicy {
    return { type: "exponential", maxAttempts, baseDelayMs, factor };
  },
  linear(maxAttempts = 5, stepMs = 1000): RetryPolicy {
    return { type: "linear", maxAttempts, stepMs };
  },
  fixed(maxAttempts = 5, delayMs = 1000): RetryPolicy {
    return { type: "fixed", maxAttempts, delayMs };
  },

  // Reconstitui de dado externo (linha do banco: retry_policy_type + jsonb params).
  fromPersistence(
    type: string,
    params: Record<string, unknown>,
  ): Result<RetryPolicy, ValidationError> {
    const maxAttempts = paramOr(params, "maxAttempts", 5);
    if (maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS_CEILING) {
      return err(
        new ValidationError(`maxAttempts must be between 1 and ${MAX_ATTEMPTS_CEILING}`, {
          field: "maxAttempts",
        }),
      );
    }
    switch (type) {
      case "exponential":
        return ok({
          type: "exponential",
          maxAttempts,
          baseDelayMs: paramOr(params, "baseDelayMs", 1000),
          factor: paramOr(params, "factor", 2),
        });
      case "linear":
        return ok({ type: "linear", maxAttempts, stepMs: paramOr(params, "stepMs", 1000) });
      case "fixed":
        return ok({ type: "fixed", maxAttempts, delayMs: paramOr(params, "delayMs", 1000) });
      default:
        return err(
          new ValidationError(`Unknown retry policy type '${type}'`, { field: "retryPolicyType" }),
        );
    }
  },

  // Desmembra para persistência: type + params (sem o discriminante).
  toPersistence(policy: RetryPolicy): { type: RetryPolicyType; params: Record<string, number> } {
    const { type, ...params } = policy;
    return { type, params };
  },
} as const;
