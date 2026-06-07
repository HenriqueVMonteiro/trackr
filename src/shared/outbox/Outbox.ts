import type { DomainEvent } from "../events/domain-event";

// Linha persistida da tabela outbox.
export interface OutboxRecord {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
}

// SOLID: ISP — escrita é separada da leitura. Use cases dependem apenas de
// OutboxWriter; o OutboxRelay depende apenas de OutboxReader.

export interface OutboxWriter {
  enqueue(event: DomainEvent): Promise<void>;
}

export interface OutboxReader {
  fetchUnpublished(limit: number): Promise<OutboxRecord[]>;
  markPublished(ids: ReadonlyArray<string>, at: Date): Promise<void>;
}

// Adapter de persistência implementa ambos os papéis.
export interface OutboxStore extends OutboxWriter, OutboxReader {}
