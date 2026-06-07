import { describe, it, expect, vi } from "vitest";
import { OutboxRelay } from "./OutboxRelay";
import type { OutboxReader, OutboxRecord } from "./Outbox";
import { FrozenClock } from "../clock/clock";
import { InMemoryEventBus } from "../events/event-bus";

class FakeReader implements OutboxReader {
  pending: OutboxRecord[];
  marked: { ids: string[]; at: Date }[] = [];

  constructor(pending: OutboxRecord[] = []) {
    this.pending = pending;
  }

  async fetchUnpublished(limit: number): Promise<OutboxRecord[]> {
    return this.pending.slice(0, limit);
  }

  async markPublished(ids: ReadonlyArray<string>, at: Date): Promise<void> {
    this.marked.push({ ids: [...ids], at });
    this.pending = this.pending.filter((r) => !ids.includes(r.id));
  }
}

const makeRecord = (id: string, eventType = "test.event"): OutboxRecord => ({
  id,
  aggregateType: "test",
  aggregateId: "agg_1",
  eventType,
  payload: { foo: id },
  publishedAt: null,
  createdAt: new Date("2026-06-07T10:00:00Z"),
});

describe("OutboxRelay.tick", () => {
  const at = new Date("2026-06-07T11:00:00Z");

  it("returns 0 when there is nothing to publish", async () => {
    const reader = new FakeReader();
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay({ reader, bus, clock: new FrozenClock(at) });
    expect(await relay.tick()).toBe(0);
    expect(reader.marked).toHaveLength(0);
  });

  it("publishes each unpublished record and marks them as published", async () => {
    const reader = new FakeReader([makeRecord("evt_1"), makeRecord("evt_2")]);
    const bus = new InMemoryEventBus();
    const seen: string[] = [];
    bus.subscribe("test.event", async (e) => {
      seen.push(e.id);
    });
    const relay = new OutboxRelay({ reader, bus, clock: new FrozenClock(at) });
    const count = await relay.tick();
    expect(count).toBe(2);
    expect(seen.sort()).toEqual(["evt_1", "evt_2"]);
    expect(reader.marked).toHaveLength(1);
    expect(reader.marked[0]?.ids.sort()).toEqual(["evt_1", "evt_2"]);
    expect(reader.marked[0]?.at).toEqual(at);
  });

  it("respects batchSize", async () => {
    const reader = new FakeReader([
      makeRecord("a"),
      makeRecord("b"),
      makeRecord("c"),
    ]);
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay({
      reader,
      bus,
      clock: new FrozenClock(at),
      batchSize: 2,
    });
    const count = await relay.tick();
    expect(count).toBe(2);
    expect(reader.pending.map((r) => r.id)).toEqual(["c"]);
  });

  it("isolates failures so other records still get marked published", async () => {
    const reader = new FakeReader([makeRecord("ok_1"), makeRecord("bad", "boom"), makeRecord("ok_2")]);
    const bus = new InMemoryEventBus();
    bus.subscribe("boom", async () => {
      throw new Error("subscriber blew up");
    });
    const errors: string[] = [];
    const relay = new OutboxRelay({
      reader,
      bus,
      clock: new FrozenClock(at),
      onError: (_e, rec) => errors.push(rec.id),
    });
    const count = await relay.tick();
    expect(count).toBe(2);
    expect(errors).toEqual(["bad"]);
    expect(reader.marked[0]?.ids.sort()).toEqual(["ok_1", "ok_2"]);
    // "bad" stays pending for retry on next tick
    expect(reader.pending.map((r) => r.id)).toEqual(["bad"]);
  });
});

describe("OutboxRelay.start/stop", () => {
  it("runs tick repeatedly until stopped", async () => {
    const reader = new FakeReader();
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay({
      reader,
      bus,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
    });
    const tickSpy = vi.spyOn(relay, "tick");
    const loop = relay.start(5);
    await new Promise((r) => setTimeout(r, 25));
    relay.stop();
    await loop;
    expect(tickSpy).toHaveBeenCalled();
    expect(relay.isRunning).toBe(false);
  });

  it("a second start() while running returns the same loop promise", async () => {
    const reader = new FakeReader();
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay({
      reader,
      bus,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
    });
    const a = relay.start(5);
    const b = relay.start(5);
    expect(a).toBe(b);
    relay.stop();
    await a;
  });
});
