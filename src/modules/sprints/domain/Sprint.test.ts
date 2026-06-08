import { describe, it, expect } from "vitest";
import { Sprint, type CreateSprintProps } from "./Sprint";
import { isErr, unwrap } from "@/shared/result";

const baseProps = (overrides: Partial<CreateSprintProps> = {}): CreateSprintProps => ({
  id: "spr_test1",
  workspaceId: "wsp_test1",
  name: "Sprint 1",
  startDate: new Date("2026-06-01T00:00:00Z"),
  endDate: new Date("2026-06-15T00:00:00Z"),
  capacity: 20,
  createdAt: new Date("2026-05-30T10:00:00Z"),
  ...overrides,
});

describe("Sprint.create", () => {
  it("accepts valid props, trims name and starts planned", () => {
    const r = Sprint.create(baseProps({ name: "  Sprint 1  " }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("Sprint 1");
      expect(r.value.status).toBe("planned");
    }
  });

  it("rejects name shorter than 2", () => {
    const r = Sprint.create(baseProps({ name: "a" }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects name longer than 80", () => {
    const r = Sprint.create(baseProps({ name: "x".repeat(81) }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects endDate equal to startDate", () => {
    const d = new Date("2026-06-01T00:00:00Z");
    const r = Sprint.create(baseProps({ startDate: d, endDate: d }));
    expect(isErr(r)).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const r = Sprint.create(
      baseProps({
        startDate: new Date("2026-06-15T00:00:00Z"),
        endDate: new Date("2026-06-01T00:00:00Z"),
      }),
    );
    expect(isErr(r)).toBe(true);
  });

  it("rejects negative capacity", () => {
    const r = Sprint.create(baseProps({ capacity: -1 }));
    expect(isErr(r)).toBe(true);
  });

  it("accepts zero capacity", () => {
    const r = Sprint.create(baseProps({ capacity: 0 }));
    expect(r.ok).toBe(true);
  });
});

describe("Sprint.start", () => {
  it("transitions planned -> active", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const at = new Date("2026-06-02T08:00:00Z");
    const started = sprint.start(at);
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(started.value.status).toBe("active");
      expect(started.value.startDate.toISOString()).toBe(at.toISOString());
      // original untouched
      expect(sprint.status).toBe("planned");
    }
  });

  it("rejects start when already active with InvalidTransitionError", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const active = unwrap(sprint.start(new Date("2026-06-02T08:00:00Z")));
    const r = active.start(new Date("2026-06-03T08:00:00Z"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
  });
});

describe("Sprint.close", () => {
  it("transitions active -> closed", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const active = unwrap(sprint.start(new Date("2026-06-02T08:00:00Z")));
    const at = new Date("2026-06-14T18:00:00Z");
    const closed = active.close(at);
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.value.status).toBe("closed");
      expect(closed.value.endDate.toISOString()).toBe(at.toISOString());
    }
  });

  it("rejects close when still planned with InvalidTransitionError", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const r = sprint.close(new Date("2026-06-14T18:00:00Z"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
  });

  it("rejects close when already closed with InvalidTransitionError", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const active = unwrap(sprint.start(new Date("2026-06-02T08:00:00Z")));
    const closed = unwrap(active.close(new Date("2026-06-14T18:00:00Z")));
    const r = closed.close(new Date("2026-06-15T18:00:00Z"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
  });
});

describe("Sprint immutability", () => {
  it("getters return defensive copies of dates", () => {
    const sprint = unwrap(Sprint.create(baseProps()));
    const d = sprint.startDate;
    d.setFullYear(2099);
    expect(sprint.startDate.getFullYear()).toBe(2026);
  });
});
