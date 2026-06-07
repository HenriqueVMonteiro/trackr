// SOLID: SRP — uma DomainEvent carrega só o que aconteceu, sem efeito colateral.
// Eventos são consumidos por subscribers (Observer) via EventBus.

export interface DomainEvent<Payload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: Payload;
  readonly occurredAt: Date;
}
