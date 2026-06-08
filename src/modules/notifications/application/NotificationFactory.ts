import type {
  Notification} from "../domain/Notification";
import {
  EmailNotification,
  PushNotification,
  InAppNotification,
  WebhookNotification,
  type NotificationContent,
} from "../domain/Notification";
import type { Channel } from "../domain/Channel";

export type NotificationPayload = NotificationContent;

// GoF: Factory Method — Creator abstrato com o factory method `create`. Cada
// subclasse concreta cria SEU Product (a Notification do canal). Adicionar um canal
// é criar um Creator + um Product novos, sem mudar os callers (SOLID: OCP).
export abstract class NotificationFactory {
  abstract create(payload: NotificationPayload): Notification;
}

export class EmailNotificationFactory extends NotificationFactory {
  create(payload: NotificationPayload): Notification {
    return new EmailNotification(payload);
  }
}

export class PushNotificationFactory extends NotificationFactory {
  create(payload: NotificationPayload): Notification {
    return new PushNotification(payload);
  }
}

export class InAppNotificationFactory extends NotificationFactory {
  create(payload: NotificationPayload): Notification {
    return new InAppNotification(payload);
  }
}

export class WebhookNotificationFactory extends NotificationFactory {
  create(payload: NotificationPayload): Notification {
    return new WebhookNotification(payload);
  }
}

// Seleciona o Creator concreto pelo canal (exaustivo sobre Channel).
export function notificationFactoryFor(channel: Channel): NotificationFactory {
  switch (channel) {
    case "email":
      return new EmailNotificationFactory();
    case "push":
      return new PushNotificationFactory();
    case "in_app":
      return new InAppNotificationFactory();
    case "webhook":
      return new WebhookNotificationFactory();
  }
}
