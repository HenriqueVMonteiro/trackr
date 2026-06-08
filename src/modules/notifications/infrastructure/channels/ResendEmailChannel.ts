import type { Resend } from "resend";
import { ok, err, type Result } from "@/shared/result";
import type { DomainError } from "@/shared/errors";
import { ChannelDeliveryError } from "../../domain/errors";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";
import type { NotificationChannel } from "../../application/ports/NotificationChannel";

// SOLID: OCP — canal de e-mail via Resend. Um canal novo (ex.: SlackChannel) é uma
// classe nova; SendNotification não muda. GoF: Adapter (SDK Resend -> port).
export class ResendEmailChannel implements NotificationChannel {
  readonly channel: Channel = "email";

  constructor(
    private readonly resend: Resend,
    private readonly from: string,
  ) {}

  async send(notification: Notification): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: notification.to,
        subject: notification.subject,
        html: notification.body,
      });
      if (error) {
        return err(new ChannelDeliveryError(error.message, { channel: "email" }));
      }
      return ok(undefined);
    } catch (e) {
      return err(
        new ChannelDeliveryError(e instanceof Error ? e.message : String(e), { channel: "email" }),
      );
    }
  }
}
