import { describe, expect, it } from "vitest";

import { registerErrorMessage } from "./page";

describe("registerErrorMessage", () => {
  it("explains signup and workspace failures with actionable copy", () => {
    expect(registerErrorMessage("email-taken")).toContain("already exists");
    expect(registerErrorMessage("weak-password")).toContain("stronger password");
    expect(registerErrorMessage("workspace-slug-taken")).toContain("different workspace slug");
    expect(registerErrorMessage("signup-failed")).toContain("real email address");
  });

  it("returns null when there is no error", () => {
    expect(registerErrorMessage(undefined)).toBeNull();
  });
});
