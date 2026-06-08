export {
  NotificationFactory,
  EmailNotificationFactory,
  PushNotificationFactory,
  InAppNotificationFactory,
  WebhookNotificationFactory,
  notificationFactoryFor,
  type NotificationPayload,
} from "./NotificationFactory";

export type { NotificationChannel } from "./ports/NotificationChannel";
export type {
  NotificationRepository,
  NotificationOutcome,
  NotificationStatus,
} from "./ports/NotificationRepository";

export {
  SendNotification,
  type SendNotificationInput,
  type SendNotificationOutput,
  type SendNotificationError,
  type SendNotificationDeps,
} from "./use-cases/SendNotification";
export {
  UpdatePreferences,
  type UpdatePreferencesInput,
} from "./use-cases/UpdatePreferences";
export {
  SubscribeUserToTopic,
  type SubscribeUserToTopicInput,
} from "./use-cases/SubscribeUserToTopic";
