import { describe, it, expect } from "vitest";
import { Workspace, type WorkspaceProps } from "./Workspace";
import { isErr, unwrap } from "@/shared/result";

const baseProps = (overrides: Partial<WorkspaceProps> = {}): WorkspaceProps => ({
  id: "wsp_test1",
  name: "Acme",
  slug: "acme",
  ownerId: "00000000-0000-0000-0000-000000000001",
  createdAt: new Date("2026-06-07T10:00:00Z"),
  updatedAt: new Date("2026-06-07T10:00:00Z"),
  ...overrides,
});

describe("Workspace.create", () => {
  it("accepts valid props and trims name", () => {
    const r = Workspace.create(baseProps({ name: "  Acme  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("Acme");
  });

  it("rejects name shorter than 2", () => {
    const r = Workspace.create(baseProps({ name: "a" }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects name longer than 50", () => {
    const r = Workspace.create(baseProps({ name: "x".repeat(51) }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects slug with uppercase", () => {
    const r = Workspace.create(baseProps({ slug: "Acme" }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects slug starting with digit", () => {
    const r = Workspace.create(baseProps({ slug: "1acme" }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects slug with underscore", () => {
    const r = Workspace.create(baseProps({ slug: "ac_me" }));
    expect(isErr(r)).toBe(true);
  });

  it("accepts kebab-case slug", () => {
    const r = Workspace.create(baseProps({ slug: "acme-co" }));
    expect(r.ok).toBe(true);
  });
});

describe("Workspace.rename", () => {
  it("returns new instance with updated name and updatedAt", () => {
    const created = unwrap(Workspace.create(baseProps()));
    const at = new Date("2026-07-01T00:00:00Z");
    const renamed = created.rename("New Acme", at);
    expect(renamed.ok).toBe(true);
    if (renamed.ok) {
      expect(renamed.value.name).toBe("New Acme");
      expect(renamed.value.updatedAt.toISOString()).toBe(at.toISOString());
      // original untouched
      expect(created.name).toBe("Acme");
    }
  });

  it("returns same instance when name unchanged", () => {
    const created = unwrap(Workspace.create(baseProps()));
    const renamed = created.rename("Acme", new Date());
    if (renamed.ok) expect(renamed.value).toBe(created);
  });

  it("rejects invalid name without mutating", () => {
    const created = unwrap(Workspace.create(baseProps()));
    const renamed = created.rename("a", new Date());
    expect(isErr(renamed)).toBe(true);
    expect(created.name).toBe("Acme");
  });
});

describe("Workspace immutability", () => {
  it("getters return defensive copies of dates", () => {
    const ws = unwrap(Workspace.create(baseProps()));
    const d = ws.createdAt;
    d.setFullYear(2099);
    expect(ws.createdAt.getFullYear()).toBe(2026);
  });
});
