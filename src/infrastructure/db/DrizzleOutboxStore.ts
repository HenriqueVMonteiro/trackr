import { asc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "./client";
import { outbox } from "./schema";
import type {
  DomainEvent,
  IdGenerator,
  OutboxRecord,
  OutboxStore,
} from "@/shared";
import { ID_PREFIXES } from "@/shared";

// SOLID: DIP — implementa as ports OutboxWriter + OutboxReader.
// Use cases recebem só OutboxWriter; OutboxRelay recebe só OutboxReader.

export class DrizzleOutboxStore implements OutboxStore {
  constructor(
    private readonly db: Database,
    private readonly ids: IdGenerator,
  ) {}

  async enqueue(event: DomainEvent): Promise<void> {
    await this.db.insert(outbox).values({
      id: this.ids.generate(ID_PREFIXES.outbox),
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.type,
      payload: event.payload as object,
      createdAt: event.occurredAt,
      publishedAt: null,
    });
  }

  async fetchUnpublished(limit: number): Promise<OutboxRecord[]> {
    const rows = await this.db
      .select()
      .from(outbox)
      .where(isNull(outbox.publishedAt))
      .orderBy(asc(outbox.createdAt), asc(outbox.id))
      .limit(limit);
    return rows.map(
      (r): OutboxRecord => ({
        id: r.id,
        aggregateType: r.aggregateType,
        aggregateId: r.aggregateId,
        eventType: r.eventType,
        payload: r.payload,
        publishedAt: r.publishedAt,
        createdAt: r.createdAt,
      }),
    );
  }

  async markPublished(ids: ReadonlyArray<string>, at: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(outbox)
      .set({ publishedAt: at })
      .where(inArray(outbox.id, [...ids]));
  }

  // Helper utilizado em testes de integração ou rollback explícito; não faz
  // parte da port. Marcar como any-instance-only.
  async deleteById(id: string): Promise<void> {
    await this.db.delete(outbox).where(eq(outbox.id, id));
  }
}
