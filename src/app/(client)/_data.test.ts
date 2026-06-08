import { describe, expect, it } from "vitest";

import { relative, statusGroup } from "./_data";

describe("client data helpers", () => {
  it("groups done and canceled issues as closed", () => {
    expect(statusGroup("done")).toBe("closed");
    expect(statusGroup("canceled")).toBe("closed");
    expect(statusGroup("in_progress")).toBe("open");
  });

  it("formats recent timestamps relative to the current clock", () => {
    const now = new Date("2026-06-08T12:00:00Z");

    expect(relative(new Date("2026-06-08T10:00:00Z"), now)).toBe("2h ago");
    expect(relative(new Date("2026-06-06T12:00:00Z"), now)).toBe("2d ago");
  });
});
