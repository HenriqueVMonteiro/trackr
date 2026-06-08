import type { SupabaseClient } from "@supabase/supabase-js";
import { ok, err, type Result } from "@/shared/result";
import type { DomainError } from "@/shared/errors";
import { ChannelDeliveryError } from "../../domain/errors";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";
import type { NotificationChannel } from "../../application/ports/NotificationChannel";

// SOLID: OCP — canal in-app via Supabase Realtime (broadcast). `notification.to`
// é o userId; o cliente do destinatário escuta o canal `user:<id>`.
export class RealtimeChannel implements NotificationChannel {
  readonly channel: Channel = "in_app";

  constructor(private readonly supabase: SupabaseClient) {}

  async send(notification: Notification): Promise<Result<void, DomainError>> {
    try {
      const channel = this.supabase.channel(`user:${notification.to}`);
      const status = await channel.send({
        type: "broadcast",
        event: "notification",
        payload: {
          id: notification.id,
          subject: notification.subject,
          body: notification.body,
        },
      });
      await this.supabase.removeChannel(channel);
      if (status !== "ok") {
        return err(new ChannelDeliveryError(`realtime send: ${status}`, { channel: "in_app" }));
      }
      return ok(undefined);
    } catch (e) {
      return err(
        new ChannelDeliveryError(e instanceof Error ? e.message : String(e), {
          channel: "in_app",
        }),
      );
    }
  }
}
