import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// SOLID: SRP — Email só conhece a invariante de um endereço de email válido.
// Value Object imutável, comparado por valor. Factory retorna Result (não throw).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export class Email {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  static create(raw: string): Result<Email, ValidationError> {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized.length === 0 ||
      normalized.length > MAX_EMAIL_LENGTH ||
      !EMAIL_PATTERN.test(normalized)
    ) {
      return err(new ValidationError("Invalid email address", { field: "email" }));
    }
    return ok(new Email(normalized));
  }

  // Reconstitui de uma fonte já validada (ex: sessão Supabase, persistência).
  static fromPersistence(value: string): Email {
    return new Email(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toJSON(): string {
    return this._value;
  }
}
