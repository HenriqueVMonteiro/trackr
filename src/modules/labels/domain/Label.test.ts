import { describe, it, expect } from "vitest";
import { Label, type LabelProps } from "./Label";
import { isErr } from "@/shared/result";

const props = (overrides: Partial<LabelProps> = {}): LabelProps => ({
  id: "lbl_1",
  projectId: "prj_1",
  name: "bug",
  color: "#ff0000",
  createdAt: new Date("2026-06-07T10:00:00Z"),
  ...overrides,
});

describe("Label", () => {
  it("accepts valid name and color", () => {
    const r = Label.create(props());
    expect(r.ok).toBe(true);
  });

  it("trims name", () => {
    const r = Label.create(props({ name: "  bug  " }));
    if (r.ok) expect(r.value.name).toBe("bug");
  });

  it("lowercases hex color", () => {
    const r = Label.create(props({ color: "#FF00AA" }));
    if (r.ok) expect(r.value.color).toBe("#ff00aa");
  });

  it("rejects empty name", () => {
    expect(isErr(Label.create(props({ name: "   " })))).toBe(true);
  });

  it("rejects name over 50 chars", () => {
    expect(isErr(Label.create(props({ name: "x".repeat(51) })))).toBe(true);
  });

  it("rejects invalid color format", () => {
    expect(isErr(Label.create(props({ color: "red" })))).toBe(true);
    expect(isErr(Label.create(props({ color: "#abc" })))).toBe(true);
    expect(isErr(Label.create(props({ color: "ff0000" })))).toBe(true);
  });
});
