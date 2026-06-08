import { describe, expect, it, vi } from "vitest";

import { ensureUserMirror } from "./_user-mirror";

describe("ensureUserMirror", () => {
  it("upserts the Supabase auth user into public.users before workspace creation", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn(() => ({ values }));

    await ensureUserMirror(
      { insert } as never,
      {
        id: { value: "00000000-0000-0000-0000-000000000001" },
        email: { value: "ada@example.com" },
        name: null,
      },
    );

    expect(insert).toHaveBeenCalledWith(expect.any(Object));
    expect(values).toHaveBeenCalledWith({
      id: "00000000-0000-0000-0000-000000000001",
      email: "ada@example.com",
      name: "ada",
    });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: {
          email: "ada@example.com",
          name: "ada",
        },
      }),
    );
  });
});
