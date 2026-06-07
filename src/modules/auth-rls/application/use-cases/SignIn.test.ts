import { describe, it, expect } from "vitest";

import { ok, err, type Result } from "@/shared/result";
import { SignIn } from "./SignIn";
import { UserContext } from "../../domain/UserContext";
import { InvalidCredentialsError } from "../../domain/errors";
import type {
  AuthError,
  AuthProvider,
  SignInCredentials,
  SignUpCredentials,
} from "../ports/AuthProvider";

const VALID_ID = "9f9e6df0-0000-4000-8000-000000000000";

// LSP: a fake AuthProvider is substitutable for the real Supabase one.
class FakeAuthProvider implements AuthProvider {
  constructor(private readonly accept: boolean) {}

  async signInWithPassword(
    credentials: SignInCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    if (!this.accept) return err(new InvalidCredentialsError());
    return this.build(credentials.email);
  }
  async signUp(
    credentials: SignUpCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    return this.build(credentials.email);
  }
  private build(email: string): Result<UserContext, AuthError> {
    const ctx = UserContext.create({ id: VALID_ID, email });
    return ctx.ok ? ok(ctx.value) : err(new InvalidCredentialsError());
  }
  async signOut(): Promise<void> {}
  async getCurrentUser(): Promise<UserContext | null> {
    return null;
  }
}

describe("SignIn", () => {
  it("rejects an invalid email with ValidationError before hitting the provider", async () => {
    const useCase = new SignIn(new FakeAuthProvider(true));
    const r = await useCase.execute({ email: "not-an-email", password: "secret123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("returns the UserContext on valid credentials", async () => {
    const useCase = new SignIn(new FakeAuthProvider(true));
    const r = await useCase.execute({ email: "User@Example.com", password: "secret123" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email.value).toBe("user@example.com");
  });

  it("surfaces InvalidCredentialsError from the provider", async () => {
    const useCase = new SignIn(new FakeAuthProvider(false));
    const r = await useCase.execute({ email: "user@example.com", password: "wrong" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_credentials");
  });

  it("normalizes the email passed to the provider", async () => {
    // The provider echoes the email into the UserContext; assert it was normalized.
    const useCase = new SignIn(new FakeAuthProvider(true));
    const r: Result<UserContext, unknown> = await useCase.execute({
      email: "  MixedCase@Example.COM ",
      password: "secret123",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email.value).toBe("mixedcase@example.com");
  });
});
