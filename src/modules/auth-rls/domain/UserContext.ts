import { ok, type Result } from "@/shared/result";
import type { ValidationError } from "@/shared/errors";
import { Email } from "./Email";
import { UserId } from "./UserId";

// SOLID: SRP — UserContext é o Value Object do principal autenticado: QUEM é a
// requisição atual (id + email + nome), independente de COMO autenticou. Domínio
// puro — zero import de Next/Supabase/Drizzle. É o que `getCurrentUser()` retorna.

export interface UserContextProps {
  readonly id: string;
  readonly email: string;
  readonly name?: string | null;
}

export class UserContext {
  private constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private readonly _name: string | null,
  ) {
    Object.freeze(this);
  }

  static create(props: UserContextProps): Result<UserContext, ValidationError> {
    const id = UserId.create(props.id);
    if (!id.ok) return id;
    const email = Email.create(props.email);
    if (!email.ok) return email;
    const trimmedName = props.name?.trim();
    const name = trimmedName && trimmedName.length > 0 ? trimmedName : null;
    return ok(new UserContext(id.value, email.value, name));
  }

  get id(): UserId {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get name(): string | null {
    return this._name;
  }

  toJSON(): { id: string; email: string; name: string | null } {
    return { id: this._id.value, email: this._email.value, name: this._name };
  }
}
