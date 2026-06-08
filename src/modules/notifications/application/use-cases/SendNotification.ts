import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  ID_PREFIXES,
  ValidationError,
} from "@/shared";
import { notificationFactoryFor, type NotificationPayload } from "../NotificationFactory";
import type { Channel } from "../../domain/Channel";
import type { Notification } from "../../domain/Notification";
import type { NotificationChannel } from "../ports/NotificationChannel";
import type { NotificationRepository } from "../ports/NotificationRepository";

export interface SendNotificationInput {
  recipientId: string;
  // Endereço no canal (e-mail / subscription push / userId in-app).
  to: string;
  channel: Channel;
  subject: string;
  body: string;
}

export interface SendNotificationOutput {
  notification: Notification;
  delivered: boolean;
}

export type SendNotificationError = ValidationError;

export interface SendNotificationDeps {
  repo: NotificationRepository;
  // Mapa canal -> adapter. SOLID: OCP — registrar um canal novo é adicionar aqui.
  channels: ReadonlyMap<Channel, NotificationChannel>;
  clock: Clock;
  ids: IdGenerator;
}

// SOLID: SRP — orquestra o envio de UMA notificação por UM canal.
// SOLID: DIP — depende das ports (channel + repo), não dos SDKs.
export class SendNotification {
  constructor(private readonly deps: SendNotificationDeps) {}

  async execute(
    input: SendNotificationInput,
  ): Promise<Result<SendNotificationOutput, SendNotificationError>> {
    if (input.subject.trim().length === 0) {
      return err(new ValidationError("subject is required", { field: "subject" }));
    }

    const payload: NotificationPayload = {
      id: this.deps.ids.generate(ID_PREFIXES.notification),
      recipientId: input.recipientId,
      to: input.to,
      subject: input.subject,
      body: input.body,
      createdAt: this.deps.clock.now(),
    };
    // GoF: Factory Method — cria a Notification concreta do canal.
    const notification = notificationFactoryFor(input.channel).create(payload);

    const adapter = this.deps.channels.get(input.channel);
    if (!adapter) {
      await this.deps.repo.save(notification, {
        status: "failed",
        sentAt: null,
        error: `No adapter registered for channel '${input.channel}'`,
      });
      return ok({ notification, delivered: false });
    }

    const result = await adapter.send(notification);
    const outcome = result.ok
      ? { status: "sent" as const, sentAt: this.deps.clock.now(), error: null }
      : { status: "failed" as const, sentAt: null, error: result.error.message };
    await this.deps.repo.save(notification, outcome);

    return ok({ notification, delivered: result.ok });
  }
}
