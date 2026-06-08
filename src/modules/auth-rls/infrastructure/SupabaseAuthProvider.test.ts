import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();
const createServerSupabaseClientMock = vi.fn();
const supabaseServiceRoleKeyMock = vi.fn(() => "service-role");

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("./supabase/env", () => ({
  supabaseUrl: vi.fn(() => "https://trackr.supabase.co"),
  supabaseAnonKey: vi.fn(() => "anon"),
  supabaseServiceRoleKey: supabaseServiceRoleKeyMock,
}));

vi.mock("./supabase/serverClient", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

const supabaseUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "ada@gmail.com",
  user_metadata: { name: "Ada" },
};

describe("SupabaseAuthProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    supabaseServiceRoleKeyMock.mockReturnValue("service-role");
  });

  it("uses Admin API signup when service role is configured and signs in to create a session", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });
    const publicSignUp = vi.fn();
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: supabaseUser },
      error: null,
    });

    createClientMock.mockReturnValue({
      auth: { admin: { createUser } },
    });
    createServerSupabaseClientMock.mockResolvedValue({
      auth: { signUp: publicSignUp, signInWithPassword },
    });

    const { SupabaseAuthProvider } = await import("./SupabaseAuthProvider");

    const result = await new SupabaseAuthProvider().signUp({
      email: "ada@gmail.com",
      password: "Strongpass1",
      name: "Ada",
    });

    expect(result.ok).toBe(true);
    expect(publicSignUp).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledWith({
      email: "ada@gmail.com",
      password: "Strongpass1",
      email_confirm: true,
      user_metadata: { name: "Ada" },
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ada@gmail.com",
      password: "Strongpass1",
    });
  });
});
