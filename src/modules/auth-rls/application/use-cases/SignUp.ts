import { err, type Result } from "@/shared/result";
import type { ValidationError } from "@/shared/errors";
import { Email } from "../../domain/Email";
import { WeakPasswordError } from "../../domain/errors";
import type { UserContext } from "../../domain/UserContext";
import type { AuthError, AuthProvider } from "../ports/AuthProvider";

export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
}

export type SignUpError = ValidationError | AuthError;

const MIN_PASSWORD_LENGTH = 8;

// SOLID: SRP — só a regra de cadastro. SOLID: DIP — depende da port AuthProvider.
export class SignUp {
  constructor(private readonly auth: AuthProvider) {}

  async execute(input: SignUpInput): Promise<Result<UserContext, SignUpError>> {
    const email = Email.create(input.email);
    if (!email.ok) return email;

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return err(
        new WeakPasswordError(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        ),
      );
    }

    return this.auth.signUp({
      email: email.value.value,
      password: input.password,
      ...(input.name ? { name: input.name } : {}),
    });
  }
}
