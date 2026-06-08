import { describe, it, expect } from "vitest";

import {
  rankingFor,
  RelevanceRanking,
  DateRanking,
  PriorityRanking,
} from "./index";
import type { SearchHit } from "../../domain";

function hit(overrides: Partial<SearchHit>): SearchHit {
  return {
    issueId: "iss_x",
    projectId: "prj_x",
    title: "t",
    snippet: null,
    score: 0,
    status: "todo",
    priority: "none",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("rankingFor", () => {
  it("returns the right instance per key", () => {
    expect(rankingFor("relevance")).toBeInstanceOf(RelevanceRanking);
    expect(rankingFor("date")).toBeInstanceOf(DateRanking);
    expect(rankingFor("priority")).toBeInstanceOf(PriorityRanking);
  });

  it("exposes the key on each strategy", () => {
    expect(rankingFor("relevance").key).toBe("relevance");
    expect(rankingFor("date").key).toBe("date");
    expect(rankingFor("priority").key).toBe("priority");
  });
});

describe("RelevanceRanking", () => {
  it("sorts by score descending", () => {
    const input = [
      hit({ issueId: "a", score: 0.2 }),
      hit({ issueId: "b", score: 0.9 }),
      hit({ issueId: "c", score: 0.5 }),
    ];
    const out = new RelevanceRanking().sort(input);
    expect(out.map((h) => h.issueId)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = [hit({ issueId: "a", score: 1 }), hit({ issueId: "b", score: 9 })];
    const before = input.map((h) => h.issueId);
    new RelevanceRanking().sort(input);
    expect(input.map((h) => h.issueId)).toEqual(before);
  });
});

describe("DateRanking", () => {
  it("sorts by updatedAt descending (most recent first)", () => {
    const input = [
      hit({ issueId: "old", updatedAt: new Date("2026-01-01T00:00:00Z") }),
      hit({ issueId: "new", updatedAt: new Date("2026-06-01T00:00:00Z") }),
      hit({ issueId: "mid", updatedAt: new Date("2026-03-01T00:00:00Z") }),
    ];
    const out = new DateRanking().sort(input);
    expect(out.map((h) => h.issueId)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      hit({ issueId: "old", updatedAt: new Date("2026-01-01T00:00:00Z") }),
      hit({ issueId: "new", updatedAt: new Date("2026-06-01T00:00:00Z") }),
    ];
    const before = input.map((h) => h.issueId);
    new DateRanking().sort(input);
    expect(input.map((h) => h.issueId)).toEqual(before);
  });
});

describe("PriorityRanking", () => {
  it("sorts by priority weight urgent>high>medium>low>none descending", () => {
    const input = [
      hit({ issueId: "low", priority: "low" }),
      hit({ issueId: "urgent", priority: "urgent" }),
      hit({ issueId: "none", priority: "none" }),
      hit({ issueId: "high", priority: "high" }),
      hit({ issueId: "medium", priority: "medium" }),
    ];
    const out = new PriorityRanking().sort(input);
    expect(out.map((h) => h.issueId)).toEqual(["urgent", "high", "medium", "low", "none"]);
  });

  it("breaks ties by score descending", () => {
    const input = [
      hit({ issueId: "high-lo", priority: "high", score: 0.1 }),
      hit({ issueId: "high-hi", priority: "high", score: 0.8 }),
    ];
    const out = new PriorityRanking().sort(input);
    expect(out.map((h) => h.issueId)).toEqual(["high-hi", "high-lo"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      hit({ issueId: "low", priority: "low" }),
      hit({ issueId: "urgent", priority: "urgent" }),
    ];
    const before = input.map((h) => h.issueId);
    new PriorityRanking().sort(input);
    expect(input.map((h) => h.issueId)).toEqual(before);
  });
});
