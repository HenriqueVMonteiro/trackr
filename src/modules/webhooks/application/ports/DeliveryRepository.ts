import type { WebhookDelivery } from "../../domain/WebhookDelivery";
import type { DeliveryAttempt } from "../../domain/DeliveryAttempt";

// SOLID: DIP — persistência de deliveries e seus attempts atrás de uma abstração.
export interface DeliveryRepository {
  save(delivery: WebhookDelivery): Promise<void>;
  findById(id: string): Promise<WebhookDelivery | null>;
  listByEndpoint(endpointId: string): Promise<WebhookDelivery[]>;
  recordAttempt(attempt: DeliveryAttempt): Promise<void>;
}
