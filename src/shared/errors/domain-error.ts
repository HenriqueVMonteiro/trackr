// SOLID: SRP — DomainError representa erros previsíveis de regra de negócio.
// Não estende Error nativo de propósito: queremos exigir uso através de
// Result<T, DomainError> em vez de throw, e permitir serialização limpa.

export abstract class DomainError {
  abstract readonly code: string;

  constructor(
    public readonly message: string,
    public readonly meta?: Readonly<Record<string, unknown>>,
  ) {}

  toJSON(): { code: string; message: string; meta?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      ...(this.meta ? { meta: { ...this.meta } } : {}),
    };
  }
}
