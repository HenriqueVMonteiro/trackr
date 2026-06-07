import { describe, it, expect } from "vitest";

import { ok, err, type Result } from "@/shared/result";
import { SignUp } from "./SignUp";
import { UserContext } from "../../domain/UserContext";
import { EmailTakenError } from "../../domain/errors";
import type {
  AuthError,
  AuthProvider,
  SignInCredentials,
  SignUpCredentials,
} from "../ports/AuthProvider";

const VALID_ID = "9f9e6df0-0000-4000-8000-000000000000";

// LSP: fake AuthProvider substitutable for the Supabase one.
class FakeAuthProvider implements AuthProvider {
  signUpCalledWith: SignUpCredentials | null = null;

  constructor(private readonly emailTaken: boolean) {}

  async signUp(
    credentials: SignUpCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    this.signUpCalledWith = credentials;
    if (this.emailTaken) return err(new EmailTakenError(credentials.email));
    const ctx = UserContext.create({ id: VALID_ID, email: credentials.email });
    return ctx.ok ? ok(ctx.value) : err(new EmailTakenError(credentials.email));
  }
  async signInWithPassword(
    _credentials: SignInCredentials,
  ): Promise<Result<UserContext, AuthError>> {
    const ctx = UserContext.create({ id: VALID_ID, email: _credentials.email });
    return ctx.ok ? ok(ctx.value) : err(new EmailTakenError(_credentials.email));
  }
  async signOut(): Promise<void> {}
  async getCurrentUser(): Promise<UserContext | null> {
    return null;
  }
}

describe("SignUp", () => {
  it("rejects an invalid email with ValidationError before hitting the provider", async () => {
    const provider = new FakeAuthProvider(false);
    const r = await new SignUp(provider).execute({
      email: "not-an-email",
      password: "secret123",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
    expect(provider.signUpCalledWith).toBeNull();
  });

  it("rejects a short password with WeakPasswordError before hitting the provider", async () => {
    const provider = new FakeAuthProvider(false);
    const r = await new SignUp(provider).execute({
      email: "user@example.com",
      password: "short",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("weak_password");
    expect(provider.signUpCalledWith).toBeNull();
  });

  it("creates the account on valid input and forwards the normalized email + name", async () => {
    const provider = new FakeAuthProvider(false);
    const r = await new SignUp(provider).execute({
      email: "  New@Example.COM ",
      password: "secret123",
      name: "Ana",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email.value).toBe("new@example.com");
    expect(provider.signUpCalledWith?.email).toBe("new@example.com");
    expect(provider.signUpCalledWith?.name).toBe("Ana");
  });

  it("surfaces EmailTakenError from the provider", async () => {
    const r = await new SignUp(new FakeAuthProvider(true)).execute({
      email: "taken@example.com",
      password: "secret123",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("email_taken");
  });
});
