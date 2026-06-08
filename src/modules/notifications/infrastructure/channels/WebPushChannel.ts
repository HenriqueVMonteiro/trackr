import webpush, { type PushSubscription } from "web-push";
import { ok, err, type Result } from "@/shared/result";
import type { DomainError } from "@/shared/errors";
import { ChannelDeliveryError } from "../../domain/errors";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";
import type { NotificationChannel } from "../../application/ports/NotificationChannel";

export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

// SOLID: OCP — canal de Web Push. `notification.to` é a PushSubscription serializada.
export class WebPushChannel implements NotificationChannel {
  readonly channel: Channel = "push";

  constructor(vapid: VapidDetails) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  }

  async send(notification: Notification): Promise<Result<void, DomainError>> {
    try {
      const subscription: PushSubscription = JSON.parse(notification.to);
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: notification.subject, body: notification.body }),
      );
      return ok(undefined);
    } catch (e) {
      return err(
        new ChannelDeliveryError(e instanceof Error ? e.message : String(e), { channel: "push" }),
      );
    }
  }
}
