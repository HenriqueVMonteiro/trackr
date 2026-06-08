import { describe, it, expect } from "vitest";

import { CachedSearcher } from "./CachedSearcher";
import type { Cache } from "../application/ports/Cache";
import type { IssueSearcher } from "../application/ports/IssueSearcher";
import type { SearchQuery, SearchResult } from "../domain";

class FakeSearcher implements IssueSearcher {
  calls = 0;
  async search(query: SearchQuery): Promise<SearchResult> {
    this.calls += 1;
    return {
      hits: [
        {
          issueId: `iss_${query.text}`,
          projectId: "prj_1",
          title: query.text,
          snippet: null,
          score: 1,
          status: "todo",
          priority: "none",
          updatedAt: new Date("2026-06-01T00:00:00Z"),
        },
      ],
      total: 1,
    };
  }
}

class FakeCache implements Cache {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.has(key) ? (this.store.get(key) as T) : null;
  }

  async set<T>(key: string, value: T, _ttlSeconds: number): Promise<void> {
    this.store.set(key, value);
  }
}

const query = (overrides: Partial<SearchQuery> = {}): SearchQuery => ({
  workspaceId: "wsp_1",
  text: "login bug",
  ranking: "relevance",
  ...overrides,
});

describe("CachedSearcher", () => {
  it("misses on first call: inner runs once and result is cached", async () => {
    const inner = new FakeSearcher();
    const cache = new FakeCache();
    const searcher = new CachedSearcher(inner, cache, 60);

    const result = await searcher.search(query());

    expect(inner.calls).toBe(1);
    expect(result.total).toBe(1);
  });

  it("hits on a second identical call: inner is NOT called again", async () => {
    const inner = new FakeSearcher();
    const cache = new FakeCache();
    const searcher = new CachedSearcher(inner, cache, 60);

    const first = await searcher.search(query());
    const second = await searcher.search(query());

    expect(inner.calls).toBe(1);
    expect(second).toEqual(first);
  });

  it("misses for a different query (different cache key)", async () => {
    const inner = new FakeSearcher();
    const cache = new FakeCache();
    const searcher = new CachedSearcher(inner, cache, 60);

    await searcher.search(query({ text: "login bug" }));
    await searcher.search(query({ text: "payment error" }));

    expect(inner.calls).toBe(2);
  });
});
