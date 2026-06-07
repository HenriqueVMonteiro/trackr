import type { Clock } from "../clock/clock";
import type { DomainEvent } from "../events/domain-event";
import type { EventBus } from "../events/event-bus";
import type { OutboxReader } from "./Outbox";

// GoF: Observer + a fonte durável.
// Esta classe não armazena estado de negócio — apenas lê do outbox em
// batches e republicação no EventBus em memória. Falhas isoladas em um
// handler não bloqueiam o batch; falhas no batch inteiro deixam o registro
// pendente para a próxima tick (at-least-once).

export interface OutboxRelayDeps {
  reader: OutboxReader;
  bus: EventBus;
  clock: Clock;
  batchSize?: number;
  onError?: (err: unknown, record: { id: string; eventType: string }) => void;
}

const DEFAULT_BATCH = 50;

export class OutboxRelay {
  private readonly batchSize: number;
  private readonly onError: NonNullable<OutboxRelayDeps["onError"]>;
  private running = false;
  private currentLoop: Promise<void> | null = null;

  constructor(private readonly deps: OutboxRelayDeps) {
    this.batchSize = deps.batchSize ?? DEFAULT_BATCH;
    this.onError =
      deps.onError ??
      ((_err, _record) => {
        // SOLID: SRP — observabilidade não é responsabilidade do relay.
        // Caller plugga logger via onError.
      });
  }

  // Processa um batch. Retorna quantos eventos foram entregues com sucesso.
  async tick(): Promise<number> {
    const batch = await this.deps.reader.fetchUnpublished(this.batchSize);
    if (batch.length === 0) return 0;

    const successIds: string[] = [];
    for (const record of batch) {
      const event: DomainEvent = {
        id: record.id,
        type: record.eventType,
        aggregateType: record.aggregateType,
        aggregateId: record.aggregateId,
        payload: record.payload,
        occurredAt: record.createdAt,
      };
      try {
        await this.deps.bus.publish(event);
        successIds.push(record.id);
      } catch (err) {
        this.onError(err, { id: record.id, eventType: record.eventType });
      }
    }
    if (successIds.length > 0) {
      await this.deps.reader.markPublished(successIds, this.deps.clock.now());
    }
    return successIds.length;
  }

  // Loop contínuo. Faz tick, espera intervalMs, repete. Não bloqueia a
  // chamada — devolve uma Promise que resolve quando stop() for chamado.
  start(intervalMs: number): Promise<void> {
    if (this.running) {
      return this.currentLoop ?? Promise.resolve();
    }
    this.running = true;
    const loop = async (): Promise<void> => {
      while (this.running) {
        try {
          await this.tick();
        } catch (err) {
          this.onError(err, { id: "<tick>", eventType: "<batch>" });
        }
        if (!this.running) break;
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
      }
    };
    this.currentLoop = loop();
    return this.currentLoop;
  }

  stop(): void {
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
