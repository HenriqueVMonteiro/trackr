import { DomainError } from "@/shared/errors";

// Erros de domínio específicos de autenticação. Estendem o DomainError base do
// `src/shared/` e são carregados via Result<T, DomainError> (nunca throw).

export class InvalidCredentialsError extends DomainError {
  readonly code = "invalid_credentials";
  constructor() {
    // Mensagem genérica de propósito: não revelar se o email existe (segurança).
    super("Invalid email or password");
  }
}

export class EmailTakenError extends DomainError {
  readonly code = "email_taken";
  constructor(email: string) {
    super(`Email '${email}' is already registered`, { email });
  }
}

export class WeakPasswordError extends DomainError {
  readonly code = "weak_password";
  constructor(message = "Password is too weak") {
    super(message);
  }
}
