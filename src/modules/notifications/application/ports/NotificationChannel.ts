import type { Result } from "@/shared/result";
import type { DomainError } from "@/shared/errors";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";

// SOLID: OCP — adicionar um canal (ex.: SlackChannel) é criar um novo
// NotificationChannel; o use case SendNotification não muda.
// SOLID: DIP — o use case depende desta port, não dos SDKs (Resend/web-push/Supabase).
export interface NotificationChannel {
  readonly channel: Channel;
  send(notification: Notification): Promise<Result<void, DomainError>>;
}
