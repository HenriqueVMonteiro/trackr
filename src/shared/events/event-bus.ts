import type { DomainEvent } from "./domain-event";

// GoF: Observer — publishers (use cases) e subscribers (notifiers, webhooks,
// realtime, activity log) desacoplados via EventBus.
// SOLID: DIP — application depende da port EventBus, não da implementação.

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): Unsubscribe;
}

// In-memory adapter. Para entrega resiliente (mesmo em queda), use-case publica
// no Outbox; o relay worker (ADR-0007) lê do Outbox e republica aqui.
export class InMemoryEventBus implements EventBus {
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type);
    if (!handlers || handlers.size === 0) return;
    // Snapshot to avoid concurrent-modification issues if a handler unsubscribes
    const snapshot = [...handlers];
    await Promise.all(snapshot.map((h) => h(event)));
  }

  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): Unsubscribe {
    const handlers = this.subscribers.get(type) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.subscribers.set(type, handlers);
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }
}
