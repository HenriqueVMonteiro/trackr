import { type Result } from "@/shared/result";
import type { ValidationError } from "@/shared/errors";
import { Email } from "../../domain/Email";
import type { UserContext } from "../../domain/UserContext";
import type { AuthError, AuthProvider } from "../ports/AuthProvider";

export interface SignInInput {
  email: string;
  password: string;
}

export type SignInError = ValidationError | AuthError;

// SOLID: SRP — uma única razão para mudar: regra de autenticação por senha.
// SOLID: DIP — depende da port AuthProvider, não do adapter concreto.
export class SignIn {
  constructor(private readonly auth: AuthProvider) {}

  async execute(input: SignInInput): Promise<Result<UserContext, SignInError>> {
    // Valida o formato do email no domínio antes de bater no provider.
    const email = Email.create(input.email);
    if (!email.ok) return email;

    return this.auth.signInWithPassword({
      email: email.value.value,
      password: input.password,
    });
  }
}
