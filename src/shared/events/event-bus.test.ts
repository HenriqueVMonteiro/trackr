import { describe, it, expect, vi } from "vitest";
import { InMemoryEventBus } from "./event-bus";
import type { DomainEvent } from "./domain-event";

const makeEvent = <T,>(type: string, payload: T, aggregateId = "agg_1"): DomainEvent<T> => ({
  id: "evt_1",
  type,
  aggregateType: "test",
  aggregateId,
  payload,
  occurredAt: new Date("2026-06-07T10:00:00Z"),
});

describe("InMemoryEventBus", () => {
  it("invokes handlers subscribed to the matching type", async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn(async () => {});
    bus.subscribe("issue.created", handler);
    await bus.publish(makeEvent("issue.created", { title: "x" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not invoke handlers of other types", async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn(async () => {});
    bus.subscribe("issue.created", handler);
    await bus.publish(makeEvent("issue.updated", {}));
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple handlers for the same type", async () => {
    const bus = new InMemoryEventBus();
    const a = vi.fn(async () => {});
    const b = vi.fn(async () => {});
    bus.subscribe("x", a);
    bus.subscribe("x", b);
    await bus.publish(makeEvent("x", null));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("returned Unsubscribe removes the handler", async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn(async () => {});
    const unsub = bus.subscribe("x", handler);
    unsub();
    await bus.publish(makeEvent("x", null));
    expect(handler).not.toHaveBeenCalled();
  });

  it("awaits all handlers in parallel", async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];
    bus.subscribe("x", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("slow");
    });
    bus.subscribe("x", async () => {
      order.push("fast");
    });
    await bus.publish(makeEvent("x", null));
    // fast runs first because slow awaits; both complete before publish resolves
    expect(order).toEqual(["fast", "slow"]);
  });

  it("publishing to a type with no subscribers is a no-op", async () => {
    const bus = new InMemoryEventBus();
    await expect(bus.publish(makeEvent("nobody.cares", null))).resolves.toBeUndefined();
  });
});
