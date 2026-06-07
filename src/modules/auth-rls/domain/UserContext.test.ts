import { describe, it, expect } from "vitest";

import { UserContext } from "./UserContext";

const VALID_ID = "9f9e6df0-0000-4000-8000-000000000000";

describe("UserContext", () => {
  it("builds from a valid id + email + name", () => {
    const r = UserContext.create({ id: VALID_ID, email: "user@example.com", name: " Ana " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id.value).toBe(VALID_ID);
      expect(r.value.email.value).toBe("user@example.com");
      expect(r.value.name).toBe("Ana");
    }
  });

  it("normalizes a blank name to null", () => {
    const r = UserContext.create({ id: VALID_ID, email: "user@example.com", name: "   " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBeNull();
  });

  it("fails with ValidationError on an empty id", () => {
    const r = UserContext.create({ id: "", email: "user@example.com" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("fails with ValidationError on a malformed email", () => {
    const r = UserContext.create({ id: VALID_ID, email: "not-an-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("serializes to a plain object", () => {
    const r = UserContext.create({ id: VALID_ID, email: "user@example.com" });
    if (r.ok) {
      expect(r.value.toJSON()).toEqual({ id: VALID_ID, email: "user@example.com", name: null });
    }
  });
});
