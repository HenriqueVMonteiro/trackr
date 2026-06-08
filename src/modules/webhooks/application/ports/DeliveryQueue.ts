import type { WebhookDelivery } from "../../domain/WebhookDelivery";

// SOLID: DIP — porta de SAÍDA para a fila de entrega. O adapter concreto
// (BullMqDeliveryQueue sobre Upstash Redis) é implementado no stint B3; aqui só
// existe a abstração, que os use cases usam para enfileirar entregas.
export interface DeliveryQueue {
  enqueue(delivery: WebhookDelivery): Promise<void>;
}
