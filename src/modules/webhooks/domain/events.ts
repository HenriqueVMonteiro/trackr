import type { DomainEvent } from "@/shared/events";
import type { DeliveryStatus } from "./WebhookDelivery";

export const WEBHOOK_ENDPOINT_CREATED = "webhook.endpoint_created" as const;
export const WEBHOOK_ENDPOINT_DELETED = "webhook.endpoint_deleted" as const;
export const WEBHOOK_DELIVERY_ENQUEUED = "webhook.delivery_enqueued" as const;
export const WEBHOOK_DELIVERY_ATTEMPTED = "webhook.delivery_attempted" as const;

export interface WebhookEndpointCreatedPayload {
  endpointId: string;
  workspaceId: string;
  url: string;
}

export interface WebhookEndpointDeletedPayload {
  endpointId: string;
  workspaceId: string;
}

export interface DeliveryEnqueuedPayload {
  deliveryId: string;
  endpointId: string;
  eventType: string;
}

export interface DeliveryAttemptedPayload {
  deliveryId: string;
  endpointId: string;
  attemptCount: number;
  status: DeliveryStatus;
}

export type WebhookEndpointCreatedEvent = DomainEvent<WebhookEndpointCreatedPayload>;
export type WebhookEndpointDeletedEvent = DomainEvent<WebhookEndpointDeletedPayload>;
export type DeliveryEnqueuedEvent = DomainEvent<DeliveryEnqueuedPayload>;
export type DeliveryAttemptedEvent = DomainEvent<DeliveryAttemptedPayload>;
