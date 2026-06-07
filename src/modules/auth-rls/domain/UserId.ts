import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

// SOLID: SRP — UserId é um Value Object que envolve o identificador do usuário
// autenticado (UUID de auth.users.id no Supabase). Tipar em vez de usar string
// crua evita confundir com outros ids e centraliza a invariante não-vazio.

export class UserId {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  static create(raw: string): Result<UserId, ValidationError> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return err(new ValidationError("User id must not be empty", { field: "id" }));
    }
    return ok(new UserId(trimmed));
  }

  static fromPersistence(value: string): UserId {
    return new UserId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toJSON(): string {
    return this._value;
  }
}
