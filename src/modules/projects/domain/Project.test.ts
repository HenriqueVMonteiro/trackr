import { describe, it, expect } from "vitest";
import { Project, type ProjectProps } from "./Project";
import { isErr, unwrap } from "@/shared/result";

const props = (overrides: Partial<ProjectProps> = {}): ProjectProps => ({
  id: "prj_1",
  workspaceId: "wsp_1",
  name: "Trackr",
  slug: "trackr",
  key: "TRK",
  description: null,
  archivedAt: null,
  createdAt: new Date("2026-06-07T10:00:00Z"),
  updatedAt: new Date("2026-06-07T10:00:00Z"),
  ...overrides,
});

describe("Project.create", () => {
  it("accepts valid props and trims name", () => {
    const r = Project.create(props({ name: "  Trackr  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("Trackr");
  });

  it("rejects empty name", () => {
    expect(isErr(Project.create(props({ name: " " })))).toBe(true);
  });

  it("rejects name longer than 100 chars", () => {
    expect(isErr(Project.create(props({ name: "x".repeat(101) })))).toBe(true);
  });

  it("rejects slug with uppercase", () => {
    expect(isErr(Project.create(props({ slug: "Trackr" })))).toBe(true);
  });

  it("rejects slug starting with digit", () => {
    expect(isErr(Project.create(props({ slug: "1trackr" })))).toBe(true);
  });

  it("rejects key with lowercase", () => {
    expect(isErr(Project.create(props({ key: "trk" })))).toBe(true);
  });

  it("rejects key starting with digit", () => {
    expect(isErr(Project.create(props({ key: "1TRK" })))).toBe(true);
  });

  it("rejects key shorter than 2 chars", () => {
    expect(isErr(Project.create(props({ key: "T" })))).toBe(true);
  });

  it("rejects key longer than 10 chars", () => {
    expect(isErr(Project.create(props({ key: "TRACKR12345" })))).toBe(true);
  });
});

describe("Project.archive", () => {
  it("sets archivedAt and bumps updatedAt", () => {
    const p = unwrap(Project.create(props()));
    const at = new Date("2026-07-01T00:00:00Z");
    const archived = p.archive(at);
    expect(archived.archivedAt?.toISOString()).toBe(at.toISOString());
    expect(archived.updatedAt.toISOString()).toBe(at.toISOString());
  });

  it("is a no-op when already archived", () => {
    const p = unwrap(
      Project.create(props({ archivedAt: new Date("2026-01-01T00:00:00Z") })),
    );
    const r = p.archive(new Date("2099-01-01T00:00:00Z"));
    expect(r).toBe(p);
  });
});

describe("Project.rename", () => {
  it("returns new instance with new name and updatedAt", () => {
    const p = unwrap(Project.create(props()));
    const at = new Date("2026-07-01T00:00:00Z");
    const r = p.rename("New Name", at);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("New Name");
      expect(r.value.updatedAt.toISOString()).toBe(at.toISOString());
    }
  });

  it("returns same instance when name unchanged", () => {
    const p = unwrap(Project.create(props()));
    const r = p.rename("Trackr", new Date());
    if (r.ok) expect(r.value).toBe(p);
  });

  it("rejects invalid name", () => {
    const p = unwrap(Project.create(props()));
    const r = p.rename("", new Date());
    expect(r.ok).toBe(false);
  });
});

describe("Project immutability", () => {
  it("createdAt getter returns a defensive copy", () => {
    const p = unwrap(Project.create(props()));
    const d = p.createdAt;
    d.setFullYear(2099);
    expect(p.createdAt.getFullYear()).toBe(2026);
  });

  it("archivedAt is null when not archived", () => {
    const p = unwrap(Project.create(props()));
    expect(p.archivedAt).toBeNull();
  });

  it("toJSON returns full props", () => {
    const p = unwrap(Project.create(props()));
    expect(p.toJSON()).toMatchObject({
      id: "prj_1",
      workspaceId: "wsp_1",
      name: "Trackr",
      slug: "trackr",
      key: "TRK",
    });
  });
});
