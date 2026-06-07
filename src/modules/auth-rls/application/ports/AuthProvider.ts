import type { Result } from "@/shared/result";
import type { UserContext } from "../../domain/UserContext";
import type {
  InvalidCredentialsError,
  EmailTakenError,
  WeakPasswordError,
} from "../../domain/errors";

// SOLID: DIP — os use cases dependem desta port (abstração), nunca do Supabase.
// O adapter concreto (SupabaseAuthProvider) é injetado no bootstrap do módulo.
// SOLID: ISP — expõe apenas as operações de auth que a aplicação precisa.

export type AuthError =
  | InvalidCredentialsError
  | EmailTakenError
  | WeakPasswordError;

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SignUpCredentials {
  readonly email: string;
  readonly password: string;
  readonly name?: string;
}

export interface AuthProvider {
  signUp(credentials: SignUpCredentials): Promise<Result<UserContext, AuthError>>;
  signInWithPassword(
    credentials: SignInCredentials,
  ): Promise<Result<UserContext, AuthError>>;
  signOut(): Promise<void>;
  // null = sem sessão (não é erro de negócio, então não é Result).
  getCurrentUser(): Promise<UserContext | null>;
}
