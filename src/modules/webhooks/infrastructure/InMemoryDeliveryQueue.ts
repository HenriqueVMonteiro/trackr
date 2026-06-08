import type { WebhookDelivery } from "../domain";
import type { DeliveryQueue } from "../application/ports/DeliveryQueue";

// Adapter placeholder de DeliveryQueue até o stint B3, que entrega o
// BullMqDeliveryQueue sobre Upstash Redis + o worker consumidor. Guardar as
// entregas em memória mantém o módulo montável e testável (dev/integração) sem
// uma dependência de Redis neste PR.
// SOLID: LSP — substituível pelo adapter BullMQ sem mudar os use cases.
export class InMemoryDeliveryQueue implements DeliveryQueue {
  private readonly queued: WebhookDelivery[] = [];

  async enqueue(delivery: WebhookDelivery): Promise<void> {
    this.queued.push(delivery);
  }

  // Inspeção para testes/dev.
  pending(): readonly WebhookDelivery[] {
    return this.queued;
  }
}
