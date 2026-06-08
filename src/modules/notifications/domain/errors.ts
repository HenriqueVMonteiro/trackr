import { DomainError } from "@/shared/errors";

// Falha de entrega num canal (SMTP/push/realtime). Carregada via Result.
export class ChannelDeliveryError extends DomainError {
  readonly code = "channel_delivery_failed";
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, meta);
  }
}
