import { ok, err, type Result } from "@/shared/result";
import type { User, AuthError as SupabaseAuthError } from "@supabase/supabase-js";

import type {
  AuthError,
  AuthProvider,
  SignInCredentials,
  SignUpCredentials,
} from "../application/ports/AuthProvider";
import { UserContext } from "../domain/UserContext";
import {
  InvalidCredentialsError,
  EmailTakenError,
  WeakPasswordError,
} from "../domain/errors";
import { createServerSupabaseClient } from "./supabase/serverClient";

// ADR-0004 — Supabase Auth é o provedor de autenticação (vs NextAuth/Lucia).
// GoF: Adapter — adapta o SDK do Supabase Auth à port AuthProvider, de modo que
// a camada application nunca enxerga tipos do Supabase.
// SOLID: LSP — substituível por qualquer AuthProvider (ex: fake nos testes).
export class SupabaseAuthProvider implements AuthProvider {
  async signInWithPassword(
    credentials: SignInCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error || !data.user) {
      return err(new InvalidCredentialsError());
    }
    return this.toUserContext(data.user);
  }

  async signUp(
    credentials: SignUpCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: credentials.name ? { data: { name: credentials.name } } : undefined,
    });
    if (error) {
      return err(this.mapSignUpError(error, credentials.email));
    }
    if (!data.user) {
      // No error but no user: Supabase obfuscates signup for an existing account.
      return err(new EmailTakenError(credentials.email));
    }
    return this.toUserContext(data.user);
  }

  // Map Supabase's signup errors to the port's distinct domain errors instead of
  // lumping everything into "email taken".
  private mapSignUpError(error: SupabaseAuthError, email: string): AuthError {
    const code = error.code ?? "";
    const message = error.message.toLowerCase();
    if (code === "weak_password" || message.includes("password")) {
      return new WeakPasswordError(error.message);
    }
    if (
      code === "user_already_exists" ||
      message.includes("already registered") ||
      message.includes("already exists")
    ) {
      return new EmailTakenError(email);
    }
    return new InvalidCredentialsError();
  }

  async signOut(): Promise<void> {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<UserContext | null> {
    const supabase = await createServerSupabaseClient();
    // getUser() revalida o token com o Supabase Auth (ver ADR-0004). Nunca
    // getSession() em código server — confia no cookie (spoofável).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    const result = this.toUserContext(data.user);
    return result.ok ? result.value : null;
  }

  private toUserContext(user: User): Result<UserContext, AuthError> {
    const rawName = user.user_metadata?.["name"];
    const name = typeof rawName === "string" ? rawName : null;
    const result = UserContext.create({
      id: user.id,
      email: user.email ?? "",
      name,
    });
    // Um usuário válido do Supabase com payload malformado é tratado como falha
    // de autenticação (não vaza ValidationError de domínio para o caller).
    if (!result.ok) {
      return err(new InvalidCredentialsError());
    }
    return ok(result.value);
  }
}
